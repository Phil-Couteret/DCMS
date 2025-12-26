// Sync Service - Connects to sync server for POC
// NOTE: This is only used in MOCK mode (localStorage). In API mode, data is synced via the backend API.
// Syncs data between public website and admin portal

import { isMockMode } from '../config/apiConfig';

const SYNC_SERVER_URL = 'http://localhost:3002/api/sync';
const SYNC_INTERVAL = 30000; // Sync every 30 seconds (safety fallback - public page pushes immediately)

class SyncService {
  constructor() {
    this.syncInterval = null;
    this.isEnabled = false;
    this.lastSync = {};
    this.lastPushedHash = {};
    this.connectionRetryTimer = null;
    this.connectingPromise = null;
    this.hasStarted = false;
    
    // Only initialize sync service if in mock mode
    // In API mode, data is synced via the backend API, so sync server is not needed
    if (isMockMode()) {
      this.startSync();
      this.init();
    } else {
      // In API mode, sync service is disabled
      console.log('[Sync] Sync service disabled - using API mode');
    }
  }

  async init() {
    // Don't initialize if in API mode (not needed)
    if (!isMockMode()) {
      return Promise.resolve(false);
    }
    
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      try {
        // Use timeout to prevent hanging on network requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        try {
          const response = await fetch('http://localhost:3002/health', { 
            cache: 'no-store',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Health check failed with status ${response.status}`);
          }

          if (!this.isEnabled) {
            this.isEnabled = true;
          }

          if (this.connectionRetryTimer) {
            clearTimeout(this.connectionRetryTimer);
            this.connectionRetryTimer = null;
          }

          // Push local data to server first (in case sync server was restarted)
          await this.syncAll();
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (e) {
        // Sync server is not available - this is expected on external machines or when using API mode
        // Fail silently to avoid breaking the app
        const wasEnabled = this.isEnabled;
        this.isEnabled = false;
        
        // Only log warning in development mode, not in production
        if (process.env.NODE_ENV === 'development') {
          if (wasEnabled) {
            console.warn('[Sync] Lost connection to sync server:', e.message || e);
          } else {
            console.warn('[Sync] Sync server not available (this is normal when using API mode or on external machines)');
          }
        }
        
        // Don't schedule reconnect - sync server is not needed when using API
        // Only schedule reconnect if we were previously connected (edge case)
        if (this.connectionRetryTimer) {
          clearTimeout(this.connectionRetryTimer);
          this.connectionRetryTimer = null;
        }
        
        // Don't throw error - fail silently to prevent breaking the app
        return false;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  scheduleReconnect() {
    // Don't schedule reconnect - sync server is not needed when using API mode
    // This prevents unnecessary retry attempts on external machines
    return;
  }

  async ensureConnection() {
    // Don't connect if in API mode (not needed)
    if (!isMockMode()) {
      return false;
    }
    
    if (this.isEnabled) {
      return true;
    }
    try {
      await this.init();
      return this.isEnabled;
    } catch (e) {
      return false;
    }
  }

  async syncToServer(resource, data) {
    // Don't sync if in API mode (not needed)
    if (!isMockMode() || !this.isEnabled) return;
    
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      // Data synced to server
    } catch (e) {
      console.warn(`[Sync] Failed to sync ${resource}:`, e.message);
    }
  }

  async getLastUpdate(resource) {
    // Don't sync if in API mode (not needed)
    if (!isMockMode() || !this.isEnabled) return null;
    
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/${resource}/lastUpdate`);
      if (response.ok) {
        const result = await response.json();
        return result.lastUpdate;
      }
    } catch (e) {
      // Ignore errors - will fall back to full sync
    }
    return null;
  }

  async syncFromServer(resource) {
    // Don't sync if in API mode (not needed)
    if (!isMockMode() || !this.isEnabled) return null;
    
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/${resource}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {
      console.warn(`[Sync] Failed to fetch ${resource}:`, e.message);
    }
    return null;
  }

  startSync() {
    if (this.hasStarted) {
      return;
    }
    this.hasStarted = true;
    // Sync all resources periodically
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, SYNC_INTERVAL);
    
    // Initial sync
    setTimeout(() => this.syncAll(), 1000);
  }

  // Manual sync trigger (called explicitly when needed)
  async syncNow() {
    await this.syncAll(true);
  }

  async syncAll(manual = false) {
    // Don't sync if in API mode (not needed)
    if (!isMockMode()) {
      return;
    }
    
    const connected = await this.ensureConnection();
    if (!connected) {
      console.warn('[Sync] Sync service is disabled (waiting for server)');
      return;
    }
    
    // Sync triggered (manual or periodic)
    
    // Sync to server (push local changes)
    const resources = ['bookings', 'customers', 'locations', 'equipment'];
    
    for (const resource of resources) {
      const key = `dcms_${resource}`;
      const localData = localStorage.getItem(key);
      
      if (localData) {
        try {
          const dataHash = localData;
          if (this.lastPushedHash[key] !== dataHash) {
            const data = JSON.parse(localData);
            await this.syncToServer(resource, data);
            this.lastPushedHash[key] = dataHash;
            this.lastSync[key] = Date.now();
          }
        } catch (e) {
          console.warn(`[Sync] Error syncing ${resource}:`, e);
        }
      }
    }
    
    // Sync from server (pull remote changes)
    // Check last update time first to avoid unnecessary data transfer
    for (const resource of resources) {
      const key = `dcms_${resource}`;
      let serverLastUpdate = null;
      try {
        // Check if data has changed on server (optimization)
        serverLastUpdate = await this.getLastUpdate(resource);
        const localLastSync = this.lastSync[key];
        
        // Skip if we've synced recently and server hasn't changed (unless manual sync)
        if (!manual && serverLastUpdate && localLastSync && serverLastUpdate <= localLastSync) {
          continue;
        }
        
        const serverData = await this.syncFromServer(resource);
        if (!serverData || !Array.isArray(serverData)) {
          continue;
        }

        const localDataStr = localStorage.getItem(key);
        const localData = localDataStr ? JSON.parse(localDataStr) : [];
        
        // IMPORTANT: Don't overwrite local data if server is empty (sync server restart scenario)
        // Only sync if server has data OR if we're intentionally syncing empty state from another client
        if (serverData.length === 0 && localData.length > 0) {
          // Server has no data, preserving local data and pushing to server
          try {
            await this.syncToServer(resource, localData);
          } catch (e) {
            console.warn(`[Sync] Failed to push local ${resource} to server:`, e);
          }
          continue; // Skip this resource, move to next
        }
        
        // Check if server has new items by comparing IDs
        const localIds = new Set(localData.map(item => item.id));
        const serverIds = new Set(serverData.map(item => item.id));
        const hasNewItems = [...serverIds].some(id => !localIds.has(id));
        const hasRemovedItems = [...localIds].some(id => !serverIds.has(id));
        const hasDifferentLength = serverData.length !== localData.length;
        
        // Also check if any existing items have been updated (compare by JSON string)
        // For customers, merge server data with local data to preserve admin-only fields
        const localMap = new Map(localData.map(item => [item.id, item]));
        let mergedData = serverData;
        
        if (resource === 'customers') {
          // Merge server data with local data to preserve admin-only fields
          mergedData = serverData.map(serverItem => {
          const localItem = localMap.get(serverItem.id);
            if (localItem) {
              // Preserve admin-only fields from local data - ALWAYS prefer local values
              const mergedItem = {
                ...serverItem,
                // ALWAYS use local customerType if it exists (admin-managed field)
                ...(localItem.customerType !== undefined && localItem.customerType !== null 
                  ? { customerType: localItem.customerType } 
                  : {}),
                // ALWAYS use local centerSkillLevel if it exists (admin-managed field)
                ...(localItem.centerSkillLevel !== undefined && localItem.centerSkillLevel !== null 
                  ? { centerSkillLevel: localItem.centerSkillLevel } 
                  : {}),
              };
              
              // Only set defaults if they don't exist in either local or server
              if (!mergedItem.customerType) {
                mergedItem.customerType = serverItem.customerType || 'tourist';
              }
              if (!mergedItem.centerSkillLevel) {
                mergedItem.centerSkillLevel = serverItem.centerSkillLevel || 'beginner';
              }
              
              return mergedItem;
            }
            return serverItem;
          });
        }
        
        const hasUpdatedItems = mergedData.some((item) => {
          const localItem = localMap.get(item.id);
          return localItem && JSON.stringify(localItem) !== JSON.stringify(item);
        });

        if (hasNewItems || hasRemovedItems || hasDifferentLength || hasUpdatedItems) {
          localStorage.setItem(key, JSON.stringify(mergedData));
          this.lastSync[key] = serverLastUpdate || Date.now(); // Update last sync time
          window.dispatchEvent(new CustomEvent(`dcms_${resource}_synced`, { detail: mergedData }));
        } else {
          this.lastSync[key] = serverLastUpdate || Date.now(); // Update even if no changes
        }
      } catch (e) {
        console.warn(`[Sync] Error pulling ${resource}:`, e);
      }
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Create singleton
const syncService = new SyncService();

export default syncService;


// Sync Service - Connects to sync server for POC
// Syncs data between public website and admin portal

const SYNC_SERVER_URL = 'http://localhost:3002/api/sync';
// No periodic sync - data is pushed immediately when changed, pulled on page load only

class SyncService {
  constructor() {
    // No intervals needed - no periodic sync
    this.isEnabled = false;
    this.lastSync = {};
    this.pendingChanges = new Set(); // Track which resources have pending changes
    this.connectionRetryTimer = null;
    this.connectingPromise = null;
    this.hasStarted = false;
    
    this.startSync();
    this.init();
  }

  async init() {
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      try {
        const response = await fetch('http://localhost:3002/health', { cache: 'no-store' });
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

        await this.pushAllData();
        await this.pushPendingChanges();
      } catch (e) {
        if (this.isEnabled) {
          console.warn('[Sync] Lost connection to sync server, will retry...', e.message || e);
        } else {
          console.warn('[Sync] Sync server not available, will retry...', e.message || e);
        }
        this.isEnabled = false;
        this.scheduleReconnect();
        throw e;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  scheduleReconnect() {
    if (this.connectionRetryTimer) {
      return;
    }
    this.connectionRetryTimer = setTimeout(() => {
      this.connectionRetryTimer = null;
      this.init().catch(() => {
        // Swallow errors here - scheduleReconnect will handle retries
      });
    }, 5000);
  }

  async ensureConnection() {
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
    if (!this.isEnabled) {
      console.warn(`[Sync] Cannot push ${resource} - sync service is disabled`);
      return;
    }
    
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        await response.json();
      } else {
        console.error(`[Sync] ❌ Failed to push ${resource}:`, response.status, response.statusText);
      }
    } catch (e) {
      console.error(`[Sync] ❌ Failed to push ${resource}:`, e.message);
    }
  }

  async syncFromServer(resource) {
    if (!this.isEnabled) return null;
    
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

  // Fetch data from server without caching (for minimal localStorage approach)
  async fetchFromServer(resource) {
    const connected = await this.ensureConnection();
    if (!connected) {
      console.warn(`[Sync] Cannot fetch ${resource} - sync server not available`);
      return [];
    }
    
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/${resource}`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.warn(`[Sync] Failed to fetch ${resource} from server:`, e.message);
    }
    return [];
  }

  startSync() {
    if (this.hasStarted) {
      return;
    }
    this.hasStarted = true;
    // No periodic sync for customer portal
    // - Pushing happens immediately when data changes (via markChanged)
    // - Pulling happens only on page load (via syncNow() in Login/MyAccount)
  }

  async pushAllData() {
    const connected = await this.ensureConnection();
    if (!connected) return;
    const resources = ['bookings', 'customers', 'locations', 'equipment'];
    for (const resource of resources) {
      const key = `dcms_${resource}`;
      const localData = localStorage.getItem(key);
      if (localData) {
        try {
          const data = JSON.parse(localData);
          // Pushing entire dataset
          await this.syncToServer(resource, data);
        } catch (err) {
          console.warn(`[Sync] Error during full push for ${resource}:`, err);
        }
      }
    }
  }

  // Mark a resource as having pending changes (called when data is modified)
  markChanged(resource) {
    this.pendingChanges.add(resource);
    // Ensure we try to connect whenever data changes
    this.ensureConnection();
    // Immediately push if enabled (don't wait for interval)
    if (this.isEnabled) {
      setTimeout(() => {
        this.pushPendingChanges().catch(err => {
          console.warn('[Sync] Immediate push failed:', err);
          // Re-add to pending if push failed (will retry on next markChanged or syncNow)
          this.pendingChanges.add(resource);
        });
      }, 100); // Small delay to ensure localStorage is written first
    } else {
      console.warn(`[Sync] ⚠️ Cannot push ${resource} yet - waiting for sync server`);
    }
  }

  // Push only resources that have pending changes
  async pushPendingChanges() {
    if (this.pendingChanges.size === 0) return;
    
    const connected = await this.ensureConnection();
    if (!connected) {
      return;
    }
    
    const resources = Array.from(this.pendingChanges);
    this.pendingChanges.clear();
    
    for (const resource of resources) {
      const key = `dcms_${resource}`;
      const localData = localStorage.getItem(key);
      
      if (localData) {
        try {
          const data = JSON.parse(localData);
          await this.syncToServer(resource, data);
          this.lastSync[key] = Date.now();
        } catch (e) {
          console.warn(`[Sync] Error pushing ${resource}:`, e);
          // Re-add to pending if push failed
          this.pendingChanges.add(resource);
        }
      }
    }
  }

  // Pull changes from server (only called manually, not automatically)
  async pullChanges() {
    const connected = await this.ensureConnection();
    if (!connected) return;
    
    const resources = ['bookings', 'customers', 'locations', 'equipment'];
    
    for (const resource of resources) {
      try {
        const serverData = await this.syncFromServer(resource);
        if (serverData && Array.isArray(serverData)) {
          const key = `dcms_${resource}`;
          const localDataStr = localStorage.getItem(key);
          const localData = localDataStr ? JSON.parse(localDataStr) : [];
          
          // Check for new items AND updated items
          const localIds = new Set(localData.map(item => item.id));
          const localMap = new Map(localData.map(item => [item.id, item]));
          
          const newItems = serverData.filter(item => !localIds.has(item.id));
          const updatedItems = serverData.filter(serverItem => {
            const localItem = localMap.get(serverItem.id);
            return localItem && JSON.stringify(localItem) !== JSON.stringify(serverItem);
          });
          
          if (newItems.length > 0 || updatedItems.length > 0) {
            // Merge: keep unchanged local items, add new items, replace updated items
            const unchangedItems = localData.filter(item => {
              const isNew = newItems.some(ni => ni.id === item.id);
              const isUpdated = updatedItems.some(ui => ui.id === item.id);
              return !isNew && !isUpdated;
            });
            
            const merged = [...unchangedItems, ...newItems, ...updatedItems];
            const oldValue = localStorage.getItem(key);
            localStorage.setItem(key, JSON.stringify(merged));
            
            if (oldValue !== JSON.stringify(merged)) {
              window.dispatchEvent(new CustomEvent(`dcms_${resource}_synced`, { detail: merged }));
            }
          }
        }
      } catch (e) {
        console.warn(`[Sync] Error fetching ${resource}:`, e);
      }
    }
  }

  // Manual sync (for when user explicitly needs fresh data, like opening My Account)
  async syncNow() {
    await this.pushAllData();
    await this.pushPendingChanges();
    await this.pullChanges();
  }

  destroy() {
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
    }
    if (this.pullInterval) {
      clearInterval(this.pullInterval);
    }
    if (this.connectionRetryTimer) {
      clearTimeout(this.connectionRetryTimer);
    }
  }
}

// Create singleton
const syncService = new SyncService();

export default syncService;


// Sync Service - Connects to sync server for POC
// Syncs data between public website and admin portal

const SYNC_SERVER_URL = 'http://localhost:3002/api/sync';
const SYNC_INTERVAL = 2000; // Sync every 2 seconds

class SyncService {
  constructor() {
    this.syncInterval = null;
    this.isEnabled = false;
    this.lastSync = {};
    this.lastPushedHash = {};
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
          console.log('[Sync] Connected to sync server');
        }
        this.isEnabled = true;

        if (this.connectionRetryTimer) {
          clearTimeout(this.connectionRetryTimer);
          this.connectionRetryTimer = null;
        }

        await this.syncAll();
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
        // Ignore errors here - we'll keep retrying
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
    if (!this.isEnabled) return;
    
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log(`[Sync] Synced ${resource} to server:`, data.length, 'items');
      }
    } catch (e) {
      console.warn(`[Sync] Failed to sync ${resource}:`, e.message);
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

  async syncAll() {
    const connected = await this.ensureConnection();
    if (!connected) {
      console.warn('[Sync] Sync service is disabled (waiting for server)');
      return;
    }
    
    console.log('[Sync] Starting full sync...');
    
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
    for (const resource of resources) {
      try {
        const serverData = await this.syncFromServer(resource);
        if (!serverData || !Array.isArray(serverData)) {
          continue;
        }

        const key = `dcms_${resource}`;
        const localDataStr = localStorage.getItem(key);
        const localData = localDataStr ? JSON.parse(localDataStr) : [];
        
        // Check if server has new items by comparing IDs
        const localIds = new Set(localData.map(item => item.id));
        const serverIds = new Set(serverData.map(item => item.id));
        const hasNewItems = [...serverIds].some(id => !localIds.has(id));
        const hasRemovedItems = [...localIds].some(id => !serverIds.has(id));
        const hasDifferentLength = serverData.length !== localData.length;
        
        // Also check if any existing items have been updated (compare by JSON string)
        const localMap = new Map(localData.map(item => [item.id, item]));
        const hasUpdatedItems = serverData.some(serverItem => {
          const localItem = localMap.get(serverItem.id);
          return localItem && JSON.stringify(localItem) !== JSON.stringify(serverItem);
        });

        if (hasNewItems || hasRemovedItems || hasDifferentLength || hasUpdatedItems) {
          localStorage.setItem(key, JSON.stringify(serverData));
          console.log(`[Sync] ✅ Synced ${resource} from server (${serverData.length} items, was ${localData.length})`);
          if (hasNewItems) {
            const newIds = [...serverIds].filter(id => !localIds.has(id));
            console.log(`[Sync] New ${resource} IDs:`, newIds.slice(0, 5));
          }
          window.dispatchEvent(new CustomEvent(`dcms_${resource}_synced`, { detail: serverData }));
        } else {
          console.log(`[Sync] 📊 ${resource}: server=${serverData.length}, local=${localData.length} (no changes)`);
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


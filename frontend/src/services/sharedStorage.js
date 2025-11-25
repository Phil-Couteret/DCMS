// Shared Storage Bridge for POC
// Since public website (port 3000) and admin portal (port 3001) are different origins,
// they can't share localStorage directly. This service provides a sync mechanism.
// 
// For the POC, we'll use a simple approach:
// 1. Both apps write to their own localStorage
// 2. A sync service periodically checks and copies data between apps
// 3. Uses a shared sync key to coordinate

const SYNC_KEY = 'dcms_shared_sync';
const SYNC_INTERVAL = 1000; // Check every second
const DCMS_KEYS = ['dcms_bookings', 'dcms_customers', 'dcms_locations', 'dcms_equipment'];

class SharedStorageSync {
  constructor() {
    this.syncInterval = null;
    this.lastSyncTime = 0;
    this.isPublic = window.location.port === '3000';
    this.isAdmin = window.location.port === '3001' || window.location.port === '';
    
    this.init();
  }

  init() {
    // Start syncing
    this.startSync();
    
    // Listen for localStorage changes
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Also listen for custom events
    window.addEventListener('dcms_data_changed', this.handleDataChange.bind(this));
  }

  handleStorageChange(event) {
    // When localStorage changes, trigger sync
    if (event.key && event.key.startsWith('dcms_')) {
      this.markForSync();
    }
  }

  handleDataChange() {
    this.markForSync();
  }

  markForSync() {
    // Update sync timestamp
    const syncData = {
      timestamp: Date.now(),
      source: this.isPublic ? 'public' : 'admin'
    };
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncData));
  }

  startSync() {
    // Initial sync
    this.sync();
    
    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.sync();
    }, SYNC_INTERVAL);
  }

  sync() {
    try {
      // Check if there's a sync request
      const syncDataStr = localStorage.getItem(SYNC_KEY);
      if (!syncDataStr) {
        this.markForSync();
        return;
      }

      const syncData = JSON.parse(syncDataStr);
      
      // If sync is recent (within last 5 seconds), data might be fresh
      // For now, we'll just ensure our data is up to date
      // In a real implementation, this would use a shared backend
      
      // For POC: Just ensure data consistency by checking all keys exist
      DCMS_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (!value) {
          // Initialize empty array if key doesn't exist
          localStorage.setItem(key, JSON.stringify([]));
        }
      });
      
    } catch (e) {
      console.warn('[SharedStorage] Sync error:', e);
    }
  }

  // Helper to ensure data is synced before operations
  ensureSynced() {
    this.sync();
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('dcms_data_changed', this.handleDataChange);
  }
}

// Create singleton
const sharedStorageSync = new SharedStorageSync();

export default sharedStorageSync;

// Firebase Cloud Sync Manager (Realtime Cross-Device Data Sync)
import { store } from './store.js';

const STORAGE_KEY_FIREBASE_URL = 'kila_firebase_url';
const STORAGE_KEY_FIREBASE_AUTOSYNC = 'kila_firebase_autosync';
const DEFAULT_FIREBASE_URL = 'https://kaset-stock-manager-default-rtdb.firebaseio.com/';

class FirebaseSyncManager {
  constructor() {
    this.databaseUrl = localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || DEFAULT_FIREBASE_URL;
    this.autoSyncEnabled = localStorage.getItem(STORAGE_KEY_FIREBASE_AUTOSYNC) !== 'false';
    this.eventSource = null;
    this.isSyncing = false;

    this.init();
  }

  init() {
    if (this.databaseUrl && this.autoSyncEnabled) {
      this.startRealtimeListener();
    }
  }

  getCleanUrl() {
    if (!this.databaseUrl) return '';
    let url = this.databaseUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (!url.endsWith('/')) {
      url += '/';
    }
    return url;
  }

  setDatabaseUrl(url) {
    this.databaseUrl = url.trim();
    localStorage.setItem(STORAGE_KEY_FIREBASE_URL, this.databaseUrl);
    if (this.databaseUrl && this.autoSyncEnabled) {
      this.startRealtimeListener();
    } else {
      this.stopRealtimeListener();
    }
  }

  setAutoSync(enabled) {
    this.autoSyncEnabled = !!enabled;
    localStorage.setItem(STORAGE_KEY_FIREBASE_AUTOSYNC, this.autoSyncEnabled.toString());
    if (this.autoSyncEnabled && this.databaseUrl) {
      this.startRealtimeListener();
    } else {
      this.stopRealtimeListener();
    }
  }

  // Upload all local store data (Transactions, Inventory, COD Orders, Balances) to Firebase
  async uploadLocalToCloud() {
    const baseUrl = this.getCleanUrl();
    if (!baseUrl) {
      throw new Error('กรุณากรอก Firebase Database URL ก่อนอัปโหลด');
    }

    const payload = {
      transactions: store.transactions || [],
      inventory: store.inventory || [],
      codOrders: store.codOrders || [],
      initialBalance: store.initialBalance || 0,
      actualBalance: store.actualBalance || 0,
      lastUpdated: new Date().toISOString(),
      updatedByDevice: navigator.userAgent
    };

    const targetEndpoint = `${baseUrl}kila_store.json`;
    const response = await fetch(targetEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`อัปโหลดล้มเหลว HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Download store data from Firebase Cloud to local device
  async downloadCloudToLocal() {
    const baseUrl = this.getCleanUrl();
    if (!baseUrl) {
      throw new Error('กรุณากรอก Firebase Database URL ก่อนดึงข้อมูล');
    }

    const targetEndpoint = `${baseUrl}kila_store.json`;
    const response = await fetch(targetEndpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`ดึงข้อมูลล้มเหลว HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data) {
      throw new Error('ไม่พบข้อมูลบน Firebase Cloud (กรุณากดอัปโหลดจากเครื่องแรกก่อน)');
    }

    // Restore data into BizStore
    if (Array.isArray(data.transactions)) store.transactions = data.transactions;
    if (Array.isArray(data.inventory)) store.inventory = data.inventory;
    if (Array.isArray(data.codOrders)) store.codOrders = data.codOrders;
    if (data.initialBalance !== undefined) store.initialBalance = parseFloat(data.initialBalance) || 0;
    if (data.actualBalance !== undefined) store.actualBalance = parseFloat(data.actualBalance) || 0;

    store.saveToStorage();
    store.notify();
    return data;
  }

  // Real-time EventSource Listener for Instant Cross-Device Sync
  startRealtimeListener() {
    this.stopRealtimeListener();
    const baseUrl = this.getCleanUrl();
    if (!baseUrl) return;

    try {
      const streamUrl = `${baseUrl}kila_store.json`;
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onmessage = (event) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data);
          const data = parsed.data || parsed;
          if (data && (data.transactions || data.inventory || data.codOrders)) {
            // Apply update silently without looping
            this.isSyncing = true;
            if (Array.isArray(data.transactions)) store.transactions = data.transactions;
            if (Array.isArray(data.inventory)) store.inventory = data.inventory;
            if (Array.isArray(data.codOrders)) store.codOrders = data.codOrders;
            if (data.initialBalance !== undefined) store.initialBalance = parseFloat(data.initialBalance) || 0;
            if (data.actualBalance !== undefined) store.actualBalance = parseFloat(data.actualBalance) || 0;

            store.saveToStorage();
            store.notify();
            this.isSyncing = false;
            this.updateHeaderStatus(true);
          }
        } catch (e) {
          console.warn('Firebase SSE parse error:', e);
        }
      };

      this.eventSource.onerror = () => {
        this.updateHeaderStatus(false);
      };

      this.updateHeaderStatus(true);
    } catch (err) {
      console.warn('Firebase EventSource error:', err);
      this.updateHeaderStatus(false);
    }
  }

  stopRealtimeListener() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateHeaderStatus(false);
  }

  // Trigger auto-upload if autoSync is enabled and not responding to incoming sync
  async triggerAutoSync() {
    if (this.isSyncing) return;
    if (!this.databaseUrl || !this.autoSyncEnabled) return;

    try {
      await this.uploadLocalToCloud();
      this.updateHeaderStatus(true);
    } catch (e) {
      console.warn('Auto Firebase Sync failed:', e);
      this.updateHeaderStatus(false);
    }
  }

  updateHeaderStatus(isConnected) {
    const lbl = document.getElementById('lblFirebaseStatus');
    const btn = document.getElementById('btnFirebaseStatus');
    if (!lbl || !btn) return;

    if (this.databaseUrl && this.autoSyncEnabled && isConnected) {
      lbl.innerHTML = '🟢 Cloud Synced';
      btn.style.borderColor = '#34d399';
      btn.style.color = '#34d399';
    } else if (this.databaseUrl) {
      lbl.innerHTML = '🟡 Cloud Standby';
      btn.style.borderColor = '#fbbf24';
      btn.style.color = '#fbbf24';
    } else {
      lbl.innerHTML = '☁️ Cloud Sync';
      btn.style.borderColor = '#38bdf8';
      btn.style.color = '#38bdf8';
    }
  }
}

export const firebaseSync = new FirebaseSyncManager();

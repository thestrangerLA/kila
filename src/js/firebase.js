// Firebase Cloud Firestore Manager for "kaset-stock-manager"
import { store } from './store.js';

const STORAGE_KEY_FIREBASE_PROJECT = 'kila_firestore_project_id';
const STORAGE_KEY_FIREBASE_AUTOSYNC = 'kila_firestore_autosync';
const DEFAULT_PROJECT_ID = 'kaset-stock-manager';
const COLLECTION_NAME = 'sports_stockItems';
const DOCUMENT_ID = 'nwfaYyc9qQLGxMBfvFlX';

class FirebaseFirestoreManager {
  constructor() {
    this.projectId = localStorage.getItem(STORAGE_KEY_FIREBASE_PROJECT) || DEFAULT_PROJECT_ID;
    this.autoSyncEnabled = localStorage.getItem(STORAGE_KEY_FIREBASE_AUTOSYNC) !== 'false';
    this.isSyncing = false;

    this.updateHeaderStatus(true);
  }

  setProjectId(id) {
    this.projectId = (id || DEFAULT_PROJECT_ID).trim();
    localStorage.setItem(STORAGE_KEY_FIREBASE_PROJECT, this.projectId);
  }

  setAutoSync(enabled) {
    this.autoSyncEnabled = !!enabled;
    localStorage.setItem(STORAGE_KEY_FIREBASE_AUTOSYNC, this.autoSyncEnabled.toString());
  }

  getFirestoreEndpoint() {
    const pId = this.projectId || DEFAULT_PROJECT_ID;
    return `https://firestore.googleapis.com/v1/projects/${pId}/databases/(default)/documents/${COLLECTION_NAME}/${DOCUMENT_ID}`;
  }

  // Upload local store state to Cloud Firestore (Collection: sports_stockItems, Document: kila_main_store)
  async uploadLocalToCloud() {
    const endpoint = this.getFirestoreEndpoint();

    const payload = {
      fields: {
        transactionsJson: { stringValue: JSON.stringify(store.transactions || []) },
        inventoryJson:    { stringValue: JSON.stringify(store.inventory || []) },
        codOrdersJson:    { stringValue: JSON.stringify(store.codOrders || []) },
        initialBalance:   { doubleValue: store.initialBalance || 0 },
        actualBalance:    { doubleValue: store.actualBalance || 0 },
        lastUpdated:      { stringValue: new Date().toISOString() }
      }
    };

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`อัปโหลดขึ้น Cloud Firestore ล้มเหลว (${response.status}): ${errText}`);
    }

    this.updateHeaderStatus(true);
    return await response.json();
  }

  // Download store state from Cloud Firestore to local device
  async downloadCloudToLocal() {
    const endpoint = this.getFirestoreEndpoint();

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('ยังไม่พบข้อมูลใน Cloud Firestore (กรุณากดอัปโหลดขึ้น Cloud ครั้งแรกก่อน)');
      }
      const errText = await response.text();
      throw new Error(`ดึงข้อมูลจาก Cloud Firestore ล้มเหลว (${response.status}): ${errText}`);
    }

    const doc = await response.json();
    if (!doc || !doc.fields) {
      throw new Error('รูปแบบข้อมูลใน Cloud Firestore ไม่ถูกต้อง');
    }

    const fields = doc.fields;
    this.isSyncing = true;

    try {
      if (fields.transactionsJson?.stringValue) {
        store.transactions = JSON.parse(fields.transactionsJson.stringValue);
      }
      if (fields.inventoryJson?.stringValue) {
        store.inventory = JSON.parse(fields.inventoryJson.stringValue);
      }
      if (fields.codOrdersJson?.stringValue) {
        store.codOrders = JSON.parse(fields.codOrdersJson.stringValue);
      }
      if (fields.initialBalance) {
        store.initialBalance = fields.initialBalance.doubleValue || fields.initialBalance.integerValue || 0;
      }
      if (fields.actualBalance) {
        store.actualBalance = fields.actualBalance.doubleValue || fields.actualBalance.integerValue || 0;
      }

      store.saveToStorage();
      store.notify();
    } finally {
      this.isSyncing = false;
    }

    this.updateHeaderStatus(true);
    return fields;
  }

  // Trigger auto upload to Firestore on data changes
  async triggerAutoSync() {
    if (this.isSyncing) return;
    if (!this.autoSyncEnabled) return;

    try {
      await this.uploadLocalToCloud();
    } catch (e) {
      console.warn('Firestore auto-sync skipped/pending:', e.message);
      this.updateHeaderStatus(false);
    }
  }

  updateHeaderStatus(isConnected) {
    const lbl = document.getElementById('lblFirebaseStatus');
    const btn = document.getElementById('btnFirebaseStatus');
    if (!lbl || !btn) return;

    if (isConnected) {
      lbl.innerHTML = '🟢 Firestore Synced';
      btn.style.borderColor = '#34d399';
      btn.style.color = '#34d399';
    } else {
      lbl.innerHTML = '🟡 Cloud Standby';
      btn.style.borderColor = '#fbbf24';
      btn.style.color = '#fbbf24';
    }
  }
}

export const firebaseSync = new FirebaseFirestoreManager();

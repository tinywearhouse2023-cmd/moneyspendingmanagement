// storage.js — IndexedDB key-value wrapper.
//
// Mimics the Claude artifact `window.storage` API so app code is portable
// between the artifact runtime and this local Vite build.
//
//   get(key)         → { key, value } | null
//   set(key, value)  → { key, value }
//   delete(key)      → { key, deleted }
//   list(prefix?)    → { keys, prefix }
//
// Values can be any IndexedDB-serializable type. We store JSON strings for
// the main app state and raw data URLs for receipt images.

const DB_NAME = 'tinysplit';
const STORE = 'kv';
const VERSION = 1;

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
  });
  return dbPromise;
}

async function getStore(mode) {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
}

export const storage = {
  async get(key) {
    const store = await getStore('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result === undefined ? null : { key, value: req.result });
      };
      req.onerror = () => reject(req.error);
    });
  },

  async set(key, value) {
    const store = await getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve({ key, value });
      req.onerror = () => reject(req.error);
    });
  },

  async delete(key) {
    const store = await getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve({ key, deleted: true });
      req.onerror = () => reject(req.error);
    });
  },

  async list(prefix = '') {
    const store = await getStore('readonly');
    return new Promise((resolve, reject) => {
      const keys = [];
      const req = store.openKeyCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (!prefix || String(cursor.key).startsWith(prefix)) keys.push(cursor.key);
          cursor.continue();
        } else {
          resolve({ keys, prefix });
        }
      };
      req.onerror = () => reject(req.error);
    });
  },
};

const DB_NAME = 'cloudnine';
const DB_VERSION = 2;
const STORE_NAME = 'weather';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      let store;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'cityKey' });
      } else {
        store = event.target.transaction.objectStore(STORE_NAME);
      }

      if (!store.indexNames.contains('lastUpdate')) {
        store.createIndex('lastUpdate', 'lastUpdate');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function addCity(city, data) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const cityKey = city.toLowerCase();

  store.put({
    cityKey,
    city,
    ...data,
    lastUpdate: Date.now()
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredCities() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getMostRecentCity() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('lastUpdate');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev');
    request.onsuccess = event => {
      const cursor = event.target.result;
      resolve(cursor ? cursor.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCityByName(city) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  const cityKey = city.toLowerCase();

  return new Promise((resolve, reject) => {
    const request = store.get(cityKey);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function trimStore(limit = 3) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('lastUpdate');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const records = request.result;
      if (records.length <= limit) {
        resolve();
        return;
      }

      records
        .sort((a, b) => b.lastUpdate - a.lastUpdate)
        .slice(limit)
        .forEach(record => store.delete(record.cityKey));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}
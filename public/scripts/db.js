const DB_NAME = 'cloudnine';
const DB_VERSION = 1;
const STORE_NAME = 'weather';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'city' });
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

  store.put({ city, ...data, lastUpdate: Date.now() });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function trimStore() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const records = request.result;
      if (records.length > 3) {
        records
          .sort((a, b) => b.lastUpdate - a.lastUpdate)
          .slice(3)
          .forEach(record => store.delete(record.city));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
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
  const cities = await getStoredCities();
  if (cities.length === 0) return null;
  cities.sort((a, b) => b.lastUpdate - a.lastUpdate);
  return cities[0];
}
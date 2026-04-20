const DB_NAME = 'cloudnine';
const DB_VERSION = 3;
const STORE_NAME = 'weather';

let dbPromise = null;

function normalizeCityRecord(city, data) {
  return {
    cityKey: city.toLowerCase(),
    city,
    condition: data?.condition ?? 'Unavailable',
    temp: data?.temp ?? '--',
    icon: data?.icon ?? 1,
    forecast: Array.isArray(data?.forecast) ? data.forecast : [],
    lastUpdate: Date.now()
  };
}

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
        store.createIndex('lastUpdate', 'lastUpdate', { unique: false });
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

  const record = normalizeCityRecord(city, data);
  store.put(record);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(record);
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

export async function getMostRecentCity() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  try {
    const index = store.index('lastUpdate');
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = e => {
        const cursor = e.target.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    // fallback
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const records = request.result || [];
        if (!records.length) return resolve(null);
        records.sort((a, b) => b.lastUpdate - a.lastUpdate);
        resolve(records[0]);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export async function trimStore(max = 4, currentCity = null) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    store.getAll().onsuccess = async event => {
      let records = event.target.result || [];

      // Keep current city safe
      const safeCities = [];
      if (currentCity) {
        const current = records.find(r => r.city.toLowerCase() === currentCity.toLowerCase());
        if (current) safeCities.push(current);
      }

      const others = records
        .filter(r => !safeCities.includes(r))
        .sort((a, b) => b.lastUpdate - a.lastUpdate);

      // Add up to (max - safeCities.length) other recent cities
      const keepOthers = others.slice(0, max - safeCities.length);

      const toKeep = [...safeCities, ...keepOthers];

      // Delete anything not in toKeep
      records.forEach(r => {
        if (!toKeep.includes(r)) {
          store.delete(r.cityKey);
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };

    store.getAll().onerror = () => reject(tx.error);
  });
}
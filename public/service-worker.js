const CACHE_VERSION = 'v1';
const CACHE_NAME = `cloudnine-cache-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  '/index.html',
  '/style.css',
  '/scripts/ui.js',
  '/scripts/api.js',
  '/scripts/main.js',
  '/font/Poppins-Light.ttf',
  '/font/Poppins-LightItalic.ttf',
  '/font/Poppins-Regular.ttf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(FILES_TO_CACHE.map(file => cache.add(file)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  const isIconRequest = url.includes('/icons/');

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request);

      if (isIconRequest && cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);

        // Cache icons and any explicitly listed files
        if (isIconRequest || FILES_TO_CACHE.some(file => url.endsWith(file))) {
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch {
        // Fallback to cache if offline
        if (cachedResponse) return cachedResponse;
      }
    })
  );
});
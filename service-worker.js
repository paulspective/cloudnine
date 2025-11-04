const CACHE_VERSION = 'v1';
const CACHE_NAME = `cloudnine-cache-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  `./frontend/index.html`,
  `./frontend/style.css`,
  `./frontend/scripts/ui.js`,
  `./frontend/scripts/api.js`,
  `./frontend/scripts/main.js`
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
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  if (url.startsWith('https://fonts.googleapis.com')) return;

  const isIconRequest = url.includes('/icons/');

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request);

      if (isIconRequest && cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);

        if (isIconRequest || FILES_TO_CACHE.some(file => url.endsWith(file))) {
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch {
        if (cachedResponse) return cachedResponse;
      }
    })
  );
}); 
const CACHE_VERSION = 'happyhours-v1.0.0-' + new Date().getTime(); // Añadimos timestamp
const CACHE_NAME = `${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/assets/www/splash.html',
  '/assets/www/user-agreement.html'
];

// Install event con skipWaiting inmediato
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        // Forzar revalidación de recursos
        return cache.addAll(urlsToCache.map(url => 
          new Request(url, { cache: 'reload', mode: 'no-cors' })
        ));
      }),
      self.skipWaiting() // Fuerza la activación inmediata
    ])
  );
});

// Activate event con limpieza agresiva de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim() // Toma control inmediato
    ])
  );
});

// Fetch event con estrategia "Network First" y validación de caché
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, { cache: 'reload' })
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
          return networkResponse;
        }
        throw new Error('Network response was not ok');
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              // Intentar actualizar en segundo plano
              fetch(event.request, { cache: 'reload' })
                .then(freshResponse => {
                  if (freshResponse && freshResponse.status === 200) {
                    caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, freshResponse);
                    });
                  }
                });
              return cachedResponse;
            }
            return new Response('Network error happened', {
              status: 404,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Listener para mensajes de actualización
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

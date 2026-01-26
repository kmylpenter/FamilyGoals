const CACHE_NAME = 'familygoals-v9'; // Version bump for audit fixes
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/utils.js',
  '/js/app.js',
  '/js/event-bus.js',
  '/js/pin-manager.js',
  '/js/data-manager.js',
  '/js/recurring-manager.js',
  '/js/alert-manager.js',
  '/js/engagement-manager.js',
  '/js/gamification-manager.js',
  '/js/ui-features.js',
  '/js/family-balance.js',
  '/js/family-unity.js',
  '/js/ai-advisor.js',
  '/data/inflation.json',
  '/data/planned.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - cache first, network fallback
self.addEventListener('fetch', (event) => {
  // Skip data files - always fetch fresh
  if (event.request.url.includes('/data/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          // Return cached, update in background (stale-while-revalidate)
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
          }).catch(() => {}); // Ignore network errors for background update
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
  );
});

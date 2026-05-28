// SLT.TPI At A Glance — Service Worker
// Caches all pages for offline use

const CACHE_NAME = 'slt-tpi-v1';

const PAGES_TO_CACHE = [
  '/SLT-UNDERGROUND/',
  '/SLT-UNDERGROUND/index.html',
  '/SLT-UNDERGROUND/pages/notes.html',
  '/SLT-UNDERGROUND/pages/past-questions.html',
  '/SLT-UNDERGROUND/pages/report-books.html',
  '/SLT-UNDERGROUND/pages/course-outline.html',
  '/SLT-UNDERGROUND/pages/gp-calculator.html',
  '/SLT-UNDERGROUND/pages/prosper-ai.html',
  '/SLT-UNDERGROUND/pages/admin.html',
  '/SLT-UNDERGROUND/pages/about.html',
  '/SLT-UNDERGROUND/pages/brochure.html',
  '/SLT-UNDERGROUND/pages/timetable.html',
  '/SLT-UNDERGROUND/icons/icon-192.png',
  '/SLT-UNDERGROUND/icons/icon-512.png',
  '/SLT-UNDERGROUND/manifest.json'
];

// ── INSTALL: cache everything ──
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PAGES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ──
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: serve from cache, fall back to network ──
self.addEventListener('fetch', function (event) {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        // Serve from cache, update in background
        fetch(event.request).then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(function () {});
        return cachedResponse;
      }

      // Not in cache — fetch from network and cache it
      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        var responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(function () {
        // Offline fallback — return index if available
        return caches.match('/SLT-UNDERGROUND/index.html');
      });
    })
  );
});

// SLT.TPI At A Glance — Service Worker
const CACHE_NAME = 'slt-tpi-v3';
const ASSETS = [
  '/SLT-TPI-AT-A-GLANCE/',
  '/SLT-TPI-AT-A-GLANCE/index.html',
  '/SLT-TPI-AT-A-GLANCE/pages/notes.html',
  '/SLT-TPI-AT-A-GLANCE/pages/past-questions.html',
  '/SLT-TPI-AT-A-GLANCE/pages/report-books.html',
  '/SLT-TPI-AT-A-GLANCE/pages/course-outline.html',
  '/SLT-TPI-AT-A-GLANCE/pages/gp-calculator.html',
  '/SLT-TPI-AT-A-GLANCE/pages/prosper-ai.html',
  '/SLT-TPI-AT-A-GLANCE/pages/admin.html',
  '/SLT-TPI-AT-A-GLANCE/pages/about.html',
  '/SLT-TPI-AT-A-GLANCE/pages/brochure.html',
  '/SLT-TPI-AT-A-GLANCE/pages/timetable.html',
  '/SLT-TPI-AT-A-GLANCE/pages/advertise.html',
  '/SLT-TPI-AT-A-GLANCE/Icon/icon-192.png',
  '/SLT-TPI-AT-A-GLANCE/Icon/icon-512.png',
  '/SLT-TPI-AT-A-GLANCE/manifest.json',
  '/SLT-TPI-AT-A-GLANCE/ad-player.js'
];

// Install: cache all assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // activate immediately
});

// Activate: delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// Fetch: network first, fall back to cache
// This means users always get the latest version when online
self.addEventListener('fetch', function(e) {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(function(networkResponse) {
      // Got fresh response - update cache and return it
      var responseClone = networkResponse.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(e.request, responseClone);
      });
      return networkResponse;
    }).catch(function() {
      // Offline - serve from cache
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/SLT-TPI-AT-A-GLANCE/index.html');
      });
    })
  );
});

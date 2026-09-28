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
  '/SLT-TPI-AT-A-GLANCE/pages/study-zone.html',
  '/SLT-TPI-AT-A-GLANCE/Icon/icon-192.png',
  '/SLT-TPI-AT-A-GLANCE/Icon/icon-512.png',
  '/SLT-TPI-AT-A-GLANCE/manifest.json',
  '/SLT-TPI-AT-A-GLANCE/ad-player.js'
];

// Background refresh of saved pages runs at most once per this gap
const REFRESH_GAP = 10 * 60 * 1000;
const LAST_KEY = self.registration.scope + '__lastrefresh__';

// "This page was just updated" bar. Added to a page by this file,
// so no page has to be edited. It hides itself after a few seconds.
const BAR_HTML =
  '<style>@keyframes sltUpd{0%{opacity:0;transform:translate(-50%,12px)}10%{opacity:1;transform:translate(-50%,0)}85%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0);visibility:hidden}}</style>' +
  '<div style="position:fixed;left:50%;bottom:18px;transform:translate(-50%,0);z-index:2147483647;background:#161616;color:#F0EDE6;border:1px solid #E8650A;border-radius:10px;padding:10px 16px;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.5);pointer-events:none;animation:sltUpd 4.5s ease forwards;">This page was just updated</div>';

function inject(html) {
  var i = html.search(/<\/body>/i);
  return i < 0 ? html + BAR_HTML : html.slice(0, i) + BAR_HTML + html.slice(i);
}

// A small marker saved when a page changed in the background,
// so the bar can show the next time the student opens that page
function markKey(url) {
  return new Request(self.registration.scope + '__updated__?u=' + encodeURIComponent(url));
}

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
    }).then(registerPeriodic)
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// Android bonus: lets Chrome refresh saved pages now and then while the app is closed
function registerPeriodic() {
  try {
    if (self.registration.periodicSync) {
      return self.registration.periodicSync.register('slt-refresh', { minInterval: 12 * 60 * 60 * 1000 }).catch(function(){});
    }
  } catch (err) {}
}

self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'slt-refresh') e.waitUntil(refreshAll());
});

// Re-download every saved page in the background so offline copies stay current.
// If a saved page changed, leave a marker so the "updated" bar shows once.
async function refreshAll() {
  var cache = await caches.open(CACHE_NAME);
  await cache.put(LAST_KEY, new Response(String(Date.now())));
  registerPeriodic();
  var origin = self.location.origin;
  var urls = new Set(ASSETS.map(function(a){ return new URL(a, origin).href; }));
  (await cache.keys()).forEach(function(r) {
    if (r.url.indexOf(origin) === 0 && r.url.indexOf('/__') < 0) urls.add(r.url);
  });
  await Promise.all(Array.from(urls).map(async function(u) {
    try {
      var res = await fetch(u, { cache: 'no-cache' });
      if (!res.ok) return;
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('text/html') >= 0) {
        var old = await cache.match(u);
        if (old) {
          var texts = await Promise.all([old.text(), res.clone().text()]);
          if (texts[0] !== texts[1]) await cache.put(markKey(u), new Response('1'));
        }
      }
      await cache.put(u, res);
    } catch (err) {}
  }));
}

async function maybeRefresh() {
  var cache = await caches.open(CACHE_NAME);
  var last = await cache.match(LAST_KEY);
  if (last) {
    var t = parseInt(await last.text(), 10);
    if (Date.now() - t < REFRESH_GAP) return;
  }
  await refreshAll();
}

// Fetch: network first, fall back to cache
// This means users always get the latest version when online
async function handle(req) {
  try {
    var net = await fetch(req);
    var cache = await caches.open(CACHE_NAME);
    var sameOrigin = req.url.indexOf(self.location.origin) === 0;
    var isPage = sameOrigin && net.ok && req.destination === 'document' &&
      (net.headers.get('content-type') || '').indexOf('text/html') >= 0;

    var oldText = null;
    if (isPage) {
      var old = await cache.match(req);
      if (old) oldText = await old.text();
    }

    await cache.put(req, net.clone());
    if (!isPage) return net;

    var key = markKey(req.url);
    var marked = await cache.match(key);
    var newText = await net.clone().text();
    var changed = (oldText !== null && oldText !== newText) || !!marked;
    if (marked) await cache.delete(key);
    if (!changed) return net;

    var h = new Headers(net.headers);
    h.delete('content-encoding');
    h.delete('content-length');
    h.set('content-type', 'text/html; charset=utf-8');
    return new Response(inject(newText), { status: net.status, statusText: net.statusText, headers: h });
  } catch (err) {
    // Offline - serve from cache
    var cached = await caches.match(req);
    return cached || caches.match('/SLT-TPI-AT-A-GLANCE/index.html');
  }
}

self.addEventListener('fetch', function(e) {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  var p = handle(e.request);
  e.respondWith(p);
  // When the app is opened with data on, quietly refresh the other saved pages
  if (e.request.mode === 'navigate') {
    e.waitUntil(p.then(maybeRefresh).catch(function(){}));
  }
});

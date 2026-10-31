/* Offline fallback service worker (edge-state fix 2026-10-31, pattern from MyHQ sw.js).
   Same-origin GETs only. Pages: network first, keep a copy of what the visitor opened, fall back to that
   copy or /offline.html. Static files: cache first, refreshed in the background. Nothing else is touched. */
var VERSION = 'offline-20261031-2';
var CACHE = 'site-' + VERSION;
var OFFLINE = '/offline.html';
var PRECACHE = ["/offline.html", "/assets/images/etlabs-wordmark.svg", "/favicon.svg", "/"];
var SKIP = ["/myhq", "/apps/myhq", "/study/api", "/api/", "/cdn-cgi/", "/totalcross/api"];
var MAX_PAGES = 40;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('site-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Pages/Workers serve /x.html as a redirect to /x; a redirected response cannot answer a navigation, so re-wrap it.
function clean(r) { if (!r || !r.redirected) return r; return r.blob().then(function (b) { return new Response(b, { status: 200, headers: r.headers }); }); }
function trim(c) { c.keys().then(function (ks) { var pages = ks.filter(function (r) { return /\/$|\.html$/.test(new URL(r.url).pathname) && PRECACHE.indexOf(new URL(r.url).pathname) < 0; }); if (pages.length > MAX_PAGES) c.delete(pages[0]); }); }
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  for (var i = 0; i < SKIP.length; i++) if (url.pathname.indexOf(SKIP[i]) === 0) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok && !res.redirected) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(url.pathname, copy).then(function () { trim(c); }); }); }
      return res;
    }).catch(function () {
      return caches.match(url.pathname).then(function (hit) { return hit || caches.match(OFFLINE); }).then(clean);
    }));
    return;
  }
  if (/\.(css|js|mjs|woff2?|svg|png|jpe?g|webp|avif|gif|ico|json|webmanifest)$/i.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: false }).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } return res; });
      return hit || net;
    }));
  }
});

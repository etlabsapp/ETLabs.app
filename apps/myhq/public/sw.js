/* MyHQ service worker: caches this app's own shell files so MyHQ opens offline.
   It never touches user data and never contacts any other site: requests to other origins and
   anything that is not a GET are left alone. A new version waits until the user taps Reload. */
var VERSION = 'v0.3.0-combined-5';
var CACHE = 'hq-shell-' + VERSION;
var SHELL = ['./', 'app.js', 'look.js', 'styles.css', 'schemes.css', 'visual.css', 'layouts.css', 'myhq-stamp.css', 'brand/stamp.svg', 'brand/stamp-dark.svg', 'brand/wordmark-motion.css', 'brand/wordmark-on-light.svg', 'brand/wordmark-on-dark.svg', 'manifest.webmanifest', 'robots.txt',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/icon-maskable-192.png', 'icons/favicon-32.png', 'icons/badge/indigo.svg', 'icons/badge/indigo-32.png', 'icons/badge/harbor.svg', 'icons/badge/harbor-32.png', 'icons/badge/fern.svg', 'icons/badge/fern-32.png', 'icons/badge/clay.svg', 'icons/badge/clay-32.png', 'icons/badge/light.svg', 'icons/badge/light-32.png', 'templates/index.json', 'templates/setup-flow.json'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('hq-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                         // never handle non-GET
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // same-origin shell assets only
  var root = new URL(self.registration.scope).pathname;
  if (req.mode === 'navigate' && url.pathname !== root && url.pathname !== root + 'index.html') {
    // other pages (the setup guide): network first, keep a copy for offline
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok && !res.redirected) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./').then(function (hit) {
      // a redirected response cannot answer a navigation (browser shows ERR_FAILED), so rebuild it or go to the network
      if (hit && hit.redirected) return hit.blob().then(function (b) { return new Response(b, { status: 200, headers: hit.headers }); });
      return hit || fetch(req);
    }));
    return;
  }
  if (url.pathname.indexOf('/templates/') !== -1) {                // starter templates: network first, keep a copy for offline
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); }));
});

/* MyHQ first paint: apply the saved look (color scheme, layout, light/dark) before the page draws, so there is no flash
   of the wrong colors. Reads only this device's localStorage mirror; IndexedDB stays the source of truth (app.js).
   Also the one place that picks the ETL Badge variant (Design's icon spec, 10/17) for the in-app badge <img> and the
   browser-tab icons: Paper->indigo, Harbor->harbor, Fern->fern, Clay->clay, Ink->light (light theme) / clay (dark theme).
   Files are used exactly as Design built them (icons/badge/<variant>.svg and <variant>-32.png); nothing is recolored.
   app.js calls MyHQLook.sync() whenever it changes data-scheme / data-theme. */
(function () {
  var r = document.documentElement, mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var BADGE = { paper: 'indigo', harbor: 'harbor', fern: 'fern', clay: 'clay', ink: 'light' };
  function badge(scheme, theme) {
    var dark = theme ? theme === 'dark' : !!(mq && mq.matches);
    return scheme === 'ink' && dark ? 'clay' : (BADGE[scheme] || 'indigo');
  }
  function swap(el, attr, url) { if (el.getAttribute(attr) !== url) el.setAttribute(attr, url); }
  function sync() {
    var v = badge(r.getAttribute('data-scheme') || 'paper', r.getAttribute('data-theme')), i, n;
    r.setAttribute('data-badge', v);
    n = document.querySelectorAll('link[data-badge-icon]');
    for (i = 0; i < n.length; i++) swap(n[i], 'href', 'icons/badge/' + v + (n[i].getAttribute('type') === 'image/png' ? '-32.png' : '.svg'));
    n = document.querySelectorAll('img[data-badge-img]');
    for (i = 0; i < n.length; i++) swap(n[i], 'src', 'icons/badge/' + v + '.svg');
    return v;
  }
  window.MyHQLook = { badge: badge, sync: sync };
  try {
    var l = JSON.parse(localStorage.getItem('myhq.look') || '{}');
    if (/^(paper|harbor|fern|clay|ink)$/.test(l.scheme)) r.setAttribute('data-scheme', l.scheme);
    if (/^(list|week|cards)$/.test(l.layout)) r.setAttribute('data-layout', l.layout);
    if (/^(light|dark)$/.test(l.theme)) r.setAttribute('data-theme', l.theme);
  } catch (e) {}
  sync();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  if (mq && mq.addEventListener) mq.addEventListener('change', sync);
})();

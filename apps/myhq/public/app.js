/* MyHQ (template) — everything renders here, in the browser. Data lives only in this device's IndexedDB.
   No network calls: this file never uses fetch/XHR/beacons/sockets. The service worker (sw.js) only caches
   this app's own files so it opens offline. */
(function () {
'use strict';
var APP_VERSION = '0.3.0-combined-5';
var APP_NAME = 'MyHQ';            // short name: in-sentence copy; == manifest short_name + apple-mobile-web-app-title (check-privacy.sh verifies)
var APP_FULL_NAME = 'ETLabs MyHQ';  // full product name (final, 10/17): page title, manifest name, footer, picker hero (check-privacy.sh verifies)
var STAMP_ALT = 'Your data, your device. ETLabs just gives you the platform.';   // Design's stamp: one accessible name on the wrapper
var TPL_DIR = 'templates/';
var NAME_MAX = 32, NAME_COUNT_FROM = 24; // dashboard name: max length, and when the character counter appears      // starter templates: plain JSON files, same origin only
var $ = function (s) { return document.querySelector(s); };
var root = document.documentElement;

/* ------------------------------------------------------------------ tiny DOM builder (no innerHTML, CSP-safe styles) */
function h(tag, props) {
  var el = document.createElement(tag);
  if (props) for (var k in props) {
    var v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') for (var s in v) el.style.setProperty(s, v[s]);
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
}
function add(el, c) {
  if (c == null || c === false) return;
  if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
  el.append(c.nodeType ? c : document.createTextNode(String(c)));
}
function areaKey(k) { k = String(k || ''); return /^[a-z0-9-]{1,24}$/.test(k) && areaMap()[k] ? k : 'other'; }
/* area -> slot class (.a1-.a6 / .a-other in schemes.css). Slot = position of the area's color in the Paper palette, so
   Paper looks the same as before; custom colors from restored backups fall back to the area's position. No inline styles. */
var PAPER_SLOTS = ['#2D6A9F', '#7A3E8E', '#2F7A5B', '#6E675D', '#A8341F', '#A86A12'];
var DARK_SLOTS = ['#7DB4E6', '#C08AD4', '#6CC69E', '#B3AA9C', '#E58A72', '#E0A44A'];
function slotClass(key) {
  key = areaKey(key); if (key === 'other') return 'a-other';
  var as = (state && state.areas) || DEFAULT_AREAS;
  for (var i = 0; i < as.length; i++) if (as[i].key === key) { var j = PAPER_SLOTS.indexOf(String(as[i].c).toUpperCase()); return 'a' + ((j >= 0 ? j : i % 6) + 1); }
  return 'a-other';
}
function dot(a) { return h('i', { class: 'dot ' + slotClass(a) }); }

/* ------------------------------------------------------------------ line icons (Design 2026-10-17): 24px grid, stroke only, built with createElementNS */
var SVGNS = 'http://www.w3.org/2000/svg';
var ICONS = {
  business: ['r:3,7.5,18,12.5,2.5', 'M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2', 'M3 13h18', 'M10.5 13v1.5h3V13'],
  student: ['M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z', 'M12 6.5V20'],
  transition: ['M5 20V4', 'M5 5h11l2.5 3-2.5 3H5', 'M5 14h8'],
  jobseeker: ['c:10.5,10.5,6', 'M15 15l5 5', 'M8 10.5h5', 'M10.5 8v5'],
  parents: ['c:8.5,7.5,2.8', 'c:16.5,9.5,2.2', 'M3.5 20c0-3.3 2.2-6 5-6s5 2.7 5 6', 'M14 20c.3-2.5 1.2-4.5 2.5-4.5S19.6 17.5 20 20'],
  stayhome: ['M3.5 11L12 4l8.5 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'],
  homeschool: ['r:3,4,18,12,1.5', 'M8.5 20l1.5-4', 'M15.5 20L14 16', 'M7 8.5h6', 'M7 11.5h4'],
  other: ['r:4,4,7,7,1.5', 'r:13,4,7,7,1.5', 'r:4,13,7,7,1.5', 'r:13,13,7,7,1.5'],
  sun: ['c:12,12,4', 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4'],
  moon: ['M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  lock: ['r:5,10.5,14,10,2', 'M8 10.5V8a4 4 0 0 1 8 0v2.5'],
  check: ['M5 12.5l4.5 4.5L19 7.5']
};
function icon(name, cls) {
  var s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  (ICONS[name] || ICONS.other).forEach(function (d) {
    var el, p = d.slice(2).split(',').map(Number);
    if (d.indexOf('r:') === 0) { el = document.createElementNS(SVGNS, 'rect'); el.setAttribute('x', p[0]); el.setAttribute('y', p[1]); el.setAttribute('width', p[2]); el.setAttribute('height', p[3]); el.setAttribute('rx', p[4]); }
    else if (d.indexOf('c:') === 0) { el = document.createElementNS(SVGNS, 'circle'); el.setAttribute('cx', p[0]); el.setAttribute('cy', p[1]); el.setAttribute('r', p[2]); }
    else { el = document.createElementNS(SVGNS, 'path'); el.setAttribute('d', d); }
    s.append(el);
  });
  return s;
}
/* each starter gets its own accent from the area slots (.a1-.a6 in schemes.css, plus .a-acc = scheme accent); unknown ids cycle a1-a6 */
var TPL_TONE = { student: 'a1', parents: 'a2', transition: 'a3', stayhome: 'a4', jobseeker: 'a5', business: 'a6', homeschool: 'a-acc' };
function tplTone(id, i) { return TPL_TONE[id] || 'a' + ((i % 6) + 1); }
function sampleCount(t) {   // real count of the sample items a starter adds (deadlines, to-dos, events incl. repeats, milestones, links)
  var prev = state; try { var s = stateFromTemplate(t); return ['deadlines', 'todos', 'events', 'journey', 'links'].reduce(function (n, k) { return n + s[k].length; }, 0); }
  catch (e) { return 0; } finally { state = prev; }
}

/* ------------------------------------------------------------------ local dates (always the device's own time zone) */
function pad(n) { return (n < 10 ? '0' : '') + n; }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
function startOfToday() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function validDate(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return false;
  var y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100) return false;
  var x = new Date(y, mo - 1, d);
  return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d;
}
function validTime(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || '')); }
function parseLocal(date, time) {
  var p = date.split('-').map(Number), t = (validTime(time) ? time : '00:00').split(':').map(Number);
  return new Date(p[0], p[1] - 1, p[2], t[0], t[1]);
}
function fmtTime(d) { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(':00', ''); }
function fmtDay(d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''); }
function fmtLong(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).replace(',', ''); }
function fmtMD(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
var TZ = (function () { try { var p = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date()); for (var i = 0; i < p.length; i++) if (p[i].type === 'timeZoneName') return p[i].value; } catch (e) {} return ''; })();
function relDay(d) { var n = Math.round((d - startOfToday()) / 864e5); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : fmtDay(d); }
function uid() { return (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2); }

/* ------------------------------------------------------------------ IndexedDB (one key/value store) */
var DB_NAME = 'hq-local', STORE = 'kv';
var KEYS = ['settings', 'areas', 'deadlines', 'todos', 'events', 'journey', 'links', 'meta'];
var dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise(function (res, rej) {
    var r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
    r.onsuccess = function () { r.result.onversionchange = function () { r.result.close(); dbp = null; }; res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
  return dbp;
}
function tx(mode, fn) {
  return db().then(function (d) {
    return new Promise(function (res, rej) {
      var t = d.transaction(STORE, mode), st = t.objectStore(STORE), out = fn(st);
      t.oncomplete = function () { res(out); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error); };
    });
  });
}
function loadAll() {
  var reqs = {};
  return tx('readonly', function (st) { KEYS.concat(['prefs']).forEach(function (k) { reqs[k] = st.get(k); }); return reqs; })
    .then(function (r) { var o = {}; for (var k in r) o[k] = r[k].result; return o; });
}
function put(keys) { return tx('readwrite', function (st) { keys.forEach(function (k) { st.put(state[k], k); }); }); }
function putPrefs() { mirrorLook(); return tx('readwrite', function (st) { st.put(prefs, 'prefs'); }); }
function wipe() {
  return db().then(function (d) { d.close(); dbp = null; }).catch(function () {}).then(function () {
    return new Promise(function (res, rej) { var r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = res; r.onerror = function () { rej(r.error); }; r.onblocked = res; });
  });
}

/* ------------------------------------------------------------------ state */
var state = null;           // null = first run (nothing stored)
var SCHEMES = [['paper', 'Paper'], ['harbor', 'Harbor'], ['fern', 'Fern'], ['clay', 'Clay'], ['ink', 'Ink']];
var LAYOUTS = [['list', 'List', 'Everything on one page (default)'], ['week', 'Week', 'Mon–Sun planner with previous and next week'], ['cards', 'Cards', 'Every open item as a tile']];
var LOOK_KEY = 'myhq.look';
function normPrefs(p) {
  p = p || {};
  return { theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : null,
    scheme: SCHEMES.some(function (x) { return x[0] === p.scheme; }) ? p.scheme : 'paper',
    layout: LAYOUTS.some(function (x) { return x[0] === p.layout; }) ? p.layout : 'list' };
}
function readMirror() { try { return JSON.parse(localStorage.getItem(LOOK_KEY) || '{}'); } catch (e) { return {}; } }
function mirrorLook() { try { localStorage.setItem(LOOK_KEY, JSON.stringify({ scheme: prefs.scheme, layout: prefs.layout, theme: prefs.theme })); } catch (e) {} }
var prefs = normPrefs(readMirror());   // first paint uses the mirror; boot replaces it with IndexedDB (source of truth)
var STATUS = { open: 'Open', waiting: 'Waiting on you', planned: 'Planned / watch', done: 'Done' };
var DEFAULT_AREAS = [
  { key: 'work', label: 'Work', c: '#2D6A9F', d: '#7DB4E6' },
  { key: 'growth', label: 'Growth', c: '#7A3E8E', d: '#C08AD4' },
  { key: 'learning', label: 'Learning', c: '#2F7A5B', d: '#6CC69E' },
  { key: 'admin', label: 'Admin', c: '#6E675D', d: '#B3AA9C' }
];
function areaMap() { var m = { other: { key: 'other', label: 'Other' } }; ((state && state.areas) || []).forEach(function (a) { m[a.key] = a; }); return m; }
function areaLabel(k) { return (areaMap()[k] || { label: 'Other' }).label; }
function blankState() {
  return { settings: { title: APP_NAME, subtitle: 'On this device only' }, areas: DEFAULT_AREAS.slice(), deadlines: [], todos: [], events: [], journey: [], links: [],
           meta: { created: new Date().toISOString(), lastBackup: null, example: false, template: '' } };
}

/* Starter templates: plain JSON files in templates/ (listed in templates/index.json). They are this app's own
   static files, read with a same-origin GET only (CSP connect-src 'self' also enforces that). Nothing is ever sent.
   Dates in a template are day offsets ("in": 3 = three days from today), so countdowns always look live.
   Every item a template adds is marked sample: true so "Remove sample items" can take them out later. */
function getTemplateJson(name) {
  if (!/^[a-z0-9-]{1,32}$/.test(name)) return Promise.reject(new Error('bad template name'));
  return fetch(TPL_DIR + name + '.json', { method: 'GET', mode: 'same-origin', credentials: 'omit', redirect: 'error', cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('template ' + name + ' not found'); return r.json(); });
}
var templatesP = null;
function loadTemplates() {
  if (templatesP) return templatesP;
  templatesP = getTemplateJson('index').then(function (ix) {
    var ids = list(ix && ix.templates, 24).filter(function (x) { return /^[a-z0-9-]{1,32}$/.test(String(x)); });
    return Promise.all(ids.map(function (id) { return getTemplateJson(id).then(function (t) { return t && t.format === 1 ? t : null; }, function () { return null; }); }));
  }).then(function (ts) { return ts.filter(Boolean); });
  templatesP.catch(function () { templatesP = null; });
  return templatesP;
}
function offsetDate(n) { n = Math.max(-3650, Math.min(3650, Math.round(Number(n) || 0))); return ymd(addDays(startOfToday(), n)); }
function stateFromTemplate(t) {
  var raw = { settings: { title: t.title || APP_NAME, subtitle: t.subtitle || '' }, areas: t.areas,
    deadlines: list(t.deadlines, 200).map(function (x) { return Object.assign({}, x, { date: offsetDate(x.in) }); }),
    todos: list(t.todos, 400).map(function (x) { return Object.assign({}, x, { date: x.in == null ? '' : offsetDate(x.in) }); }),
    events: list(t.events, 400).map(function (x) { return Object.assign({}, x, { date: offsetDate(x.in) }); }),
    journey: list(t.journey, 200).map(function (x) { return Object.assign({}, x, { date: offsetDate(x.in) }); }),
    links: t.links };
  list(t.repeat, 20).forEach(function (r) {
    var every = Math.max(1, Math.min(31, Number(r.every) || 7)), until = Math.min(120, Number(r.until) || 45);
    for (var n = Number(r.from) || 0, k = 0; n <= until && k < 60; n += every, k++) raw.events.push({ title: r.title, date: offsetDate(n), time: r.time, area: r.area });
  });
  ['deadlines', 'todos', 'events', 'journey', 'links'].forEach(function (k) { (raw[k] || []).forEach(function (x) { if (x) x.sample = true; }); });
  raw.meta = { created: new Date().toISOString(), lastBackup: null, example: true, template: String(t.id || '') };
  var s = sanitize(raw);
  s.settings.sampleSubtitle = s.settings.subtitle;
  return s;
}
function templateName() { return state && state.meta && state.meta.templateName ? state.meta.templateName : ''; }
function hasSamples() { return !!state && ['deadlines', 'todos', 'events', 'journey', 'links'].some(function (k) { return state[k].some(function (x) { return x.sample; }); }); }
function removeSamples() {
  if (!confirm('Remove the sample items? Anything you added or edited yourself stays.')) return;
  ['deadlines', 'todos', 'events', 'journey', 'links'].forEach(function (k) { state[k] = state[k].filter(function (x) { return !x.sample; }); });
  if (state.settings.subtitle === state.settings.sampleSubtitle) state.settings.subtitle = '';
  state.meta.example = false;
  closeDialog();
  put(KEYS).then(render);
}

/* ------------------------------------------------------------------ validation for restored files */
function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }
function safeUrl(u) { try { var x = new URL(String(u)); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : ''; } catch (e) { return ''; } }
function color(c, dflt) { return /^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : dflt; }
function list(a, n) { return Array.isArray(a) ? a.slice(0, n || 2000) : []; }
function sanitize(d) {
  if (!d || typeof d !== 'object') throw new Error('That file is not a ' + APP_NAME + ' backup.');
  var s = blankState();
  if (d.settings) s.settings = { title: str(d.settings.title, NAME_MAX) || APP_NAME, subtitle: str(d.settings.subtitle, 80), sampleSubtitle: str(d.settings.sampleSubtitle, 80) };
  var areas = list(d.areas, 24).map(function (a) { return { key: str(a && a.key, 24).toLowerCase(), label: str(a && a.label, 30), c: color(a && a.c, '#8A8378'), d: color(a && a.d, '#A39C90') }; })
    .filter(function (a) { return /^[a-z0-9-]{1,24}$/.test(a.key) && a.key !== 'other' && a.label; });
  if (areas.length) s.areas = areas;
  state = s; // so areaKey() below knows the areas
  s.deadlines = list(d.deadlines).filter(function (x) { return x && validDate(x.date) && str(x.title, 80); }).map(function (x) {
    return { id: str(x.id, 64) || uid(), title: str(x.title, 80), note: str(x.note, 140), date: x.date, time: validTime(x.time) ? x.time : '', area: areaKey(x.area), tag: str(x.tag, 24), sample: !!x.sample }; });
  s.todos = list(d.todos).filter(function (x) { return x && str(x.title, 120) && (!x.date || validDate(x.date)); }).map(function (x) {
    return { id: str(x.id, 64) || uid(), title: str(x.title, 120), date: x.date || '', time: x.date && validTime(x.time) ? x.time : '', status: STATUS[x.status] ? x.status : 'open', area: areaKey(x.area), notes: str(x.notes, 200), sample: !!x.sample }; });
  s.events = list(d.events).filter(function (x) { return x && validDate(x.date) && str(x.title, 100); }).map(function (x) {
    return { id: str(x.id, 64) || uid(), title: str(x.title, 100), date: x.date, time: validTime(x.time) ? x.time : '', area: areaKey(x.area), big: !!x.big, sample: !!x.sample }; });
  s.journey = list(d.journey).filter(function (x) { return x && validDate(x.date) && str(x.what, 200); }).map(function (x) {
    return { id: str(x.id, 64) || uid(), date: x.date, type: str(x.type, 20) || 'Note', area: areaKey(x.area), what: str(x.what, 200), why: str(x.why, 200), sample: !!x.sample }; });
  s.links = list(d.links, 40).map(function (x) { return x && { id: str(x.id, 64) || uid(), label: str(x.label, 40), url: safeUrl(x.url), desc: str(x.desc, 60), area: areaKey(x.area), sample: !!x.sample }; })
    .filter(function (x) { return x && x.label && x.url; });
  s.meta = { created: (d.meta && str(d.meta.created, 40)) || new Date().toISOString(), lastBackup: (d.meta && str(d.meta.lastBackup, 40)) || null, example: !!(d.meta && d.meta.example), template: (d.meta && str(d.meta.template, 32)) || '', templateName: (d.meta && str(d.meta.templateName, 40)) || '', setup: setupAnswers(d.meta && d.meta.setup) };
  return s;
}

/* ------------------------------------------------------------------ theme */
function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme() {
  if (prefs.theme) root.setAttribute('data-theme', prefs.theme); else root.removeAttribute('data-theme');
  var dark = isDark();
  var tb = $('#theme'); tb.textContent = ''; tb.append(icon(dark ? 'sun' : 'moon'), h('span', { class: 'tl', text: dark ? ' Light' : ' Dark' })); tb.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  root.setAttribute('data-scheme', prefs.scheme); root.setAttribute('data-layout', prefs.layout);
  if (window.MyHQLook) window.MyHQLook.sync();   // ETL Badge + tab icon follow scheme/theme (look.js holds the mapping)
  var bg = getComputedStyle(root).getPropertyValue('--bg').trim();     // browser bar color follows the scheme (an attribute, not a style)
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', bg); });
}
function setLook(k, v) { prefs[k] = v; putPrefs().catch(function () {}); if (state) render(); else applyTheme(); }
$('#theme').addEventListener('click', function () { prefs.theme = isDark() ? 'light' : 'dark'; applyTheme(); putPrefs().catch(function () {}); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ------------------------------------------------------------------ derived lists */
function dlTime(x) { return parseLocal(x.date, x.time || '23:59'); }
function todoWhen(x) { return x.date ? parseLocal(x.date, x.time || '00:00') : null; }
function todoState(x, now, today) {
  if (x.status === 'done') return 'done';
  if (!x.date) return 'nodate';
  var d = parseLocal(x.date, '00:00');
  if (d < today || (x.time && todoWhen(x) < now)) return 'overdue';
  if (+d === +today) return 'today';
  return 'later';
}
function kindOf(x, now, today) { var s = todoState(x, now, today); return x.status === 'done' ? 'done' : s === 'overdue' ? 'overdue' : x.status; }
function todoLabel(x) { if (!x.date) return 'No date'; var d = todoWhen(x); return fmtDay(d) + (x.time ? ', ' + fmtTime(d) : ''); }
function sortTodos(a, b) { var A = todoWhen(a), B = todoWhen(b); if (!A && !B) return 0; if (!A) return 1; if (!B) return -1; return A - B; }

/* ------------------------------------------------------------------ countdowns */
function fmtLeft(ms, long) {
  if (ms <= 0) return 'passed';
  var s = Math.floor(ms / 1e3), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return long ? (d ? d + 'd ' : '') + pad(hh) + ':' + pad(m) + ':' + pad(x) : (d ? d + 'd ' + hh + 'h' : hh + 'h ' + pad(m) + 'm ' + pad(x) + 's');
}
var tickers = [];
function tick() {
  var n = Date.now();
  tickers.forEach(function (t) {
    var ms = t.at - n;
    t.num.textContent = fmtLeft(ms, t.long);
    t.el.classList.toggle('past', ms <= 0);
    if (!t.long) t.el.classList.toggle('urgent', ms > 0 && ms < 2592e5);
  });
}
setInterval(tick, 1000);

/* ------------------------------------------------------------------ render */
function render() {
  tickers = [];
  var main = $('#main'); main.textContent = '';
  applyTheme();
  var on = !!state;
  $('#fab').hidden = !on; $('#settings').hidden = !on;
  $('#title').textContent = on ? state.settings.title : APP_NAME;
  $('#sub').textContent = on ? (state.settings.subtitle || fmtLong(new Date())) : 'On this device only';
  document.title = on ? state.settings.title : APP_FULL_NAME;
  $('#foot-meta').textContent = APP_FULL_NAME + ' v' + APP_VERSION + ' · stored only in this browser on this device · works offline after the first visit';
  document.body.classList.toggle('is-first', !on);
  if (!on) { main.append(firstRun()); return; }
  var now = new Date(), today = startOfToday();
  if (hasSamples()) main.append(sampleBanner());
  main.append(hero(now), grid(now, today));
  tick();
}

function heroBoard() {   // decorative mini-preview of a board, built from the app's own UI pieces (hidden from screen readers)
  var bar = function (w) { return h('i', { class: 'hb-bar hb-w' + w }); };
  var cd = function (tone, num) { return h('div', { class: 'hb-cd a' + tone }, bar(70), h('b', { text: num }), bar(45)); };
  var days = 'MTWTFSS'.split('').map(function (d, i) {
    return h('div', { class: 'hb-day' + (i === 0 ? ' now' : '') }, h('span', { text: d }), h('i', { class: 'hb-dot a' + (i % 3 + 1) }), i % 2 ? null : h('i', { class: 'hb-dot a' + ((i + 2) % 5 + 2) }));
  });
  return h('div', { class: 'hb', 'aria-hidden': 'true' },
    h('div', { class: 'hb-panel' },
      h('div', { class: 'hb-top' },
        h('div', { class: 'hb-next' }, h('span', { class: 'hb-lbl', text: 'Next big deadline' }), bar(80), h('b', { text: '3d 10h' })),
        h('div', { class: 'hb-cds' }, cd(1, '6d'), cd(4, '11d'))),
      h('div', { class: 'hb-week' }, days)),
    h('div', { class: 'hb-chip' }, h('span', { class: 'hb-chk' }, icon('check')), h('span', { class: 'hb-chip-tx' }, bar(90), bar(55))));
}
function stamp() {
  return h('div', { class: 'myhq-stamp myhq-stamp--animate', role: 'img', 'aria-label': STAMP_ALT },
    h('img', { class: 'stamp-onlight', src: 'brand/stamp.svg', alt: '', width: 250, height: 252 }),
    h('img', { class: 'stamp-ondark', src: 'brand/stamp-dark.svg', alt: '', width: 250, height: 252 }));
}
function firstRun() {
  var picks = h('div', { class: 'tpls', role: 'list', 'aria-label': 'Starter templates' }, h('p', { class: 'ro', text: 'Loading templates…' }));
  var sec = h('section', { class: 'card first', 'aria-labelledby': 'fr-h' },
    h('div', { class: 'fr-hero-wrap' }, h('div', { class: 'fr-hero' },
      h('div', { class: 'fr-copy' },
        h('p', { class: 'fr-kicker', text: APP_FULL_NAME }),
        h('h2', { id: 'fr-h', text: 'Your week on one page. Saved on this device.' }),
        h('p', { class: 'fr-lede', text: 'One page for your deadlines, this week, to-dos, calendar, milestones and links.' }),
        h('p', { class: 'privacy' }, icon('lock', 'pv-ic'), h('span', { text: 'No account, no tracking: what you type stays on your device, and ET Labs never sees it.' })),
        h('p', { class: 'fr-note', id: 'fr-note', text: 'Nothing leaves your device unless you choose to send it.' }),
        h('div', { class: 'btnrow fr-acts' },
          h('button', { class: 'btn primary fr-blank', type: 'button', id: 'start-blank', onclick: function () { start(blankState()); } }, 'Start blank', icon('arrow', 'btn-ic'))),
        h('p', { class: 'alt' }, 'Have a backup file? ', h('button', { class: 'btn ghost', type: 'button', id: 'restore-first', onclick: pickRestore }, 'Restore from file'))),
      heroBoard()), stamp()),
    h('div', { class: 'fr-starters' },
      h('div', { class: 'fr-sh' }, h('h3', { text: 'Pick a starter' }), h('p', { text: 'Pick a starter to see it filled in with sample items, or start blank.' })),
      picks,
      h('p', { class: 'ro', text: 'Sample items are marked so you can remove them in one tap later. Your own items stay.' })));
  loadTemplates().then(function (ts) {
    picks.textContent = '';
    if (!ts.length) { picks.append(h('p', { class: 'ro', text: 'No starter templates found. Start blank instead.' })); return; }
    ts.forEach(function (t, i) {
      var id = String(t.id || '').replace(/[^a-z0-9-]/g, ''), n = sampleCount(t);
      picks.append(h('button', { class: 'tpl ' + tplTone(id, i), type: 'button', role: 'listitem', id: 'tpl-' + id, 'data-template': id,
        onclick: function () { var s = stateFromTemplate(t); s.meta.templateName = str(t.name, 40); start(s); } },
        h('span', { class: 'tpl-ic', 'aria-hidden': 'true' }, icon(ICONS[id] ? id : 'other')),
        h('span', { class: 'tpl-tx' }, h('b', { text: str(t.name, 40) }), h('span', { class: 'tpl-blurb', text: str(t.blurb, 90) }),
          n ? h('span', { class: 'tpl-n', text: n + (n === 1 ? ' sample item' : ' sample items') }) : null),
        h('span', { class: 'tpl-go', 'aria-hidden': 'true' }, icon('arrow'))));
    });
    picks.append(setupCard(), suggestCard());
    loadSetupFlow().catch(function () {});   // fetch the questions now, so answering them makes no requests
  }, function () { picks.textContent = ''; picks.append(h('p', { class: 'ro', text: 'Starter templates need a connection the first time. Start blank, or try again when you are online.' }), setupCard(), suggestCard()); });
  return sec;
}
function suggestCard() {   // last card on the picker: works offline; the suggester itself never sends anything
  return h('button', { class: 'tpl tpl-suggest a-other', type: 'button', role: 'listitem', id: 'tpl-suggest', onclick: suggestDialog },
    h('span', { class: 'tpl-ic', 'aria-hidden': 'true' }, icon('other')),
    h('span', { class: 'tpl-tx' }, h('b', { text: 'Don\u2019t see a format you like? Tell us' }), h('span', { class: 'tpl-blurb', text: 'Describe what you keep track of and get a suggested format. Works offline.' })),
    h('span', { class: 'tpl-go', 'aria-hidden': 'true' }, icon('arrow')));
}
function sampleBanner() {
  return h('div', { class: 'sample-bar', role: 'status' },
    h('span', { text: 'You are looking at sample items' + (templateName() ? ' from the ' + templateName() + ' starter' : '') + '. Edit them, add your own, or clear them when you are ready.' }),
    h('button', { class: 'btn', type: 'button', id: 'remove-samples', onclick: removeSamples }, 'Remove sample items'));
}
function start(s) {
  state = s;
  put(KEYS).then(function () { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); render(); })
    .catch(function (e) { alert('Could not save on this device: ' + e.message); });
}

function hero(now) {
  var up = state.deadlines.slice().sort(function (a, b) { return dlTime(a) - dlTime(b); });
  var next = up.filter(function (x) { return dlTime(x) > now; })[0];
  var nb;
  if (next) {
    var t = dlTime(next), big = h('div', { class: 'big' }, '…');
    nb = h('button', { class: 'next', type: 'button', 'aria-label': 'Edit deadline: ' + next.title, onclick: function () { deadlineForm(next); } },
      h('div', { class: 'lbl', text: 'Next big deadline' }), h('h2', { text: next.title }), big,
      h('div', { class: 's', text: fmtLong(t) + ', ' + fmtTime(t) + (TZ ? ' ' + TZ : '') + (next.note ? ' · ' + next.note : '') }));
    tickers.push({ el: nb, num: big, at: +t, long: true });
  } else {
    nb = h('section', { class: 'next none' }, h('div', { class: 'lbl', text: 'Next big deadline' }), h('h2', { text: 'Nothing coming up' }),
      h('div', { class: 's', text: 'Tap + to add a deadline and it will count down here.' }));
  }
  var cards = up.map(function (x) {
    var t = dlTime(x), num = h('div', { class: 'cd-num', 'aria-live': 'off' }, '');
    var el = h('button', { class: 'cd ' + slotClass(x.area) + (next && x.id === next.id ? ' dup' : ''), type: 'button', 'aria-label': 'Edit deadline: ' + x.title, onclick: function () { deadlineForm(x); } },
      h('span', { class: 'cd-top' }, h('span', { class: 'cd-name', text: x.title }), x.tag ? h('span', { class: 'tag', text: x.tag }) : null), num,
      h('span', { class: 'cd-sub' }, h('span', { class: 'cd-when', text: fmtDay(t) + ', ' + fmtTime(t) }), TZ ? h('span', { class: 'cd-tz', text: ' ' + TZ }) : null, x.note ? h('span', { class: 'cd-desc', text: ' · ' + x.note }) : null));
    tickers.push({ el: el, num: num, at: +t, long: false });
    return el;
  });
  var shown = cards.filter(function (c) { return !c.classList.contains('dup'); });
  if (shown.length % 2 && shown.length) shown[shown.length - 1].classList.add('odd-last');
  var cds = h('div', { class: 'cds' }, cards.length ? cards : h('p', { class: 'empty', text: 'No deadlines yet.' }));
  return h('div', { class: 'hero' }, nb, cds);
}

function todoRow(x, now, today, cls) {
  var st = todoState(x, now, today);
  var c = h('button', { class: 'chk', type: 'button', role: 'checkbox', 'aria-checked': x.status === 'done' ? 'true' : 'false', 'aria-label': 'Done: ' + x.title,
    onclick: function () { x.status = x.status === 'done' ? 'open' : 'done'; put(['todos']).then(render); } });
  return h('li', { class: (cls || '') + (st === 'overdue' ? ' od' : '') + (x.status === 'done' ? ' dn' : '') }, c,
    h('button', { class: 'itm', type: 'button', 'aria-label': 'Edit to-do: ' + x.title, onclick: function () { todoForm(x); } }, dot(x.area),
      h('div', null, h('span', { class: 'tt', text: x.title }), h('span', { class: 'meta', text: todoLabel(x) + ' · ' + STATUS[x.status] + ' · ' + areaLabel(x.area) }),
        x.notes ? h('span', { class: 'note', text: x.notes.length > 150 ? x.notes.slice(0, 150) + '…' : x.notes }) : null)));
}

function grid(now, today) {
  var g = h('div', { class: 'grid' });
  /* this week: Monday to Sunday of the current week, the same week the Week layout opens on */
  var wkStart = addDays(today, -((today.getDay() + 6) % 7)), wkEnd = addDays(wkStart, 6);
  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = addDays(wkStart, i), key = ymd(d), items = [], isT = +d === +today;
    state.events.forEach(function (e) { if (e.date === key) items.push({ at: parseLocal(e.date, e.time || '00:00'), tm: e.time ? fmtTime(parseLocal(e.date, e.time)) : 'All day', t: e.title, a: e.area, big: e.big }); });
    state.todos.forEach(function (x) { if (x.date === key && x.status !== 'done') items.push({ at: todoWhen(x), tm: x.time ? fmtTime(todoWhen(x)) : 'Any time', t: x.title, a: x.area, todo: true }); });
    items.sort(function (a, b) { return a.at - b.at; });
    days.push(h('div', { class: 'day' + (isT ? ' today' : '') + (d < today ? ' past' : ''), role: 'listitem', 'aria-current': isT ? 'date' : null }, h('h3', null, relDay(d), h('small', { text: fmtMD(d) })),
      h('ul', null, items.length ? items.map(function (it) {
        return h('li', { class: it.big ? 'big' : '' }, dot(it.a), h('span', { class: 'tm', text: it.tm }), h('span', { class: 'tt' }, it.t, it.todo ? [' ', h('em', { text: 'to-do' })] : null));
      }) : h('li', { class: 'empty', text: 'Nothing scheduled' }))));
  }
  var L = prefs.layout;
  if (L === 'week') g.append(weekPlanner(now, today));
  else if (L === 'cards') g.append(tilesBoard(now, today));
  else g.append(h('section', { class: 'card c12 wk-card' }, h('h2', null, 'This week ', h('small', { text: fmtMD(wkStart) + ' to ' + fmtMD(wkEnd) + ' · calendar plus dated to-dos' })),
    h('div', { class: 'week', role: 'list', 'aria-label': 'Monday to Sunday' }, days), h('p', { class: 'swipe', text: 'Swipe for the rest of the week →' })));
  if (L !== 'week' && L !== 'cards') setTimeout(function () {   // phones swipe through the days: start on today, not Monday
    var wk = g.querySelector('.week'), t = wk && wk.querySelector('.day.today');
    if (t && wk.scrollWidth > wk.clientWidth) wk.scrollLeft += t.getBoundingClientRect().left - wk.getBoundingClientRect().left - 14;
  });

  /* needs you */
  var open = state.todos.filter(function (x) { return x.status !== 'done'; }).sort(sortTodos);
  var od = open.filter(function (x) { return todoState(x, now, today) === 'overdue'; });
  var td = open.filter(function (x) { return todoState(x, now, today) === 'today'; });
  var wt = open.filter(function (x) { return x.status === 'waiting' && todoState(x, now, today) !== 'overdue'; });
  var ul = function (arr, cls, empty) { return h('ul', { class: 'todo' }, arr.length ? arr.map(function (x) { return todoRow(x, now, today, cls); }) : h('li', { class: 'empty', text: empty })); };
  if (L !== 'cards') g.append(h('section', { class: 'card c5 needs' }, h('h2', null, 'Needs you ', h('small', { text: od.length + ' overdue · ' + td.length + ' today · ' + wt.length + ' waiting' })),
    h('h3', { class: 'sub-h bad', text: 'Overdue' }), ul(od, '', 'Nothing overdue'),
    h('h3', { class: 'sub-h warn', text: 'Due today' }), ul(td, '', 'Nothing else today'),
    h('details', { class: 'more' }, h('summary', null, 'Waiting on your OK or decision ', h('b', { text: String(wt.length) })), ul(wt, '', 'Nothing waiting'))));

  /* to-dos: bars by area + full list */
  var KINDS = [['overdue', 'Overdue'], ['waiting', 'Waiting on you'], ['open', 'Open'], ['planned', 'Planned / watch'], ['done', 'Done']];
  var per = {};
  state.todos.forEach(function (x) { var a = areaKey(x.area); per[a] = per[a] || {}; var k = kindOf(x, now, today); per[a][k] = (per[a][k] || 0) + 1; });
  var tot = function (a) { var n = 0; for (var k in per[a]) n += per[a][k]; return n; };
  var bars = Object.keys(per).sort(function (a, b) { return tot(b) - tot(a); }).map(function (a) {
    var T = tot(a), done = per[a].done || 0, w = per[a].waiting || 0;
    return h('div', { class: 'bar-row' }, h('div', { class: 'bar-lab' }, dot(a), areaLabel(a), h('span', { text: (T - done) + ' open' + (w ? ' · ' + w + ' waiting on you' : '') + (done ? ' · ' + done + ' done' : '') })),
      h('div', { class: 'bar' }, KINDS.filter(function (k) { return per[a][k[0]]; }).map(function (k) {
        return h('i', { class: 'seg k-' + k[0], style: { '--w': (100 * per[a][k[0]] / T).toFixed(1) + '%' }, title: k[1] + ': ' + per[a][k[0]] }); })));
  });
  var done = state.todos.filter(function (x) { return x.status === 'done'; });
  if (L !== 'cards') g.append(h('section', { class: 'card c7 todos-card' }, h('h2', null, 'To-dos ', h('small', { text: open.length + ' open of ' + state.todos.length + ' · tap one to edit' })),
    bars.length ? bars : h('p', { class: 'empty', text: 'No to-dos yet. Tap + to add one.' }),
    bars.length ? h('div', { class: 'klegend' }, KINDS.map(function (k) { return h('span', null, h('i', { class: 'sw k-' + k[0] }), k[1]); })) : null,
    open.length ? h('details', { class: 'more', open: true }, h('summary', null, 'All open to-dos ', h('b', { text: String(open.length) })), ul(open, '', '')) : null,
    done.length ? h('details', { class: 'more' }, h('summary', null, 'Done ', h('b', { text: String(done.length) })), ul(done, '', '')) : null));

  /* calendar */
  var winEnd = addDays(today, 45), evs = state.events.filter(function (e) { var d = parseLocal(e.date, '00:00'); return d >= today && d <= winEnd; })
    .sort(function (a, b) { return parseLocal(a.date, a.time || '00:00') - parseLocal(b.date, b.time || '00:00'); });
  var byDay = {}; evs.forEach(function (e) { (byDay[e.date] = byDay[e.date] || []).push(e); });
  var months = [], m = new Date(today.getFullYear(), today.getMonth(), 1);
  while (m <= winEnd) {
    var cells = 'MTWTFSS'.split('').map(function (c) { return h('div', { class: 'mh', text: c }); });
    for (var p = 0; p < (m.getDay() + 6) % 7; p++) cells.push(h('div', { class: 'mc pad' }));
    for (var dd = new Date(m); dd.getMonth() === m.getMonth(); dd = addDays(dd, 1)) {
      var k2 = ymd(dd), list2 = byDay[k2] || [];
      cells.push(h('div', { class: 'mc' + (dd < today || dd > winEnd ? ' out' : '') + (+dd === +today ? ' now' : '') + (list2.some(function (e) { return e.big; }) ? ' bigday' : ''), title: list2.map(function (e) { return e.title; }).join('; ') || null },
        h('span', { text: String(dd.getDate()) }), h('div', { class: 'dots' }, list2.slice(0, 6).map(function (e) { return dot(e.area); }))));
    }
    months.push(h('div', { class: 'month' }, h('h3', { text: m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }), h('div', { class: 'mgrid' }, cells)));
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  var weeks = [], cur = null;
  evs.forEach(function (e) {
    var d = parseLocal(e.date, '00:00'), wk = addDays(d, -((d.getDay() + 6) % 7));
    if (!cur || +cur.wk !== +wk) { cur = { wk: wk, items: [] }; weeks.push(cur); }
    cur.items.push(e);
  });
  var agenda = weeks.map(function (w) {
    var s = w.wk < today ? today : w.wk;
    return h('details', { class: 'wk', open: w.wk <= addDays(today, 7) }, h('summary', null, (w.wk <= today ? 'This week · ' : 'Week of ') + fmtMD(s) + '–' + fmtMD(addDays(w.wk, 6)) + ' ', h('b', { text: String(w.items.length) })),
      h('ul', { class: 'agenda' }, w.items.map(function (e) {
        var d = parseLocal(e.date, e.time || '00:00');
        return h('li', { class: e.big ? 'big' : '', 'data-area': areaKey(e.area) }, dot(e.area), h('span', { class: 'ad', text: d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.getDate() }),
          h('span', { class: 'tm', text: e.time ? fmtTime(d) : 'All day' }), h('span', { class: 'tt', text: e.title }));
      })));
  });
  var used = Object.keys(areaMap()).filter(function (k) { return evs.some(function (e) { return areaKey(e.area) === k; }); });
  var legend = h('div', { class: 'legend' }, used.map(function (k) {
    var b = h('button', { class: 'lg', type: 'button', 'aria-pressed': 'true' }, dot(k), areaLabel(k));
    b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on));
      document.querySelectorAll('.agenda li[data-area="' + k + '"]').forEach(function (li) { li.classList.toggle('hide', !on); }); });
    return b;
  }));
  g.append(h('section', { class: 'card c12 cal-card' }, h('h2', null, 'Calendar ', h('small', { text: fmtMD(today) + ' to ' + fmtMD(winEnd) + ' · ' + evs.length + ' events · tap an area to filter the list' })),
    legend, h('div', { class: 'months' }, months), agenda.length ? agenda : h('p', { class: 'empty', text: 'No events in the next 45 days.' }),
    h('p', { class: 'ro', text: 'Events are read-only in this preview. Restore a backup file to change them.' })));

  /* journey */
  var js = state.journey.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var jitem = function (x) {
    return h('li', { class: slotClass(x.area) }, h('div', { class: 'jd', text: fmtMD(parseLocal(x.date, '00:00')) }),
      h('div', { class: 'jb' }, h('div', { class: 'jt' }, h('span', { class: 'type', text: x.type }), h('span', { class: 'ja', text: areaLabel(x.area) })), h('p', { text: x.what }), x.why ? h('p', { class: 'why', text: x.why }) : null));
  };
  var cnt = function (t) { return js.filter(function (x) { return x.type === t; }).length; };
  g.append(h('section', { class: 'card c7 j-card' }, h('h2', null, 'Journey ', h('small', { text: js.length + ' entries · ' + cnt('Launch') + ' launches · ' + cnt('Decision') + ' decisions · ' + cnt('Milestone') + ' milestones' })),
    js.length ? h('ol', { class: 'tl' }, js.slice(0, 8).map(jitem)) : h('p', { class: 'empty', text: 'No milestones yet.' }),
    js.length > 8 ? h('details', { class: 'more' }, h('summary', null, 'Earlier milestones ', h('b', { text: String(js.length - 8) })), h('ol', { class: 'tl' }, js.slice(8).map(jitem))) : null,
    h('p', { class: 'ro', text: 'Journey entries are read-only in this preview.' })));

  /* your data */
  var lb = state.meta.lastBackup ? new Date(state.meta.lastBackup) : null;
  var stale = !lb || (Date.now() - lb) > 14 * 864e5;
  g.append(h('section', { class: 'card c5 data-card' }, h('h2', null, 'Your data ', h('small', { text: 'stored only on this device' })),
    h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('b', { text: String(state.deadlines.length) }), h('span', { text: 'deadlines' })),
      h('div', { class: 'stat' }, h('b', { text: String(open.length) }), h('span', { text: 'open to-dos' })),
      h('div', { class: 'stat' }, h('b', { text: String(state.events.length) }), h('span', { text: 'events' }))),
    h('div', { class: 'backup' }, h('button', { class: 'btn primary', type: 'button', id: 'export', onclick: exportBackup }, 'Export backup'),
      h('p', { text: 'Backups save as a file on your device. Delete the app without one, and your data is gone.' })),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', id: 'restore', onclick: pickRestore }, 'Restore from file')),
    h('p', { class: stale ? 'remind' : 'ro', text: lb ? 'Last backup: ' + fmtDay(lb) + ', ' + fmtTime(lb) + (stale ? '. It has been over 14 days, so it is a good time for a fresh one.' : '') : 'No backup yet. Export one so you can move to a new phone.' })));

  /* links */
  g.append(h('section', { class: 'card c12 links-card' }, h('h2', { text: 'Sites & quick links' }),
    state.links.length ? h('div', { class: 'links' }, state.links.map(function (l) {
      var u = safeUrl(l.url);
      return h(u ? 'a' : 'div', { class: 'site ' + slotClass(l.area), href: u || null, target: u ? '_blank' : null, rel: u ? 'noopener noreferrer' : null, referrerpolicy: 'no-referrer' },
        h('b', { text: l.label }), h('span', { text: l.desc }));
    })) : h('p', { class: 'empty', text: 'No links yet.' }),
    h('p', { class: 'ro', text: 'Links are read-only in this preview. ' + APP_NAME + ' never loads previews or icons for them.' })));
  return g;
}


/* ------------------------------------------------------------------ Week layout: Mon–Sun planner (spec §3b; week starts Monday, like the month grid) */
var weekOffset = 0;   // not saved: the app always opens on the current week
function weekPlanner(now, today) {
  var s = addDays(today, -((today.getDay() + 6) % 7) + 7 * weekOffset), e = addDays(s, 6), cur = weekOffset === 0, any = false;
  var range = fmtMD(s) + '–' + (s.getMonth() === e.getMonth() ? e.getDate() : fmtMD(e));
  var go = function (n, cls) { return function () { if (n === 0 && !weekOffset) return; weekOffset = n === 0 ? 0 : weekOffset + n; render(); var b = $('.' + cls); if (b) b.focus(); }; };
  var nav = h('div', { class: 'wk-nav', role: 'group', 'aria-label': 'Change week' },
    h('button', { class: 'btn wk-prev', type: 'button', 'aria-label': 'Previous week', onclick: go(-1, 'wk-prev') }, '‹', h('span', { class: 'lbl-sm', text: ' Prev' })),
    h('button', { class: 'btn wk-now', type: 'button', 'aria-disabled': cur ? 'true' : 'false', onclick: go(0, 'wk-now') }, 'This week'),
    h('button', { class: 'btn wk-next', type: 'button', 'aria-label': 'Next week', onclick: go(1, 'wk-next') }, h('span', { class: 'lbl-sm', text: 'Next ' }), '›'));
  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = addDays(s, i), key = ymd(d), items = [];
    state.events.forEach(function (ev) { if (ev.date === key) items.push({ ev: ev, at: ev.time ? parseLocal(key, ev.time) : null }); });
    state.todos.forEach(function (x) { if (x.date === key && x.status !== 'done') items.push({ td: x, at: x.time ? parseLocal(key, x.time) : null }); });
    items.sort(function (a, b) { if (!a.at && !b.at) return 0; if (!a.at) return -1; if (!b.at) return 1; return a.at - b.at; });
    if (items.length) any = true;
    var isT = +d === +today;
    days.push(h('li', { class: 'wd' + (isT ? ' today' : '') + (d < today ? ' past' : ''), 'aria-current': isT ? 'date' : null },
      h('h3', null, h('span', { class: 'wdn', text: d.toLocaleDateString('en-US', { weekday: 'short' }) }), h('span', { class: 'dn', text: String(d.getDate()) }), isT ? h('span', { class: 'today-badge', text: 'Today' }) : null),
      items.length ? h('ul', { class: 'wk-items' }, items.map(function (it) { return weekItem(it, now, today); })) : h('p', { class: 'empty', text: 'Nothing scheduled' })));
  }
  var tray = state.todos.filter(function (x) { return x.status !== 'done' && !x.date; });
  return h('section', { class: 'card c12 wkp-card', 'aria-labelledby': 'wk-h' },
    h('div', { class: 'card-h wk' }, h('h2', { id: 'wk-h', 'aria-live': 'polite', text: 'Week of ' + range }), nav),
    any ? null : h('p', { class: 'empty', text: 'Nothing this week. Tap + to add a to-do with a date.' }),
    h('ol', { class: 'wk-days', 'aria-label': 'Days, Monday to Sunday' }, days),
    tray.length ? h('section', { class: 'tray', 'aria-labelledby': 'tray-h' }, h('h3', { id: 'tray-h', text: 'No date · ' + tray.length }),
      h('ul', null, tray.map(function (x) { return weekItem({ td: x }, now, today); }))) : null);
}
function todoChips(x, st, first) {
  return h('span', { class: 'chips' }, h('span', { class: 'chip', text: first }), x.status === 'waiting' ? h('span', { class: 'chip', text: 'Waiting on you' }) : null,
    st === 'overdue' ? h('span', { class: 'chip a5', text: 'Overdue' }) : null);
}
function weekItem(it, now, today) {
  if (it.ev) { var e = it.ev; return h('li', null, h('div', { class: 'it ev ' + slotClass(e.area) + (e.big ? ' big' : '') }, h('span', { class: 'tm', text: e.time ? fmtTime(parseLocal(e.date, e.time)) : 'All day' }), h('span', { class: 'tt', text: e.title }))); }
  var x = it.td, st = todoState(x, now, today);
  return h('li', null, h('button', { class: 'it ' + slotClass(x.area), type: 'button', 'aria-label': 'Edit to-do: ' + x.title, onclick: function () { todoForm(x); } },
    h('span', { class: 'tm', text: !x.date ? 'No date' : x.time ? fmtTime(todoWhen(x)) : 'Any time' }), h('span', { class: 'tt', text: x.title }), todoChips(x, st, 'to-do')));
}

/* ------------------------------------------------------------------ Cards layout: every open item as a tile (spec §3c) */
function tilesBoard(now, today) {
  var winEnd = addDays(today, 45), wk = addDays(today, 7), G = { od: [], td: [], nx: [], lt: [], nd: [] };
  state.todos.forEach(function (x) {
    if (x.status === 'done') return;
    var st = todoState(x, now, today);
    if (st === 'overdue') G.od.push({ td: x, at: todoWhen(x) });
    else if (st === 'nodate') G.nd.push({ td: x, at: null });
    else { var d = parseLocal(x.date, '00:00'); (st === 'today' ? G.td : d <= wk ? G.nx : G.lt).push({ td: x, at: todoWhen(x) }); }
  });
  state.events.forEach(function (e) { var d = parseLocal(e.date, '00:00'); if (d < today || d > winEnd) return; (+d === +today ? G.td : d <= wk ? G.nx : G.lt).push({ ev: e, at: parseLocal(e.date, e.time || '00:00') }); });
  var tile = function (it) {
    if (it.ev) { var e = it.ev, d = parseLocal(e.date, e.time || '00:00');
      return h('li', null, h('div', { class: 'tile ' + slotClass(e.area) + (e.big ? ' big' : '') }, h('span', { class: 'row' }, h('span', { class: 'chip', text: 'Event' })),
        h('span', { class: 'tt', text: e.title }), h('span', { class: 'wh', text: fmtDay(d) + (e.time ? ', ' + fmtTime(d) : '') + ' · ' + areaLabel(e.area) }))); }
    var x = it.td, st = todoState(x, now, today);
    return h('li', null, h('button', { class: 'tile ' + slotClass(x.area) + (st === 'overdue' ? ' od' : ''), type: 'button', 'aria-label': 'Edit to-do: ' + x.title, onclick: function () { todoForm(x); } },
      todoChips(x, st, 'To-do'), h('span', { class: 'tt', text: x.title }), h('span', { class: 'wh', text: todoLabel(x) + ' · ' + areaLabel(x.area) })));
  };
  var byAt = function (a, b) { if (!a.at && !b.at) return 0; if (!a.at) return 1; if (!b.at) return -1; return a.at - b.at; };
  var total = 0, groups = [['od', 'Overdue'], ['td', 'Today'], ['nx', 'Next 7 days'], ['lt', 'Later'], ['nd', 'No date']].map(function (g) {
    var arr = G[g[0]].sort(byAt); if (!arr.length) return null; total += arr.length;
    var hid = 'grp-' + g[0], first = g[0] === 'lt' ? arr.slice(0, 8) : arr, rest = g[0] === 'lt' ? arr.slice(8) : [];
    return h('section', { class: 'grp' + (g[0] === 'od' ? ' od' : ''), 'aria-labelledby': hid }, h('h3', { id: hid }, g[1], h('span', { class: 'cnt', text: String(arr.length) })),
      h('ul', { class: 'tiles' }, first.map(tile)),
      rest.length ? h('details', null, h('summary', null, 'Show all (' + arr.length + ')'), h('ul', { class: 'tiles' }, rest.map(tile))) : null);
  });
  var done = state.todos.filter(function (x) { return x.status === 'done'; });
  return h('section', { class: 'card c12 tiles-card', 'aria-labelledby': 'tiles-h' },
    h('div', { class: 'card-h' }, h('h2', { id: 'tiles-h', text: 'Everything open' }), h('small', { text: total + ' items · to-dos and the next 45 days of events' })),
    total ? groups : h('p', { class: 'empty', text: 'Nothing open. Tap + to add a deadline or to-do.' }),
    done.length ? h('details', null, h('summary', null, 'Done (' + done.length + ')'), h('ul', { class: 'tiles' }, done.map(function (x) { return tile({ td: x }); }))) : null);
}

/* ------------------------------------------------------------------ Settings: Look (layout + colors), applied and saved at once */
function lookFields() {
  var lay = h('fieldset', { class: 'look look-layout' }, h('legend', { text: 'Layout' }), LAYOUTS.map(function (l) {
    var r = h('input', { type: 'radio', name: 'layout', value: l[0], id: 'layout-' + l[0], checked: prefs.layout === l[0] });
    r.addEventListener('change', function () { if (r.checked) setLook('layout', l[0]); });
    return h('label', { class: 'look-opt' }, r, h('span', { class: 'look-tx' }, h('b', { text: l[1] }), h('small', { text: l[2] })));
  }));
  var sch = h('fieldset', { class: 'look look-scheme' }, h('legend', { text: 'Colors' }), h('div', { class: 'swatches' }, SCHEMES.map(function (c) {
    var r = h('input', { type: 'radio', name: 'scheme', value: c[0], id: 'scheme-' + c[0], class: 'sw-in', checked: prefs.scheme === c[0] });
    r.addEventListener('change', function () { if (r.checked) setLook('scheme', c[0]); });
    return h('label', { class: 'sw-opt' }, r, h('span', { class: 'swatch', 'data-scheme': c[0], 'aria-hidden': 'true' }, h('i', { class: 'sw-c' }), h('i', { class: 'sw-d1' }), h('i', { class: 'sw-d2' })), h('span', { class: 'sw-name', text: c[1] }));
  })));
  return [lay, sch];
}

/* ------------------------------------------------------------------ "Tell us": local format suggester. Offline, no AI, makes no requests.
   The description is only read from the text box when you tap Suggest; it is never saved (not in IndexedDB, not in
   localStorage) and is cleared when the dialog closes. "Send as a suggestion" opens the user's own email app with only the suggested sections,
   layout and colors (see mailBlock); nothing is sent unless they send it there themselves. */
var SUGGEST_RULES = [
  { k: /\b(kids?|children|child|sons?|daughters?|school|soccer|dance|practice|pick-?ups?|drop-?offs?|carpools?|co-?parents?|custody|handoffs?|family)\b/g, areas: ['Kids', 'School', 'Activities', 'Home'], layout: 'week', scheme: 'clay' },
  { k: /\b(homeschool\w*|lessons?|co-?op|curriculum|field trips?|reading)\b/g, areas: ['Lessons', 'Co-op', 'Field trips', 'Reading'], layout: 'week', scheme: 'fern' },
  { k: /\b(jobs?|interviews?|applications?|apply|applying|resumes?|recruiters?|hiring|career)\b/g, areas: ['Applications', 'Interviews', 'Follow-ups', 'Networking'], layout: 'cards', scheme: 'harbor' },
  { k: /\b(class(es)?|exams?|tests?|homework|assignments?|semester|college|university|study|studying|midterms?|finals?)\b/g, areas: ['Classes', 'Exams', 'Assignments', 'Study'], layout: 'week', scheme: 'harbor' },
  { k: /\b(military|transition\w*|certifications?|mentors?|networking)\b/g, areas: ['Resume & profile', 'Networking', 'Certifications', 'Interviews'], layout: 'list', scheme: 'ink' },
  { k: /\b(clients?|customers?|projects?|freelanc\w*|business|shop|studio|orders?)\b/g, areas: ['Clients', 'Projects', 'Growth', 'Admin'], layout: 'cards', scheme: 'paper' },
  { k: /\b(house|home|chores?|meals?|groceries|cleaning|garden\w*|laundry|errands?)\b/g, areas: ['Home', 'Meals', 'Errands'], layout: 'list', scheme: 'clay' },
  { k: /\b(gym|workouts?|running|fitness|training|habits?|sleep)\b/g, areas: ['Fitness', 'Habits'], layout: 'week', scheme: 'fern' },
  { k: /\b(volunteer\w*|church|clubs?|community|meetings?)\b/g, areas: ['Community', 'Meetings'], layout: 'list', scheme: 'paper' },
  { k: /\b(writing|books?|blog|podcast|music|art|photo\w*|hobby|hobbies|side projects?)\b/g, areas: ['Creative', 'Ideas'], layout: 'cards', scheme: 'paper' },
  { k: /\b(trips?|travel|vacation|moving|wedding|party|parties)\b/g, areas: ['Plans', 'Bookings'], layout: 'list', scheme: 'harbor' }
];
function suggestFormat(text) {
  var t = String(text || '').toLowerCase().slice(0, 600);
  var scored = SUGGEST_RULES.map(function (r, i) { var m = t.match(r.k); return { r: r, n: m ? m.length : 0, i: i }; })
    .filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n || a.i - b.i; });
  if (!scored.length) return { areas: ['Work', 'Home', 'Personal', 'Admin'], layout: 'list', scheme: 'paper', general: true };
  var areas = [];
  scored.forEach(function (x) { x.r.areas.forEach(function (a) { if (areas.indexOf(a) < 0 && areas.length < 6) areas.push(a); }); });
  return { areas: areas, layout: scored[0].r.layout, scheme: scored[0].r.scheme, general: false };
}
function suggestionAreas(names) {
  var used = {};
  return names.map(function (n, i) {
    var key = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'area';
    while (used[key] || key === 'other') key = (key + '-x').slice(0, 24); used[key] = 1;
    return { key: key, label: n, c: PAPER_SLOTS[i % 6], d: DARK_SLOTS[i % 6] };
  });
}
function labelOf(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i][0] === id) return arr[i][1]; return id; }
function suggestDialog() {
  var ta = h('textarea', { name: 'describe', id: 'sg-text', rows: 4, maxlength: 600, autocomplete: 'off', spellcheck: 'false' });
  var out = h('div', { class: 'sg-out', id: 'sg-out', 'aria-live': 'polite' });
  var f = h('form', { novalidate: true, class: 'sg-form' }, h('h2', { id: 'dlg-title', text: 'Tell us what you need' }),
    h('label', { class: 'fld' }, h('span', { text: 'Describe your life or what you need to keep track of' }), ta),
    h('p', { class: 'ro', text: 'What you type stays in this window. It is not saved and never sent.' }),
    h('div', { class: 'acts' }, h('button', { class: 'btn primary', type: 'submit', id: 'sg-go' }, 'Suggest a format'), h('button', { class: 'btn', type: 'button', onclick: closeDialog }, 'Cancel')), out);
  f.addEventListener('submit', function (e) { e.preventDefault(); showSuggestion(out, suggestFormat(ta.value)); });
  openDialog(f);
}
function showSuggestion(out, sg) {
  out.textContent = '';
  out.append(h('div', { class: 'sg-res', id: 'sg-res' },
    h('h3', { text: sg.general ? 'A general format to start with' : 'Suggested format' }),
    h('dl', null, h('dt', { text: 'Sections' }), h('dd', null, h('span', { class: 'chips' }, sg.areas.map(function (a, i) { return h('span', { class: 'chip a' + (i % 6 + 1), text: a }); }))),
      h('dt', { text: 'Layout' }), h('dd', { id: 'sg-layout', text: labelOf(LAYOUTS, sg.layout) }),
      h('dt', { text: 'Colors' }), h('dd', { id: 'sg-scheme', text: labelOf(SCHEMES, sg.scheme) })),
    h('div', { class: 'btnrow' },
      h('button', { class: 'btn primary', type: 'button', id: 'sg-use', onclick: function () {
        var s = blankState(); s.areas = suggestionAreas(sg.areas); s.meta.template = 'suggested';
        prefs.layout = sg.layout; prefs.scheme = sg.scheme; putPrefs().catch(function () {});
        closeDialog(); start(s); } }, 'Use this format')),
    mailBlock(sg)));
}
/* "Send as a suggestion": opens the user's OWN email app with a pre-filled message (mailto: is a navigation, not a request).
   Only the suggested section names, layout and colors go in it: never the typed description, no identifiers, no device info.
   Nothing is sent unless the user sends it from their email app. Address set 10/17 (temporary; see README). */
var SUGGEST_TO = 'etlabs.app@gmail.com';
function suggestionEmail(sg) {
  var subject = 'MyHQ format suggestion';
  var body = 'Suggested MyHQ format\n\nSections: ' + sg.areas.join(', ') + '\nLayout: ' + labelOf(LAYOUTS, sg.layout) + '\nColors: ' + labelOf(SCHEMES, sg.scheme) + '\n';
  return { to: SUGGEST_TO, subject: subject, body: body,
    href: 'mailto:' + SUGGEST_TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n')) };
}
function mailBlock(sg) {
  var m = suggestionEmail(sg);
  return h('div', { class: 'sg-sent', id: 'sg-sent' },
    h('h4', { text: 'Suggest this format' }),
    h('p', { class: 'note', id: 'sg-note', text: 'This opens your email app with your suggestion filled in. You choose whether to send it.' }),
    h('pre', { id: 'sg-payload', text: 'To: ' + m.to + '\nSubject: ' + m.subject + '\n\n' + m.body }),
    h('p', { class: 'ro', text: 'Only the section names, layout and colors. Never what you typed.' }),
    h('a', { class: 'btn', id: 'sg-send', href: m.href }, 'Send as a suggestion'));
}

/* ------------------------------------------------------------------ Setup questions (Engineering note 10/17, option c + optional a)
   Main path: a rule-based question flow driven by templates/setup-flow.json (a few KB, same-origin, cached for offline).
   Works in every browser, offline, no CSP change, no model shipped. Choices map to sections, layout, colors and a few
   sample to-dos; the choices (ids only) are saved with the board. The optional "Anything else?" words are matched here,
   stay in the dialog and are never saved or sent.
   Optional extra: Chrome's built-in Prompt API (LanguageModel), only when LanguageModel.availability() says
   'available' (never triggers a model download), only after a tap, on this page (not a worker), never on phones,
   same JSON format, strictly validated, time-limited and cancellable. It can only change the suggestion; it never
   blocks "Create my MyHQ". Its input and output stay on this device. */
var setupP = null;
function loadSetupFlow() {
  if (!setupP) {
    setupP = getTemplateJson('setup-flow').then(function (f) { if (!f || f.format !== 1 || !Array.isArray(f.questions)) throw new Error('bad setup flow'); return f; });
    setupP.catch(function () { setupP = null; });
  }
  return setupP;
}
var LAYOUT_IDS = ['list', 'week', 'cards'], SCHEME_IDS = ['paper', 'harbor', 'fern', 'clay', 'ink'];
function clampIn(n) { n = Math.round(Number(n) || 0); return Math.max(0, Math.min(30, n)); }
function tagSections(flow, text) {
  var words = String(text || '').toLowerCase().slice(0, 80).split(/[^a-z0-9]+/).filter(Boolean), out = [];
  list(flow.tags, 40).forEach(function (r) { if (r && list(r.words, 20).some(function (w) { return words.indexOf(String(w)) >= 0; }) && out.indexOf(r.section) < 0) out.push(r.section); });
  return out;
}
function setupResult(flow, ans) {
  var max = Math.min(6, Number(flow.maxSections) || 6), maxItems = Math.min(12, Number(flow.maxItems) || 8);
  var who = (flow.who || {})[ans.who] || null;
  var tracks = list(ans.track, 3).map(function (id) { return Object.prototype.hasOwnProperty.call(flow.tracks || {}, id) ? flow.tracks[id] : null; }).filter(Boolean);
  var secs = [];
  function addSec(n) { n = str(n, 24); if (n && secs.indexOf(n) < 0 && secs.length < max) secs.push(n); }
  tracks.forEach(function (t) { list(t.sections, 6).forEach(addSec); });
  tagSections(flow, ans.tags).forEach(addSec);
  if (who) addSec(who.section);
  var general = !tracks.length && !secs.length;
  if (!secs.length) list(flow.fallback && flow.fallback.sections, 6).forEach(addSec);
  var first = tracks[0] || who || flow.fallback || {};
  var items = [];
  tracks.forEach(function (t) { list(t.items, 6).forEach(function (it) { if (it && secs.indexOf(it.section) >= 0 && items.length < maxItems) items.push({ title: str(it.title, 80), section: it.section, in: clampIn(it.in) }); }); });
  return { title: who ? str(who.title, 32) : APP_NAME, sections: secs,
    layout: LAYOUT_IDS.indexOf(ans.layout) >= 0 ? ans.layout : (LAYOUT_IDS.indexOf(first.layout) >= 0 ? first.layout : 'list'),
    scheme: SCHEME_IDS.indexOf(ans.scheme) >= 0 ? ans.scheme : (SCHEME_IDS.indexOf(first.scheme) >= 0 ? first.scheme : 'paper'),
    items: items, general: general };
}
// the one JSON format both paths produce; AI output must pass this or it is ignored
function validSetup(o, base) {
  if (!o || typeof o !== 'object') return null;
  var secs = [];
  list(o.sections, 6).forEach(function (n) { n = str(n, 24); if (n && secs.indexOf(n) < 0) secs.push(n); });
  if (!secs.length) return null;
  var items = [];
  list(o.items, 12).forEach(function (it) { if (!it || typeof it !== 'object') return; var t = str(it.title, 80), sec = str(it.section, 24); if (t && secs.indexOf(sec) >= 0 && items.length < 8) items.push({ title: t, section: sec, in: clampIn(it.in) }); });
  return { title: base.title, sections: secs, layout: LAYOUT_IDS.indexOf(o.layout) >= 0 ? o.layout : base.layout,
    scheme: SCHEME_IDS.indexOf(o.scheme) >= 0 ? o.scheme : base.scheme, items: items, general: false };
}
function setupAnswers(a) {   // choices only (ids), as saved with the board; never the typed words
  if (!a || typeof a !== 'object') return null;
  var id = function (v) { v = String(v || ''); return /^[a-z]{1,12}$/.test(v) ? v : ''; };
  return { who: id(a.who), track: list(a.track, 3).map(id).filter(Boolean), layout: id(a.layout), scheme: id(a.scheme), ai: !!a.ai };
}
function stateFromSetup(r, ans) {
  var areas = suggestionAreas(r.sections), keyOf = {};
  areas.forEach(function (a) { keyOf[a.label] = a.key; });
  var s = stateFromTemplate({ id: 'setup', title: r.title, subtitle: 'Set up with a few questions', areas: areas,
    todos: r.items.map(function (it) { return { title: it.title, area: keyOf[it.section], in: it.in, status: 'open' }; }) });
  s.meta.templateName = '';
  s.meta.setup = setupAnswers({ who: ans.who, track: ans.track, layout: ans.layout, scheme: ans.scheme, ai: !!r.ai });
  return s;
}
/* optional on-device AI (Prompt API). Desktop Chrome only in practice; phones never get it. */
var AI_LANG = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
var SETUP_SCHEMA = { type: 'object', additionalProperties: false, required: ['sections', 'layout', 'scheme', 'items'], properties: {
  sections: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', maxLength: 24 } },
  layout: { type: 'string', enum: LAYOUT_IDS }, scheme: { type: 'string', enum: SCHEME_IDS },
  items: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['title', 'section', 'in'], properties: {
    title: { type: 'string', maxLength: 80 }, section: { type: 'string', maxLength: 24 }, in: { type: 'integer', minimum: 0, maximum: 30 } } } } } };
function isPhone() {
  var ua = navigator.userAgent || '';
  return !!(navigator.userAgentData && navigator.userAgentData.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
function aiApi() { try { return (typeof LanguageModel !== 'undefined' && LanguageModel && typeof LanguageModel.availability === 'function' && typeof LanguageModel.create === 'function') ? LanguageModel : null; } catch (e) { return null; } }
function timeLimit(p, ms, onLate) { var t; return Promise.race([p, new Promise(function (_, rej) { t = setTimeout(function () { if (onLate) onLate(); rej(new Error('timed out')); }, ms); })]).then(function (v) { clearTimeout(t); return v; }, function (e) { clearTimeout(t); throw e; }); }
function aiAvailable() {   // 'available' only: we never start a model download
  var api = aiApi();
  if (!api || isPhone()) return Promise.resolve(false);
  return timeLimit(Promise.resolve().then(function () { return api.availability(AI_LANG); }), 3000).then(function (a) { return a === 'available'; }, function () { return false; });
}
function aiPolish(base, ans, flow, ctl) {   // called only from a tap
  var api = aiApi(), session = null;
  var label = function (qid, id) { var q = flow.questions.filter(function (x) { return x.id === qid; })[0], o = q && list(q.options, 20).filter(function (x) { return x.id === id; })[0]; return o ? o.label : ''; };
  var prompt = 'You help set up a simple one-page weekly planner. Improve the starter below for this person. ' +
    'Keep 3 to 6 short section names (max 24 characters each), pick a layout and colors, and suggest up to 8 short, generic first to-dos ' +
    '(no names, no money, no health details), each in one of the sections, due in 0 to 30 days. Reply with JSON only.\n' +
    'Who it is for: ' + label('who', ans.who) + '\nWants to track: ' + list(ans.track, 3).map(function (t) { return label('track', t); }).join(', ') +
    '\nOther words they typed: ' + str(ans.tags, 80) + '\nStarter: ' + JSON.stringify({ sections: base.sections, layout: base.layout, scheme: base.scheme, items: base.items });
  return timeLimit(api.create(Object.assign({ signal: ctl.signal }, AI_LANG)), 20000, function () { ctl.abort(); })
    .then(function (s) { session = s; return timeLimit(s.prompt(prompt, { responseConstraint: SETUP_SCHEMA, signal: ctl.signal }), 45000, function () { ctl.abort(); }); })
    .then(function (txt) { var r = validSetup(JSON.parse(String(txt)), base); if (!r) throw new Error('unusable answer'); r.ai = true; return r; })
    .then(function (r) { if (session) session.destroy(); return r; }, function (e) { if (session) try { session.destroy(); } catch (x) {} throw e; });
}
function setupCard() {
  return h('button', { class: 'tpl tpl-setup a-other', type: 'button', role: 'listitem', id: 'tpl-setup', onclick: setupDialog },
    h('span', { class: 'tpl-ic', 'aria-hidden': 'true' }, icon('check')),
    h('span', { class: 'tpl-tx' }, h('b', { text: 'Not sure? Answer a few questions' }), h('span', { class: 'tpl-blurb', text: 'Five quick choices pick your sections, layout and colors. Works offline.' })),
    h('span', { class: 'tpl-go', 'aria-hidden': 'true' }, icon('arrow')));
}
var aiCtl = null;
function setupDialog() {
  loadSetupFlow().then(function (flow) { runSetup(flow); }, function () {
    openDialog([h('h2', { id: 'dlg-title', text: 'Set up with a few questions' }),
      h('p', { text: 'The questions need one visit with a connection first. Start blank or pick a starter instead.' }),
      h('div', { class: 'acts' }, h('button', { class: 'btn primary', type: 'button', onclick: closeDialog }, 'OK'))]);
  });
}
function runSetup(flow) {
  var qs = flow.questions.slice(0, 6), ans = { track: [] };
  function step(i) {
    var q = qs[i], err = errBox(), body;
    if (q.type === 'tags') {
      body = h('label', { class: 'fld' }, h('span', { text: q.text }), h('input', { type: 'text', name: 'tags', id: 'setup-tags', maxlength: Math.min(80, Number(q.maxlength) || 80), autocomplete: 'off', spellcheck: 'false', value: ans.tags || '' }), q.hint ? h('small', { class: 'hint', text: q.hint }) : null);
    } else {
      var many = q.type === 'many', max = Math.min(9, Number(q.max) || 3);
      var boxes = list(q.options, 12).map(function (o) {
        var on = many ? ans.track.indexOf(o.id) >= 0 : ans[q.id] === o.id;
        return h('label', { class: 'look-opt setup-opt' }, h('input', { type: many ? 'checkbox' : 'radio', name: q.id, value: o.id, id: 'q-' + q.id + '-' + o.id, checked: on }), h('span', null, h('b', { text: o.label })));
      });
      body = h('fieldset', { class: 'look setup-q' }, h('legend', { text: q.text }), q.hint ? h('p', { class: 'hint', text: q.hint }) : null, boxes);
      if (many) {
        var cap = function () { var ins = body.querySelectorAll('input'), n = body.querySelectorAll('input:checked').length; ins.forEach(function (x) { x.disabled = !x.checked && n >= max; }); };
        body.addEventListener('change', cap); setTimeout(cap);
      }
    }
    var f = h('form', { novalidate: true, class: 'setup-form' },
      h('p', { class: 'setup-prog', id: 'setup-prog', 'aria-live': 'polite', text: 'Question ' + (i + 1) + ' of ' + qs.length }),
      h('h2', { id: 'dlg-title', text: 'Set up with a few questions' }), body, err,
      h('div', { class: 'acts' }, h('button', { class: 'btn primary', type: 'submit', id: 'setup-next' }, i + 1 < qs.length ? 'Next' : 'See my setup'),
        i ? h('button', { class: 'btn', type: 'button', id: 'setup-back', onclick: function () { step(i - 1); } }, 'Back') : null,
        h('button', { class: 'btn', type: 'button', onclick: closeDialog }, 'Cancel')));
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (q.type === 'tags') ans.tags = str(f.querySelector('#setup-tags').value, 80);
      else if (q.type === 'many') { ans.track = [].map.call(f.querySelectorAll('input:checked'), function (x) { return x.value; }).slice(0, max); if (!ans.track.length) { err.textContent = 'Pick at least one.'; return; } }
      else { var c = f.querySelector('input:checked'); if (!c) { err.textContent = 'Pick one.'; return; } ans[q.id] = c.value; }
      if (i + 1 < qs.length) step(i + 1); else result(setupResult(flow, ans), setupResult(flow, ans));
    });
    openDialog(f);
  }
  function result(r, rule) {
    var out = h('div', { class: 'sg-res setup-res', id: 'setup-res' },
      h('h3', { text: r.ai ? 'Your setup, polished on this device' : 'Your setup' }),
      h('dl', null, h('dt', { text: 'Sections' }), h('dd', null, h('span', { class: 'chips', id: 'setup-secs' }, r.sections.map(function (a, k) { return h('span', { class: 'chip a' + (k % 6 + 1), text: a }); }))),
        h('dt', { text: 'Layout' }), h('dd', { id: 'setup-layout', text: labelOf(LAYOUTS, r.layout) }),
        h('dt', { text: 'Colors' }), h('dd', { id: 'setup-scheme', text: labelOf(SCHEMES, r.scheme) }),
        h('dt', { text: 'First to-dos' }), h('dd', null, r.items.length ? h('ul', { class: 'setup-items', id: 'setup-items' }, r.items.map(function (it) { return h('li', { text: it.title }); })) : h('span', { text: 'None yet' }))),
      r.ai ? h('p', { class: 'ro', id: 'setup-ai-note', text: 'Suggested by the AI built into this browser. It ran on this device; nothing was sent.' }) : null);
    var ai = h('div', { class: 'setup-ai', id: 'setup-ai', 'aria-live': 'polite' });
    var f = h('div', { class: 'setup-form' }, h('h2', { id: 'dlg-title', text: 'Your MyHQ' }), out,
      h('div', { class: 'acts' },
        h('button', { class: 'btn primary', type: 'button', id: 'setup-create', onclick: function () {
          if (aiCtl) aiCtl.abort();
          var s = stateFromSetup(r, ans); prefs.layout = r.layout; prefs.scheme = r.scheme; putPrefs().catch(function () {});
          closeDialog(); start(s); } }, 'Create my MyHQ'),
        h('button', { class: 'btn', type: 'button', id: 'setup-back', onclick: function () { if (aiCtl) aiCtl.abort(); step(qs.length - 1); } }, 'Back'),
        r.ai ? h('button', { class: 'btn', type: 'button', id: 'setup-undo', onclick: function () { result(rule, rule); } }, 'Undo AI changes') : null),
      ai, h('p', { class: 'ro', text: 'Sample to-dos are marked so you can remove them in one tap later.' }));
    openDialog(f);
    if (r.ai) return;
    aiAvailable().then(function (ok) {   // a bonus only: shown when the browser already has its model ready
      if (!ok || !ai.isConnected) return;
      var go = h('button', { class: 'btn', type: 'button', id: 'setup-ai-go' }, 'Polish with on-device AI');
      ai.append(go, h('p', { class: 'ro', text: 'Optional. Uses the AI built into this browser; it runs on this device and nothing you type is sent.' }));
      go.addEventListener('click', function () {
        aiCtl = new AbortController(); var me = aiCtl;
        ai.textContent = '';
        ai.append(h('p', { id: 'setup-ai-status', text: 'Working on this device…' }), h('button', { class: 'btn', type: 'button', id: 'setup-ai-cancel', onclick: function () { me.abort(); } }, 'Cancel'));
        aiPolish(rule, ans, flow, me).then(function (p) { if (aiCtl === me) aiCtl = null; if (ai.isConnected && !me.signal.aborted) result(p, rule); },
          function () { if (aiCtl === me) aiCtl = null; if (!ai.isConnected) return; ai.textContent = ''; ai.append(h('p', { id: 'setup-ai-status', text: me.signal.aborted ? 'Stopped. Your setup is unchanged.' : 'The on-device AI didn\u2019t work this time. Your setup is unchanged.' })); });
      });
    });
  }
  step(0);
}

/* ------------------------------------------------------------------ dialogs */
var dlg = $('#dlg');
function openDialog(nodes) { dlg.textContent = ''; add(dlg, nodes); if (!dlg.open) dlg.showModal(); var f = dlg.querySelector('input,select,textarea,button'); if (f) f.focus(); }
function closeDialog() { if (dlg.open) dlg.close(); }
dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDialog(); });
dlg.addEventListener('close', function () { if (aiCtl) aiCtl.abort(); if (dlg.querySelector('#sg-text, .setup-form')) dlg.textContent = ''; });   // drop the typed description with the dialog
function fld(label, input, hint) { return h('label', { class: 'fld' }, h('span', null, label, hint ? h('small', { text: ' ' + hint }) : null), input); }
function areaSelect(v) { return h('select', { name: 'area' }, state.areas.concat([{ key: 'other', label: 'Other' }]).map(function (a) { return h('option', { value: a.key, selected: a.key === v }, a.label); })); }
function errBox() { return h('p', { class: 'err', role: 'alert', 'aria-live': 'assertive' }); }
function form(title, fields, onSave, onDelete) {
  var err = errBox();
  var f = h('form', { novalidate: true }, h('h2', { id: 'dlg-title', text: title }), fields, err,
    h('div', { class: 'acts' }, h('button', { class: 'btn primary', type: 'submit', id: 'save' }, 'Save'), h('button', { class: 'btn', type: 'button', onclick: closeDialog }, 'Cancel'),
      h('span', { class: 'sp' }), onDelete ? h('button', { class: 'btn danger', type: 'button', id: 'delete', onclick: onDelete }, 'Delete') : null));
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    f.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var msg = onSave(f);
    if (msg) { err.textContent = msg[0]; if (msg[1]) { var bad = f.elements[msg[1]]; if (bad) { bad.setAttribute('aria-invalid', 'true'); bad.focus(); } } }
  });
  return f;
}
function chooser() {
  openDialog([h('h2', { id: 'dlg-title', text: 'Add to your ' + APP_NAME }), h('div', { class: 'choose' },
    h('button', { class: 'btn', type: 'button', id: 'add-deadline', onclick: function () { deadlineForm(null); } }, '⏱ New deadline (counts down)'),
    h('button', { class: 'btn', type: 'button', id: 'add-todo', onclick: function () { todoForm(null); } }, '✓ New to-do'),
    h('button', { class: 'btn', type: 'button', onclick: closeDialog }, 'Cancel')),
    h('p', { class: 'ro', text: 'Events, journey entries and links come in a later version.' })]);
}
$('#fab').addEventListener('click', chooser);

function deadlineForm(x) {
  var v = x || { title: '', note: '', date: ymd(addDays(startOfToday(), 7)), time: '17:00', area: state.areas[0] ? state.areas[0].key : 'other', tag: '' };
  openDialog(form(x ? 'Edit deadline' : 'New deadline', [
    fld('What is due', h('input', { name: 'title', value: v.title, maxlength: 80, required: true, autocomplete: 'off' })),
    h('div', { class: 'row2' }, fld('Date', h('input', { name: 'date', type: 'date', value: v.date, required: true, min: '2000-01-01', max: '2100-12-31' })),
      fld('Time', h('input', { name: 'time', type: 'time', value: v.time }), '(your local time' + (TZ ? ', ' + TZ : '') + ')')),
    fld('Note', h('input', { name: 'note', value: v.note, maxlength: 140, autocomplete: 'off' }), '(optional)'),
    h('div', { class: 'row2' }, fld('Area', areaSelect(v.area)), fld('Tag', h('input', { name: 'tag', value: v.tag, maxlength: 24, autocomplete: 'off', placeholder: 'e.g. soft' }), '(optional)'))
  ], function (f) {
    var title = str(f.elements.title.value, 80), date = f.elements.date.value, time = f.elements.time.value;
    if (!title) return ['Give the deadline a name.', 'title'];
    if (!validDate(date)) return ['Enter a real date between 2000 and 2100.', 'date'];
    if (time && !validTime(time)) return ['Enter a time like 5:00 PM, or leave it blank for end of day.', 'time'];
    var rec = x || { id: uid() };
    rec.title = title; rec.date = date; rec.time = time || ''; rec.note = str(f.elements.note.value, 140); rec.area = areaKey(f.elements.area.value); rec.tag = str(f.elements.tag.value, 24);
    if (!x) state.deadlines.push(rec);
    put(['deadlines']).then(function () { closeDialog(); render(); });
  }, x ? function () { if (confirm('Delete "' + x.title + '"?')) { state.deadlines = state.deadlines.filter(function (y) { return y.id !== x.id; }); put(['deadlines']).then(function () { closeDialog(); render(); }); } } : null));
}

function todoForm(x) {
  var v = x || { title: '', date: '', time: '', status: 'open', area: state.areas[0] ? state.areas[0].key : 'other', notes: '' };
  openDialog(form(x ? 'Edit to-do' : 'New to-do', [
    fld('To-do', h('input', { name: 'title', value: v.title, maxlength: 120, required: true, autocomplete: 'off' })),
    h('div', { class: 'row2' }, fld('Due date', h('input', { name: 'date', type: 'date', value: v.date, min: '2000-01-01', max: '2100-12-31' }), '(optional)'),
      fld('Time', h('input', { name: 'time', type: 'time', value: v.time }), '(optional)')),
    h('div', { class: 'row2' }, fld('Status', h('select', { name: 'status' }, Object.keys(STATUS).map(function (k) { return h('option', { value: k, selected: k === v.status }, STATUS[k]); }))), fld('Area', areaSelect(v.area))),
    fld('Notes', h('textarea', { name: 'notes', maxlength: 200, rows: 2 }, v.notes), '(optional)')
  ], function (f) {
    var title = str(f.elements.title.value, 120), date = f.elements.date.value, time = f.elements.time.value;
    if (!title) return ['Write what needs doing.', 'title'];
    if (date && !validDate(date)) return ['Enter a real date between 2000 and 2100, or leave it blank.', 'date'];
    if (time && !date) return ['Add a due date for that time, or clear the time.', 'date'];
    if (time && !validTime(time)) return ['Enter a time like 3:30 PM, or leave it blank.', 'time'];
    var rec = x || { id: uid() };
    rec.title = title; rec.date = date || ''; rec.time = time || ''; rec.status = STATUS[f.elements.status.value] ? f.elements.status.value : 'open';
    rec.area = areaKey(f.elements.area.value); rec.notes = str(f.elements.notes.value, 200);
    if (!x) state.todos.push(rec);
    put(['todos']).then(function () { closeDialog(); render(); });
  }, x ? function () { if (confirm('Delete "' + x.title + '"?')) { state.todos = state.todos.filter(function (y) { return y.id !== x.id; }); put(['todos']).then(function () { closeDialog(); render(); }); } } : null));
}

function nameField(v) {
  var cnt = h('small', { class: 'count', id: 'name-count', 'aria-live': 'polite' });
  var inp = h('input', { name: 'title', value: v, maxlength: NAME_MAX, autocomplete: 'off', 'aria-describedby': 'name-count' });
  var upd = function () { var n = inp.value.length; cnt.hidden = n < NAME_COUNT_FROM; cnt.textContent = n + ' / ' + NAME_MAX; };
  inp.addEventListener('input', upd); upd();
  return h('label', { class: 'fld' }, h('span', null, 'Name of your ' + APP_NAME), inp, cnt);
}
function settingsForm() {
  openDialog([form('Settings', [
    lookFields(),
    nameField(state.settings.title),
    fld('Line under the name', h('input', { name: 'subtitle', value: state.settings.subtitle, maxlength: 80, autocomplete: 'off' }), '(optional)')
  ], function (f) {
    var t = str(f.elements.title.value, NAME_MAX);
    if (!t) return ['Give your ' + APP_NAME + ' a name.', 'title'];
    state.settings = { title: t, subtitle: str(f.elements.subtitle.value, 80), sampleSubtitle: state.settings.sampleSubtitle || '' };
    put(['settings']).then(function () { closeDialog(); render(); });
  }), h('div', { class: 'danger-zone' }, h('div', { class: 'backup' }, h('button', { class: 'btn', type: 'button', onclick: function () { closeDialog(); exportBackup(); } }, 'Export backup'),
      h('p', { text: 'Backups save as a file on your device. Delete the app without one, and your data is gone.' })),
    hasSamples() ? h('div', { class: 'backup' }, h('button', { class: 'btn', type: 'button', id: 'remove-samples-settings', onclick: removeSamples }, 'Remove sample items'), h('p', { text: 'Takes out only the starter sample items. Your own items stay.' })) : null,
    h('p', { text: 'Clear my data removes everything ' + APP_NAME + ' stored in this browser on this device. It cannot be undone.' }),
    h('button', { class: 'btn danger', type: 'button', id: 'clear', onclick: clearData }, 'Clear my data'),
    h('p', { class: 'alt' }, h('a', { href: 'setup-guide/', id: 'host-own-settings' }, 'Host your own copy')))]);
}
$('#settings').addEventListener('click', settingsForm);

function clearData() {
  if (!confirm('Clear all ' + APP_NAME + ' data on this device? Export a backup first if you want to keep it.')) return;
  closeDialog();
  try { localStorage.removeItem(LOOK_KEY); } catch (e) {}
  wipe().then(function () { state = null; prefs = normPrefs({}); weekOffset = 0; render(); });
}

/* ------------------------------------------------------------------ backup: local file only */
function exportBackup() {
  state.meta.lastBackup = new Date().toISOString();
  var data = {}; KEYS.forEach(function (k) { data[k] = state[k]; });
  var body = JSON.stringify({ app: 'hq-template', format: 1, exported: state.meta.lastBackup, data: data }, null, 2);
  var url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  var a = h('a', { href: url, download: 'hq-backup-' + ymd(new Date()) + '.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  put(['meta']).then(render);
}
var fileIn = $('#restore-file');
function pickRestore() { fileIn.value = ''; fileIn.click(); }
fileIn.addEventListener('change', function () {
  var file = fileIn.files && fileIn.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('That file is too big to be a ' + APP_NAME + ' backup (over 2 MB).'); return; }
  var r = new FileReader();
  r.onload = function () {
    var prev = state, next;
    try { var j = JSON.parse(String(r.result)); if (!j || j.app !== 'hq-template' || !j.data) throw new Error('That file is not a ' + APP_NAME + ' backup.'); next = sanitize(j.data); }
    catch (e) { state = prev; alert('Could not restore: ' + (e instanceof SyntaxError ? 'the file is not valid JSON.' : e.message)); return; }
    state = prev;
    if (prev && !confirm('Replace everything on this device with the backup from ' + file.name + '?')) return;
    state = next; put(KEYS).then(render);
  };
  r.onerror = function () { alert('Could not read that file.'); };
  r.readAsText(file);
});

/* ------------------------------------------------------------------ home-screen + offline */
var rl = $('#reload');
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) { rl.hidden = false; rl.addEventListener('click', function () { location.reload(); }); }
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  var wantReload = false;
  navigator.serviceWorker.register('/myhq/sw.js', { scope: '/myhq/' }).then(function (reg) {
    var show = function () { $('#update').hidden = false; };
    if (reg.waiting && navigator.serviceWorker.controller) show();
    reg.addEventListener('updatefound', function () {
      var w = reg.installing; if (!w) return;
      w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) show(); });
    });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
    $('#update-btn').addEventListener('click', function () { wantReload = true; if (reg.waiting) reg.waiting.postMessage('skipWaiting'); else location.reload(); });
  }).catch(function () {});
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (wantReload) { wantReload = false; location.reload(); } });
}

/* ------------------------------------------------------------------ boot */
loadAll().then(function (o) {
  prefs = normPrefs(o.prefs); mirrorLook();
  if (o.settings) { var s = blankState(); KEYS.forEach(function (k) { if (o[k] !== undefined) s[k] = o[k]; }); state = s; }
  render();
}).catch(function () {
  $('#main').append(h('section', { class: 'card first' }, h('h2', { text: 'Storage is turned off' }),
    h('p', { text: APP_NAME + ' keeps everything in this browser. Private browsing or blocked site data stops it from saving. Open ' + APP_NAME + ' in a normal window to use it.' })));
});
(function () { var fm = $('#foot-by-mark'); if (fm) document.querySelectorAll('#by .wm-motion').forEach(function (w) { fm.append(w.cloneNode(true)); }); })();
window.__hqVersion = APP_VERSION;
$('#update span').textContent = 'A new version of ' + APP_NAME + ' is ready.';
})();

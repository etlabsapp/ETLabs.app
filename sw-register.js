/* registers /sw.js (offline fallback). Edge-state fix 2026-10-31 */
if ('serviceWorker' in navigator && location.protocol === 'https:') { addEventListener('load', function () { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); }); }

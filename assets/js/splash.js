/* ETLabs home splash: flicker wordmark ~3s, then lands in the header. Gated by the inline head script. */
(function () {
    var root = document.documentElement;
    if (!root.classList.contains('et-splash')) return;
    var target = document.querySelector('.site-header .brand-wordmark');
    if (!target) { root.classList.remove('et-splash'); return; }
    var HOLD = 3000, LAND = 600, done = false, landing = false, timer;
    var layer = document.createElement('div');
    layer.className = 'et-splash-layer';
    layer.setAttribute('aria-hidden', 'true');
    var logo = new Image();
    logo.className = 'et-splash-logo';
    logo.alt = '';
    logo.width = 1064; logo.height = 289;
    logo.src = '/assets/images/etlabs-wordmark-animated.svg';
    layer.appendChild(logo);
    document.body.appendChild(layer);
    root.classList.add('et-splash-run');
    root.classList.remove('et-splash');
    try { sessionStorage.setItem('etSplashSeen', '1'); } catch (e) {}

    function cleanup() {
        if (done) return; done = true;
        root.classList.remove('et-splash-run');
        layer.remove();
        ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.removeEventListener(t, skip, true); });
    }
    function land(fast) {
        if (landing) return; landing = true; clearTimeout(timer);
        var s = logo.getBoundingClientRect(), t = target.getBoundingClientRect();
        if (fast) layer.classList.add('is-fast');
        layer.classList.add('is-landing');
        var k = t.width / s.width;
        logo.style.transform = 'translate(' + (t.left - s.left) + 'px,' + (t.top - s.top) + 'px) scale(' + k + ')';
        setTimeout(cleanup, (fast ? 220 : LAND) + 40);
    }
    function skip() { land(true); }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.addEventListener(t, skip, true); });
    timer = setTimeout(function () { land(false); }, HOLD);
})();

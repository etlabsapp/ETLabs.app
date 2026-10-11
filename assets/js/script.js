const toggle = document.querySelector('.mobile-toggle');
const menu = document.querySelector('.site-nav');
const productsTrigger = document.getElementById('products-dropdown-trigger');
const productsDropdown = document.querySelector('.nav-dropdown');
function setMenu(open) {
  if (!toggle || !menu) return;
  menu.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}
function setProducts(open) {
  if (!productsTrigger || !productsDropdown) return;
  productsDropdown.classList.toggle('is-open', open);
  productsTrigger.setAttribute('aria-expanded', String(open));
}
if (toggle && menu) {
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => {setMenu(false); setProducts(false);}));
}
if (productsTrigger) productsTrigger.addEventListener('click', () => setProducts(productsTrigger.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (productsTrigger?.getAttribute('aria-expanded') === 'true') {setProducts(false); productsTrigger.focus();}
  else if (toggle?.getAttribute('aria-expanded') === 'true') {setMenu(false); toggle.focus();}
});
document.addEventListener('click', e => {
  if (!productsDropdown?.contains(e.target)) setProducts(false);
  if (menu && !menu.contains(e.target) && !toggle?.contains(e.target)) setMenu(false);
});
const mobileLayout = matchMedia('(max-width: 980px)');
mobileLayout.addEventListener('change', () => {setMenu(false);setProducts(false);});

/** Scroll reveal animations. */
function setupRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && reveals.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    reveals.forEach((item) => observer.observe(item));
  } else {
    reveals.forEach((item) => item.classList.add('is-visible'));
  }
}

setupRevealAnimations();

// --- Logo battery-jitter: on-load, idle easter egg, hover ---
(function () {
    const logoImg = document.querySelector('.brand-mark .logo-etl');
    if (!logoImg) return;

    function playJitter() {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (logoImg.classList.contains('logo-jitter')) return;
        logoImg.classList.add('logo-jitter');
        setTimeout(function () {
            logoImg.classList.remove('logo-jitter');
        }, 650); // 580ms animation + buffer
    }

    // 1. On load — fire once after page settles
    window.addEventListener('load', function () {
        setTimeout(playJitter, 1400);
    });

    // 2. Idle easter egg — fire after 45s of no user activity
    let idleTimer;
    function resetIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(playJitter, 45000);
    }
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function (evt) {
        document.addEventListener(evt, resetIdle, { passive: true });
    });
    resetIdle();

    // 3. Hover
    logoImg.addEventListener('mouseenter', playJitter);
})();

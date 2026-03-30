const toggle = document.querySelector('.mobile-toggle');
const menu = document.querySelector('.site-nav');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  menu.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Products dropdown
const productsTrigger = document.getElementById('products-dropdown-trigger');
const productsDropdown = document.querySelector('.nav-dropdown');

if (productsTrigger && productsDropdown) {
  productsTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = productsDropdown.classList.toggle('is-open');
    productsTrigger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', () => {
    productsDropdown.classList.remove('is-open');
    productsTrigger.setAttribute('aria-expanded', 'false');
  });

  productsDropdown.addEventListener('click', (e) => e.stopPropagation());
}

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

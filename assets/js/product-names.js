/* =====================================================================
   PRODUCT NAME + SLUG SWAP POINT  (PRODUCT-NAME-SWAP)
   The MyHQ name (and its /myhq URL) are still being checked by Legal.
   This constant is the one place they are defined. With JavaScript on,
   it fills every [data-product-name], [data-product-alt] and
   [data-product-link] element. The HTML also carries the literal values
   as a no-JS fallback, and the page file is named after the slug, so
   rename with:  scripts/rename-myhq.sh "Short" "Full name" [slug]
   It updates this file, the fallbacks, the hrefs and moves the page file.
   See docs/myhq-preview-notes.md.
   ===================================================================== */
(function () {
  var MYHQ_NAME = {
    short: 'MyHQ',            // product card title
    full: 'MyHQ by ETLabs',   // product page name (first mention)
    slug: 'myhq'              // page URL: /myhq  (file: myhq.html)
  };
  document.querySelectorAll('[data-product-name="myhq"]').forEach(function (el) {
    var form = el.getAttribute('data-name-form') === 'short' ? 'short' : 'full';
    el.textContent = MYHQ_NAME[form];
  });
  document.querySelectorAll('[data-product-alt="myhq"]').forEach(function (el) {
    el.setAttribute('alt', MYHQ_NAME.short + ' on a phone, showing deadlines, this week and to-dos on one page.');
  });
  document.querySelectorAll('[data-product-link="myhq"]').forEach(function (el) {
    el.setAttribute('href', '/' + MYHQ_NAME.slug);
  });
  if (document.body && document.body.hasAttribute('data-product-title')) {
    document.title = document.title.replace(/^.*?(?= \| ET Labs$)/, MYHQ_NAME.full);
  }
})();

/* =====================================================================
   PRODUCT NAME + SLUG SWAP POINT  (PRODUCT-NAME-SWAP)
   The product name is final: "ETLabs MyHQ" (short "MyHQ", URL /myhq).
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
    full: 'ETLabs MyHQ',   // product page name (first mention)
    slug: 'myhq'              // page URL: /myhq  (file: myhq.html)
  };
  document.querySelectorAll('[data-product-name="myhq"]').forEach(function (el) {
    var form = el.getAttribute('data-name-form') === 'short' ? 'short' : 'full';
    el.textContent = MYHQ_NAME[form];
  });
  document.querySelectorAll('[data-product-alt="myhq"]').forEach(function (el) {
    var alt = el.getAttribute('alt') || '', i = alt.indexOf(' on a phone');
    if (i >= 0) el.setAttribute('alt', MYHQ_NAME.short + alt.slice(i));
  });
  document.querySelectorAll('[data-product-link="myhq"]').forEach(function (el) {
    el.setAttribute('href', '/' + MYHQ_NAME.slug + '/');
  });
  if (document.body && document.body.hasAttribute('data-product-title')) {
    document.title = document.title.replace(/^.*?(?= \| ET Labs$)/, MYHQ_NAME.full);
  }
})();

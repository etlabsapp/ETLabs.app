/* =====================================================================
   PRODUCT NAME SWAP POINT  (PRODUCT-NAME-SWAP)
   The MyHQ product name is still being checked by Legal.
   Change the two strings below to rename it everywhere it is shown
   with JavaScript on. The HTML also carries the literal names as a
   no-JS fallback; scripts/rename-myhq.sh updates this file AND those
   fallbacks in one command. See docs/myhq-preview-notes.md.
   ===================================================================== */
(function () {
  var MYHQ_NAME = {
    short: 'MyHQ',            // card label under the icon
    full: 'MyHQ by ETLabs'    // product page name
  };
  document.querySelectorAll('[data-product-name="myhq"]').forEach(function (el) {
    var form = el.getAttribute('data-name-form') === 'short' ? 'short' : 'full';
    el.textContent = MYHQ_NAME[form];
  });
  if (document.body && document.body.hasAttribute('data-product-title')) {
    document.title = document.title.replace(/^.*?(?= \| ET Labs$)/, MYHQ_NAME.full);
  }
})();

# MyHQ preview: PR notes (local branch preview/myhq-2026-10-17)

From `live-snapshot-2026-10-17` (b166c25, Travis's live code). Not pushed.

## Files
- `myhq.html`: the product page, served at **/myhq** (root `*.html` pages are served at clean URLs by
  the Workers asset layer's default html_handling, same as /products and /philosophy; /myhq.html 301s to /myhq).
  `noindex, nofollow`; not in sitemap.xml.
- `products.html`: MyHQ card (icon, "Preview", title, tagline; Open the preview → templates.hq-template.pages.dev, Learn more → /myhq).
- `index.html`: MyHQ card with an "Example data" board screenshot linking to /myhq.
- `assets/images/hq-product/`: `hq-icon.svg` (Design product-icons-2026-10-16/hq), `board-phone.webp`
  (Design myhq-visual-1017/shots/after-board-375.png, cropped), `layout-{list,week,cards}.webp`
  (Design myhq-layouts-colors-2026-10-17/mocks/shots/shot-*-1280.png, cropped), `schemes.webp`
  (light cards from preview-schemes.png, side by side). Folder name is slug-neutral on purpose.
- `assets/js/product-names.js`: name + slug swap point. `scripts/rename-myhq.sh`: one-command rename.
- `assets/css/style.css`: MyHQ block at the end.

## Rename the product and/or slug (Legal still checking)
One constant in `assets/js/product-names.js` (`PRODUCT-NAME-SWAP`):

    var MYHQ_NAME = { short: 'MyHQ', full: 'ETLabs MyHQ', slug: 'myhq' };

Run:

    scripts/rename-myhq.sh "NewName" "ETLabs NewName" newslug   # slug optional

It updates the constant, the no-JS fallbacks (text, image alt, <title>, og:title), every `href="/myhq"`,
canonical/og:url, and moves `myhq.html` → `fieldbook.html` (git mv). Tested both ways on a throwaway copy:
round trip is byte-identical. Not renamed: internal hook ids (`data-product-name="myhq"`, CSS `.myhq-*`) and the images folder.

## Swap the icon
One file, one reference: `.product-icon--myhq` now points at `assets/images/hq-product/myhq-icon-clay.svg` (Clay ETL Badge, Oct 17); the old indigo `hq-icon.svg` is unreferenced
in style.css (`ICON-SWAP`). Same format: overwrite. Other format: change that one URL.

## Sources and what the build actually has (Oct 17)
- Starter templates: names/blurbs verbatim from `hq-for-others/app-templates/public/templates/*.json`
  (templates-preview @ d41c685, 7 starters). The live demo templates.hq-template.pages.dev still serves 4
  (business, student, transition, jobseeker; sw v0.2.0-templates-4).
- Layouts (List/Week/Cards) and 5 color schemes (Paper, Harbor, Fern, Clay, Ink): Design spec + mocks only.
  No build has a layout or scheme switcher yet (templates-preview ships schemes.css tokens, Paper only).
  The page labels both sections "Coming soon" (placeholder) and every sample visual "Example data".
- "Tell us" card links to the existing /contact page.
- Copy: Writing's myhq-card-copy.md, self-host guide, privacy line. WRITING-PLACEHOLDER comments mark new labels.

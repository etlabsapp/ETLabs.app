# MyHQ preview — PR notes (LOCAL ONLY, not pushed, not deployed)

Branch `preview/myhq-2026-10-17`, from `live-snapshot-2026-10-17` (b166c25, Travis's live code).

## What changed
- `products.html`, `index.html`: one new product card (same `card portfolio-card` markup as the others),
  before Lattice³. Icon with the short name "MyHQ" under it; primary button opens
  https://preview.hq-template.pages.dev/ (new tab), secondary button goes to `/apps/myhq/`.
- `apps/myhq/index.html`: product page (same header/footer/classes as the site).
- `apps/myhq/images/myhq-icon.svg`: current HQ icon (Design, product-icons-2026-10-16/hq/icon.svg).
- `assets/js/product-names.js`: the name swap point.
- `assets/css/style.css`: small appended block (icon rule + card/page layout).
- `scripts/rename-myhq.sh`: one-command rename.
- `sitemap.xml`: `/apps/myhq/` added (other product pages are listed there).
- Not changed: nav dropdown, footer links, products.html JSON-LD ItemList (left alone for a preview).

## How to rename the product (Legal is still checking the name)
Single swap point: `assets/js/product-names.js` (marked `PRODUCT-NAME-SWAP`):

    var MYHQ_NAME = { short: 'MyHQ', full: 'MyHQ by ETLabs' };

`short` is the card label under the icon and the card title; `full` is the product page name and title.
Every place the name shows has `data-product-name="myhq"` (+ `data-name-form="short|full"`), and the
script fills it in. The literal names are also in the HTML as the no-JS / SEO fallback, so rename with:

    scripts/rename-myhq.sh "NewName" "NewName by ETLabs"

That updates the constant and every fallback (products.html, index.html, apps/myhq/index.html,
page <title>/og:title) in one go. Manual equivalent: edit the constant, then find-replace the full name
first (`MyHQ by ETLabs`), then `>MyHQ<` (the short name is a substring of the full name).
Folder/URL `/apps/myhq/` and the CSS class names are not renamed by the script.

## How to swap the icon (final icon not picked yet)
One file, one reference. File: `apps/myhq/images/myhq-icon.svg`. The only reference is the
`.product-icon--myhq` rule at the end of `assets/css/style.css` (marked `ICON-SWAP`).
- Same format (SVG): overwrite the file, keep the name. No code edits.
- Different format (e.g. PNG): add the file and change that one URL in style.css.

## Copy
Trimmed from Writing's `self-host-guide.md` (sections 1, 3, 4, 5) and `privacy-line.md` (main + backup line).
"HQ Sheet" did not appear in the copy used. Claims checked against hq-template source
(`/workspace/hq-for-others/app`, commit afc0386 = repo etlabsapp/hq-template).

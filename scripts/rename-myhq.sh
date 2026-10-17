#!/usr/bin/env bash
# Rename the MyHQ product (and optionally its URL slug) everywhere in one step (PRODUCT-NAME-SWAP).
# Usage: scripts/rename-myhq.sh "NewShort" "NewShort by ETLabs" [new-slug]
#   e.g. scripts/rename-myhq.sh "Fieldbook" "ETLabs Fieldbook" fieldbook
# - Updates the constant in assets/js/product-names.js (short, full, slug).
# - Rewrites the literal no-JS fallbacks (text, image alt, <title>, og:title) in the HTML.
# - With a slug: moves <old-slug>.html -> <new-slug>.html (git mv if in a repo) and rewrites
#   href="/<old>" and the canonical/og:url. The data-* hook names ("myhq") stay as internal ids.
set -euo pipefail
cd "$(dirname "$0")/.."
NEW_SHORT="$1"; NEW_FULL="$2"; NEW_SLUG="${3:-}"
JS=assets/js/product-names.js
OLD_SHORT=$(sed -n "s/^ *short: '\(.*\)',.*/\1/p" "$JS")
OLD_FULL=$(sed -n "s/^ *full: '\(.*\)',.*/\1/p" "$JS")
OLD_SLUG=$(sed -n "s/^ *slug: '\(.*\)'.*/\1/p" "$JS")
[ -n "$NEW_SLUG" ] || NEW_SLUG="$OLD_SLUG"
if ! [[ "$NEW_SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then echo "Slug must be lowercase letters, digits and hyphens." >&2; exit 1; fi
PAGE="$OLD_SLUG.html"
[ -f "$PAGE" ] || { echo "Missing $PAGE" >&2; exit 1; }
if [ "$NEW_SLUG" != "$OLD_SLUG" ]; then
  [ ! -e "$NEW_SLUG.html" ] && [ ! -e "$NEW_SLUG" ] || { echo "$NEW_SLUG already exists" >&2; exit 1; }
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git mv "$PAGE" "$NEW_SLUG.html"; else mv "$PAGE" "$NEW_SLUG.html"; fi
  PAGE="$NEW_SLUG.html"
fi
python3 - "$OLD_FULL" "$NEW_FULL" "$OLD_SHORT" "$NEW_SHORT" "$OLD_SLUG" "$NEW_SLUG" "$JS" products.html index.html "$PAGE" <<'PY'
import sys, html, re
of, nf, os_, ns, osl, nsl, *files = sys.argv[1:]
q = lambda v: v.replace("\\", "\\\\").replace("'", "\\'")
for f in files:
    s = open(f, encoding='utf-8').read()
    if f.endswith('.js'):
        s = s.replace("full: '%s'" % q(of), "full: '%s'" % q(nf))
        s = s.replace("short: '%s'" % q(os_), "short: '%s'" % q(ns))
        s = s.replace("slug: '%s'" % osl, "slug: '%s'" % nsl)
        s = re.sub(r"(// page URL: /)\S+(  \(file: )\S+(\.html\))", lambda m: m.group(1) + nsl + m.group(2) + nsl + m.group(3), s)
    else:
        e = lambda v: html.escape(v, quote=True)
        s = s.replace(e(of), e(nf))
        if e(of) != of: s = s.replace(of, e(nf))
        s = s.replace('>%s<' % e(os_), '>%s<' % html.escape(ns, quote=False))
        s = s.replace('alt="%s on a phone' % e(os_), 'alt="%s on a phone' % e(ns))
        s = s.replace('href="/%s"' % osl, 'href="/%s"' % nsl)
        s = s.replace('https://etlabs.app/%s"' % osl, 'https://etlabs.app/%s"' % nsl)
    open(f, 'w', encoding='utf-8').write(s)
PY
echo "Renamed: '$OLD_SHORT' -> '$NEW_SHORT', '$OLD_FULL' -> '$NEW_FULL', /$OLD_SLUG -> /$NEW_SLUG (file $PAGE)"
FILES="$JS products.html index.html $PAGE"
if [ "$OLD_FULL" != "$NEW_FULL" ] && grep -n -- "$OLD_FULL" $FILES; then echo "WARNING: old full name still present" >&2; fi
if [ "$OLD_SLUG" != "$NEW_SLUG" ] && grep -n -- "href=\"/$OLD_SLUG\"" $FILES; then echo "WARNING: old slug href still present" >&2; fi
exit 0

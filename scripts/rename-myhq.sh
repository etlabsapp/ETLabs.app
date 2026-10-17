#!/usr/bin/env bash
# Rename the MyHQ product everywhere in one step (PRODUCT-NAME-SWAP).
# Usage: scripts/rename-myhq.sh "NewShort" "NewShort by ETLabs"
# Updates the JS constant in assets/js/product-names.js and the literal no-JS
# fallbacks in the HTML. Full name is replaced before short (short is a substring).
set -euo pipefail
cd "$(dirname "$0")/.."
NEW_SHORT="$1"; NEW_FULL="$2"
OLD_SHORT=$(sed -n "s/^ *short: '\(.*\)',.*/\1/p" assets/js/product-names.js)
OLD_FULL=$(sed -n "s/^ *full: '\(.*\)'.*/\1/p" assets/js/product-names.js)
FILES="assets/js/product-names.js products.html index.html apps/myhq/index.html"
python3 - "$OLD_FULL" "$NEW_FULL" "$OLD_SHORT" "$NEW_SHORT" $FILES <<'PY'
import sys, html
of, nf, os_, ns, *files = sys.argv[1:]
for f in files:
    s = open(f, encoding='utf-8').read()
    if f.endswith('.js'):
        s = s.replace("full: '%s'" % of, "full: '%s'" % nf.replace("'", "\\'"))
        s = s.replace("short: '%s'" % os_, "short: '%s'" % ns.replace("'", "\\'"))
    else:
        s = s.replace(of, html.escape(nf, quote=True)).replace('>%s<' % os_, '>%s<' % html.escape(ns, quote=False))
    open(f, 'w', encoding='utf-8').write(s)
PY
echo "Renamed: '$OLD_SHORT' -> '$NEW_SHORT', '$OLD_FULL' -> '$NEW_FULL'"
grep -rn -- "$OLD_FULL" $FILES || echo "No old full name left."

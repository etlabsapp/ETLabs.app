# ET Labs

Independent software studio.

## Main marketing site (plain HTML / CSS / JS)

The live site files are at the **repository root**: `index.html`, `assets/`, `philosophy.html`, `contact.html`, etc., plus **`apps/sleeptight/`** for SleepTight. No intro animation, no React.

**Local dev** (from repo root):

```bash
npm run dev
```

Serves the repo root at **http://localhost:3000** (homepage is **`index.html`**).

**Deploy etlabs.app:** Point your static host (e.g. Cloudflare Pages) at the **repo root** (empty root directory or `.`), build `exit 0` or empty, output `.`. See `docs/CLOUDFLARE-MAIN-SITE-BUILD.md`.

## Also in this repo

- **`apps/marketing/`** — Next.js + logo intro (optional; `npm run dev:marketing`)
- **`apps/flipfeed/`** — internal Next.js app (not linked from the public site)
- **`apps/dashboard/`** — ET Labs Dashboard (port 3002)

## Scripts

- **`scripts/build_social_banner.py`** — utility for social images

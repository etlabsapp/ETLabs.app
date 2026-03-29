# ET Labs

Independent software studio: main marketing site is **Next.js** in `apps/marketing`. Legacy static HTML/CSS/JS is archived under **`backup/static-site/`**.

## Structure

- **`apps/marketing/`** — ET Labs homepage (Next.js 14, App Router), philosophy/products/studio/contact stubs, WebGL logo intro, static SleepTight app under `public/apps/sleeptight/`
- **`backup/static-site/`** — frozen copy of the old root `index.html`, sibling pages, `assets/`, and `sleeptight/` (see `NOTICE.txt` there)
- **`apps/flipfeed/`** — FlipFeed: Next.js split-flap board (`npm run dev` from that directory)
- **`apps/dashboard/`** — ET Labs Dashboard (port 3002 with `npm run dev`)

## Main site: local dev

From the **repository root**:

```bash
npm run install:marketing
npm run dev
```

Opens the marketing app (default port **3003**).

## Deploy etlabs.app (main site)

Point your host at **`apps/marketing`** as the project root (not the repo root).

- **Vercel / Cloudflare Pages / Railway:** Framework **Next.js**, install command `npm install`, build `npm run build`, output `.next` (platform default).
- Set **`NEXT_PUBLIC_SITE_URL`** to your canonical origin (e.g. `https://etlabs.app`) for absolute Open Graph URLs.

FlipFeed and Dashboard stay separate projects (`apps/flipfeed`, `apps/dashboard`) with their own env vars.

## Assets

- **Marketing / OG:** Images live under `apps/marketing/public/` (e.g. `/apps/sleeptight/images/hero-phone.webp`).
- **SleepTight static pages:** Edit files in `apps/marketing/public/apps/sleeptight/` (or restore from `backup/static-site/sleeptight/` and copy over).

## Scripts

- **`scripts/build_social_banner.py`** — utility for social images (unchanged).

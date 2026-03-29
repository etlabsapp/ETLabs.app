# Cloudflare: Main site (etlabs.app) build settings

The main site is the **Next.js app** in **`apps/marketing`**. Legacy static-root settings are obsolete; see `backup/static-site/` for the old layout.

## In Cloudflare: etlabsapp → Settings → Builds & deployments

| Setting | Value |
|--------|--------|
| **Root directory** | `apps/marketing` |
| **Framework preset** | **Next.js** (or leave auto-detect) |
| **Build command** | `npm run build` (default) |
| **Build output directory** | `.next` (Cloudflare’s Next preset usually sets this) |
| **Node version** | 18.x or 20.x (match local) |

## Environment

- **`NEXT_PUBLIC_SITE_URL`** — e.g. `https://etlabs.app` (for `metadataBase` / absolute OG URLs).

## After changing

1. Save settings and redeploy.
2. Custom domains: `etlabs.app`, `www.etlabs.app` on this project.
3. Static SleepTight HTML is served from **`/apps/sleeptight/*`** via `public/apps/sleeptight/`.

## If the build fails

Open the deployment **Build log**, copy the last 20–30 lines, and fix the reported error (deps, Node version, or framework preset).

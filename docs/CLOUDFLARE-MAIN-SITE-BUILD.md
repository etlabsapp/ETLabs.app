# Cloudflare: Main site (etlabs.app) build settings

The main site is **plain static HTML/CSS/JS** at the **repository root** (`index.html`, `assets/`, `apps/sleeptight/`, etc.). No Next.js build.

## In Cloudflare Pages: project for etlabs.app → Settings → Builds & deployments

| Setting | Value |
|--------|--------|
| **Root directory** | Leave **empty** or `/` (repo root) |
| **Framework preset** | **None** |
| **Build command** | `exit 0` or leave empty |
| **Build output directory** | Leave **empty** or `.` (current directory) |

No environment variables are required for the static pages.

## After changing

1. Save settings and redeploy.
2. Attach custom domains: `etlabs.app`, `www.etlabs.app`.

SleepTight pages live at **`/apps/sleeptight/*`**.

## Optional Next.js app

The older marketing app is in **`apps/marketing/`** if you need it; it is **not** used for this static main-site deploy.

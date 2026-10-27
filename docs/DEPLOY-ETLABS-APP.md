# Deploy ETLabs to etlabs.app

Checklist for production at **etlabs.app**.

## MyHQ (`/myhq/`) — Worker `etlabsapp`

The live app is this Worker's static assets, not myhq.etlabs.app and not a pages.dev host.

1. From the repo root, deploy the existing Worker (do not create a second Worker):

   ```bash
   npx wrangler deploy
   ```

   `wrangler.jsonc` name is `etlabsapp`. `main` is `workers/router.js`. Assets are the repo root (`assets.directory: "."`) with `run_worker_first`. The dashboard files are `apps/myhq/public/` and are only served under `/myhq/`.

2. After deploy, check `https://etlabs.app/myhq/` is the MyHQ dashboard (title ETLabs MyHQ, starter templates, not the marketing page) and `https://etlabs.app/myhq/setup-guide/` is the setup guide. `/myhq` redirects to `/myhq/`.

3. Web Analytics: responses under `/myhq` and `/myhq/*` send `Cache-Control: public, no-transform` and a Content-Security-Policy that does not allow `beacon.min.js` or `cloudflareinsights.com`. Confirm a `/myhq/` document contains neither `beacon.min.js` nor `/cdn-cgi/rum`. In the Cloudflare dashboard, also exclude `/myhq` and `/myhq/*` from the etlabs.app Web Analytics site before production traffic. Leave analytics on the marketing pages; `/privacy` says the app path is excluded.

Marketing CTAs already point at same-origin `/myhq/` (PR #48). Do not point them at pages.dev or myhq.etlabs.app.

---

## What’s in the repo

| Part | What it is | Where it lives |
|------|------------|----------------|
| **Repo root** | **Main marketing site** — `index.html`, HTML pages, `assets/`, JS (no intro, no React) | Deploy **repo root** for **etlabs.app** |
| **`apps/sleeptight/`** | SleepTight static HTML | **`/apps/sleeptight/*`** on the same deployment |
| **`apps/marketing/`** | Optional Next.js + logo intro | Not required for the static main site |
| **`apps/flipfeed/`** | Next.js (internal; not promoted on etlabs.app) | Separate deploy if needed |
| **`apps/dashboard/`** | Next.js Dashboard | **dashboard.etlabs.app** (or separate host) |

---

## Main site (static) — recommended

1. In **Cloudflare Pages** (or similar), set:
   - **Root directory:** empty (repo root) or `.`
   - **Build command:** `exit 0` or leave empty
   - **Build output:** `.` (current directory)

2. Point **etlabs.app** DNS at that project.

3. No env vars required for the static pages.

---

## Optional: Next.js marketing app

If you still use **`apps/marketing`**, configure **`NEXT_PUBLIC_SITE_URL`** and deploy that project separately. It is **not** the same as the static files at repo root.

---

## Optional apps (Dashboard / FlipFeed)

- **Dashboard** — Next.js; Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **FlipFeed** — Next.js in `apps/flipfeed/`; same Supabase pattern if you deploy it; optional `OPENWEATHER_API_KEY`.
- **Supabase** — One project can serve multiple apps. Run migrations as needed.

---

## Links

Root HTML links to **`/apps/sleeptight/`** and other product pages — edit those paths if your domains or structure change.

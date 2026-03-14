# Deploy ETLabs to etlabs.app

Checklist for moving this folder to production at **etlabs.app**.

---

## What’s in the repo

| Part | What it is | Where it can live at etlabs.app |
|------|------------|----------------------------------|
| **Root** (index, philosophy, products, contact, studio) | Static HTML site | `etlabs.app` (main domain) |
| **thank-you.html** | SleepTight waitlist thank-you page | `etlabs.app/thank-you.html` |
| **apps/sleeptight/** | SleepTight landing (static HTML) | `etlabs.app/apps/sleeptight/` or `sleeptight.etlabs.app` |
| **apps/flipfeed/** | Next.js app (auth + board + widgets) | `etlabs.app/apps/flipfeed/` or `flipfeed.etlabs.app` |
| **apps/dashboard/** | Next.js app (download tracking) | `etlabs.app/apps/dashboard/` or `dashboard.etlabs.app` |

---

## Ready to move

- **Main site** — Static files. Deploy the repo root to any host; point **etlabs.app** at that deployment.
- **SleepTight** — Static. Served from the same host as the main site (e.g. `etlabs.app/apps/sleeptight/`) or a subdomain.
- **FlipFeed** — Build and deploy as a Next.js app. Needs env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; optional `OPENWEATHER_API_KEY`.
- **Dashboard** — Same. Deploy as Next.js; same Supabase env vars.
- **Supabase** — One project can serve both FlipFeed and Dashboard. Run both migrations (user_config + tracked_apps) in that project.

---

## Before you go live at etlabs.app

1. **Domain**
   - Point **etlabs.app** (and www if you use it) to the host that serves the **root** of this repo (main site + thank-you + apps/sleeptight if you serve them together).

2. **Main site + SleepTight**
   - Deploy the repo root to Netlify, Vercel, or Cloudflare Pages.
   - If the host builds nothing (static only), the root is the static site and `apps/sleeptight/` is just a path.
   - Enable **Netlify Forms** on the root deploy if you use the SleepTight waitlist form.

3. **FlipFeed**
   - Deploy `apps/flipfeed` as its own project (Vercel/Cloudflare). Set env vars (Supabase + optional OpenWeather).
   - Either:
     - **Subpath:** e.g. `etlabs.app/apps/flipfeed/` (if your main host supports proxying or a monorepo deploy), or
     - **Subdomain:** e.g. **flipfeed.etlabs.app** → point to the FlipFeed deployment.

4. **Dashboard**
   - Same idea: deploy `apps/dashboard` (Vercel/Cloudflare), same Supabase env vars.
   - Use **dashboard.etlabs.app** (or `etlabs.app/apps/dashboard/` if you set that up).

5. **Links**
   - Main site already links to `apps/sleeptight/`, `apps/flipfeed/`. If you use subdomains instead, update those links (e.g. `https://flipfeed.etlabs.app`, `https://dashboard.etlabs.app`).

6. **Supabase**
   - Run migrations in the Supabase project you use in production.
   - In Supabase Auth settings, add your production URLs to **Redirect URLs** (e.g. `https://etlabs.app/auth/callback`, `https://flipfeed.etlabs.app/auth/callback`, `https://dashboard.etlabs.app/auth/callback`).

---

## Summary

- **Yes, the folder is ready to move** to etlabs.app: code, structure, and config are in place.
- You need to: deploy each part (root, FlipFeed, Dashboard), point etlabs.app (and optional subdomains) at those deployments, set env vars, run Supabase migrations, and add redirect URLs in Supabase. Then you’re live at etlabs.app.

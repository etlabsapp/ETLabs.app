# Deploy ETLabs to etlabs.app

Checklist for production at **etlabs.app**.

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

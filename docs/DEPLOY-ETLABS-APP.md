# Deploy ETLabs to etlabs.app

Checklist for production at **etlabs.app**.

---

## What’s in the repo

| Part | What it is | Where it lives |
|------|------------|----------------|
| **`apps/marketing/`** | Next.js main site + logo intro | Deploy as **etlabs.app** (project root = `apps/marketing`) |
| **`apps/marketing/public/apps/sleeptight/`** | SleepTight static HTML | Served at **`/apps/sleeptight/*`** on the same deployment |
| **`backup/static-site/`** | Archived pre-Next static site | Not deployed; reference only |
| **`apps/flipfeed/`** | Next.js FlipFeed | **flipfeed.etlabs.app** (or separate host) |
| **`apps/dashboard/`** | Next.js Dashboard | **dashboard.etlabs.app** (or separate host) |

---

## Ready to move

- **Main site + SleepTight paths** — One Next.js build from **`apps/marketing`**. Configure **`NEXT_PUBLIC_SITE_URL`** for metadata.
- **FlipFeed** — Next.js; env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; optional `OPENWEATHER_API_KEY`.
- **Dashboard** — Next.js; same Supabase env vars.
- **Supabase** — One project can serve FlipFeed and Dashboard. Run migrations as needed.

---

## Before you go live

1. **Domain** — Point **etlabs.app** (and www) at the **`apps/marketing`** deployment.

2. **Thank-you / forms** — Waitlist thank-you is at **`/thank-you`** (React). Point form actions to your form provider or a server action; legacy **`thank-you.html`** is in **`backup/static-site/`**.

3. **FlipFeed** — Deploy `apps/flipfeed` separately; prefer **flipfeed.etlabs.app**.

4. **Dashboard** — Deploy `apps/dashboard` separately; prefer **dashboard.etlabs.app**.

5. **Links** — Marketing app links to FlipFeed’s public URL and `/apps/sleeptight/`. Update if you use different domains.

6. **Supabase** — Add production redirect URLs for each deployed origin.

---

## Yes / you still need to

- Deploy **apps/marketing** for the main domain.
- Deploy FlipFeed and Dashboard if you use them.
- Set env vars and DNS. Legacy static files are only in **`backup/static-site/`** for reference.

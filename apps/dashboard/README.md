# ET Labs Dashboard

Track App Store downloads (e.g. SleepTight) and manage your apps. Sign in → see download counts on the dashboard → add/change/remove apps in **My settings / Profile**.

## Same Supabase as FlipFeed (cheap)

Use the **same** Supabase project as FlipFeed. Run **both** migrations in that project:

1. FlipFeed: `apps/flipfeed/supabase/migrations/001_user_config.sql`
2. Dashboard: `apps/dashboard/supabase/migrations/001_tracked_apps.sql`

Use the same `.env.local` (or set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Same account can sign in to both apps.

## Run

```bash
cd apps/dashboard
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key
npm install
npm run dev
```

Opens on **http://localhost:3002** (so it doesn’t clash with FlipFeed on 3001).

## Flow

- **/** — Not signed in: landing with “Sign in”. Signed in: list of tracked apps with download counts.
- **/signin**, **/signup** — Auth (same Supabase as FlipFeed).
- **/settings** — **My settings / Profile**: add app (name, optional App Store ID, download count), change download count, remove app.

Download count is **manual** for now: you update it from App Store Connect (Sales and Trends or reports) and enter the number in settings. Later you can add App Store Connect API to sync automatically.

# FlipFeed

Configurable split-flap board. **Sign up** → add widgets in **Settings** (SleepTight downloads, weather, custom feed) → **board only** when signed in. Click Settings when you want to change anything. For a **live download flip tracker**, add the "SleepTight downloads" widget in Settings (uses the same account as the ET Labs Dashboard; add the app there first).

**Product plan:** See **[docs/PRODUCT-SKETCH.md](docs/PRODUCT-SKETCH.md)** for the full vision and monetization.

## Run for $0 (as cheap as possible)

Everything in this setup can stay **free** at low/moderate use:

| Service | Free tier | What to watch |
|--------|-----------|----------------|
| **Supabase** | 500MB DB, 50k MAU, 2 projects | One project is enough; stay under 500MB and normal user counts. |
| **Vercel** (or Cloudflare Pages) | Hobby / free tier | Enough for one app and modest traffic. |
| **OpenWeather** | 1,000 calls/day | Weather widget is cached 10 min; dozens of users = still under 1k/day. Skip the key and weather shows "Set OPENWEATHER_API_KEY" until you add one. |

**No credit card required** for Supabase or Vercel free tiers. Deploy with the same env vars (Supabase URL + anon key); add OpenWeather key only if you want the weather widget.

## Stack

- Next.js 14, React, TypeScript
- Supabase (auth + Postgres for profile/widget config)
- Tailwind CSS
- Optional: OpenWeather API for weather widget

## Setup

1. **Clone and install**
   ```bash
   cd apps/flipfeed
   npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - In **Project Settings → API**: copy **Project URL** and **anon public** key.
   - Create `.env.local` (see `.env.example`):
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - In Supabase **SQL Editor**, run the migration in `supabase/migrations/001_user_config.sql` to create the `user_config` table.
   - For the **SleepTight downloads** widget: use the same Supabase project as the ET Labs Dashboard and run the dashboard migration that creates the `tracked_apps` table so FlipFeed can read your tracked apps.

3. **Optional: Weather widget**
   - Get an API key from [OpenWeatherMap](https://openweathermap.org/api).
   - Add to `.env.local`: `OPENWEATHER_API_KEY=your-key`

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Routes

- **/** — If not signed in: landing (Sign up / Sign in). If signed in: **board only** with a small **Settings** link.
- **/?fullscreen=1** — Board fullscreen; **Exit fullscreen** returns to /
- **/signup** — Create account
- **/signin** — Sign in (supports `?next=/settings`)
- **/settings** — Add/remove widgets (SleepTight downloads, weather, custom feed), save to profile. **Sign out** here.
- **GET /api/config** — Current user’s widget config (auth required)
- **PUT /api/config** — Save widget config (auth required)
- **GET /api/etlabs-apps** — Current user's tracked apps (for SleepTight download widget; requires `tracked_apps` table)
- **GET /api/weather?location=** — Weather for board (optional API key)
- **GET /api/feed** — Demo feed for custom-feed widget when no URL is set

## Data

- `data/feed-a.json` and `data/feed-b.json` — Mock app rankings. Board polls every 15s and flips only changed characters.
- Column widths: Rank 2, Name 14, Country 3, Category 16 (fixed-width for stable animation).

## Deploy (free)

1. Push the repo to GitHub and connect to **Vercel** or **Cloudflare Pages**.
2. Set env vars in the dashboard: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optionally `OPENWEATHER_API_KEY`.
3. Deploy. The free tier is enough for FlipFeed at low cost.

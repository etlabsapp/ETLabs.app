# ET Labs

Independent software studio site and product landing pages. Static HTML/CSS/JS.

## Structure

- **Root** — ET Labs main site (index, philosophy, products, studio, contact)
- **apps/sleeptight/** — SleepTight app landing page and subpages (about, privacy, contact, products)
- **apps/flipfeed/** — FlipFeed: Next.js split-flap board app (run with `npm run dev` from that directory)
- **apps/dashboard/** — ET Labs Dashboard: track App Store downloads (e.g. SleepTight), add/change/remove apps in My settings / Profile. Same Supabase as FlipFeed; run `npm run dev` (port 3002).
- **thank-you.html** — Post-signup page for the SleepTight waitlist (Netlify Forms)

## Deploy to etlabs.app

**Don’t** upload the folder via FTP. Use a host that supports both static files and Node/Next.js.

### Option A – Vercel (recommended)

1. **Push the repo to GitHub** (if you haven’t already).

2. **Create three Vercel projects** from the same repo:
   - **Main site (etlabs.app)**  
     - Root directory: `.` (repo root)  
     - Framework: Other (or “No framework”)  
     - Build: leave empty or use `echo 'static'`; Output: `.` or the folder with `index.html`  
     - Domain: `etlabs.app` and `www.etlabs.app`
   - **FlipFeed (flipfeed.etlabs.app)**  
     - Root directory: `apps/flipfeed`  
     - Framework: Next.js (auto-detected)  
     - Domain: `flipfeed.etlabs.app`  
     - Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `OPENWEATHER_API_KEY`
   - **Dashboard (dashboard.etlabs.app)**  
     - Root directory: `apps/dashboard`  
     - Framework: Next.js  
     - Domain: `dashboard.etlabs.app`  
     - Env: same Supabase vars + `ALLOWED_EMAILS` if you use it

3. **Point main-site links to FlipFeed/Dashboard**  
   In the static site, change links from `apps/flipfeed/` to `https://flipfeed.etlabs.app` and add a Dashboard link to `https://dashboard.etlabs.app` if you want it in the nav. (Or keep `apps/flipfeed/` and add a Vercel rewrite on the main project from `/apps/flipfeed` → `https://flipfeed.etlabs.app` so the current links work.)

4. **Netlify Forms**: If you use Netlify for the main site instead, enable Netlify Forms so the SleepTight waitlist form and `/thank-you.html` redirect work.

### Option B – Cloudflare Pages (you already use Cloudflare)

Create **three Pages projects** from the same GitHub repo, then attach your domain and subdomains in Cloudflare.

1. **Main site (etlabs.app)**  
   - Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → select **etlabsapp/ETLabs.app**.  
   - **Project name:** e.g. `etlabs-app`.  
   - **Production branch:** `main`.  
   - **Root directory:** leave as `/` (repo root).  
   - **Framework preset:** None.  
   - **Build command:** leave empty, or `echo 'static'`.  
   - **Build output directory:** `.` (so the root HTML/CSS/JS are published).  
   - After deploy, go to **Custom domains** and add `etlabs.app` and `www.etlabs.app`.

2. **FlipFeed (flipfeed.etlabs.app)**  
   - **Create** → **Pages** → **Connect to Git** → same repo.  
   - **Root directory:** `apps/flipfeed`.  
   - **Framework preset:** Next.js (Cloudflare will detect it; use their Next.js support / adapter if prompted).  
   - Add **Environment variables** (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `OPENWEATHER_API_KEY`.  
   - **Custom domains:** add `flipfeed.etlabs.app`.

3. **Dashboard (dashboard.etlabs.app)**  
   - Same as FlipFeed: **Connect to Git**, **Root directory:** `apps/dashboard`, **Framework:** Next.js, add Supabase env vars and `ALLOWED_EMAILS` if needed.  
   - **Custom domains:** add `dashboard.etlabs.app`.

4. **Links on the main site**  
   Update the static site so “FlipFeed” points to `https://flipfeed.etlabs.app` (and add a Dashboard link to `https://dashboard.etlabs.app` if you want). Right now the site uses `apps/flipfeed/`, which only works if everything is served from one origin; with separate projects, use the full subdomain URLs.

If the **main site** build fails (e.g. “no output”), add a no-op build: at repo root create a `package.json` with `"scripts": { "build": "echo 'static'" }` and set **Build command** to `npm run build`, **Build output directory** to `.`. Or use **Direct Upload** (Wrangler) to upload the root folder instead of Git for the main site.

### Option C – Other hosts

- Deploy the **root** as a static site (Netlify, etc.) for etlabs.app.
- Deploy **FlipFeed** and **Dashboard** as separate Next.js apps (Vercel, Railway, etc.) and use subdomains. Update links on the main site to those URLs.

## Assets

- **Main site**: For social sharing (Open Graph), add `images/hero-phone.webp` at the project root, or set `og:image` in `index.html` to an absolute URL in production.
- **SleepTight**: Place app images in `apps/sleeptight/images/` (e.g. `hero-phone.webp`, `sleeptight-logo.webp`, `feature-dial.webp`, `screenshot-01-home.webp` through `screenshot-06-profile.webp`). See `apps/sleeptight/index.html` for the full list of image paths.

## Local preview

Open `index.html` in a browser or run a local server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

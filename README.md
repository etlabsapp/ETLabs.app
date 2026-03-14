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

### Option B – Other hosts

- Deploy the **root** as a static site (Netlify, Cloudflare Pages, etc.) for etlabs.app.
- Deploy **FlipFeed** and **Dashboard** as separate Next.js apps on a Node host (Vercel, Railway, etc.) and use subdomains (e.g. flipfeed.etlabs.app, dashboard.etlabs.app). Update (or rewrite) links on the main site to those URLs.

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

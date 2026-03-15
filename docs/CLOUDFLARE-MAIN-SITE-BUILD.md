# Cloudflare: Main site (etlabs.app) build settings

Use these settings in the **etlabsapp** project (Workers & Pages) so the static main site builds and deploys.

## In Cloudflare: etlabsapp → Settings → Builds & deployments (or Build configuration)

| Setting | Value |
|--------|--------|
| **Root directory** | Leave **empty** or `/` (repo root) |
| **Framework preset** | **None** |
| **Build command** | `exit 0` or `npm run build` |
| **Build output directory** | Leave **empty** or `.` |

## Why

- The main site is static HTML/CSS/JS at the repo root; no real build step is needed.
- `exit 0` (or `npm run build`, which runs `exit 0`) makes the build succeed so Cloudflare publishes the root folder.
- Empty output directory (or `.`) means “use the root as the output.”

## After changing

1. Save the settings.
2. Go to **Deployments** → **Create deployment** or **Redeploy** the latest commit.
3. Wait for the build to finish (should show success).
4. Then **etlabs.app/apps/flipfeed/** will serve the redirect to the FlipFeed app.

## If the build still fails

Open the **failed** deployment → **Build log**, copy the **error** (last 20–30 lines), and use it to fix the config or the repo.

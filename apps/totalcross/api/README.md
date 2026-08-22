# Total Cross themes API

`GET /apps/totalcross/api/themes.json?date=YYYY-MM-DD`

- `date` = player **local calendar** date (SleepTight First Light: user local tomorrow).
- Response `schemaVersion: 1`: `date`, `puzzleNumber`, `acrossTheme`, `downTheme`, `playUrl`.
- Day index matches live `game.js` (`LAUNCH_DATE` 2026-05-08).
- Catalog: `themes-catalog.json` (from live `puzzles.js` themes).
- Routing: Workers `workers/router.js` (honors `?date=`; bare URL defaults to UTC today).

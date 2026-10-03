# Total Cross themes API

`GET /apps/totalcross/api/themes.json?date=YYYY-MM-DD`

- `date` = player **local calendar** date (SleepTight First Light: user local tomorrow).
- Response `schemaVersion: 1`: `date`, `puzzleNumber`, `acrossTheme`, `downTheme`, `playUrl`.
- Day index matches `game.js` (`LAUNCH_DATE` 2026-05-08).
- Catalog: `themes-catalog.json` (themes from `puzzles.js`, rebuilt by `tools/totalcross-append.js`).
- Rotation (`workers/totalcross-rotation.mjs`, same as `game.js` `puzzleIndexForNumber`): puzzles before `cutoverDate` (2026-10-12, #158)
  use the original cycle `(n-1) % legacyCount` (66); from the cutover, indexes 66-165 run in order, then the full pool cycles from 0.
- Test: `node workers/totalcross-rotation.test.mjs` (game.js, puzzles.js and the Worker must agree for every day).
- Routing: Workers `workers/router.js` (honors `?date=`; bare URL defaults to UTC today).

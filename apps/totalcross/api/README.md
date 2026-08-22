# Total Cross themes API (stub)

SleepTight Night→Morning Light consumes:

`GET /apps/totalcross/api/themes.json?date=YYYY-MM-DD`

Stub note: this static `themes.json` is the **schemaVersion 1** response body for decoder/copy work. Query `date` is ignored until a tiny Worker/router lands; regenerate or replace this file for the target calendar day. `playUrl` is `https://etlabs.app/totalcross/`.

Fields: schemaVersion, date, puzzleNumber, acrossTheme, downTheme, playUrl.

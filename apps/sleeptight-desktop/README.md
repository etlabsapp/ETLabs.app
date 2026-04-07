# SleepTight Board (desktop)

A small **Mac desktop app** (Electron) that shows **official App Store unit totals** from Apple’s daily sales reports. No browser, no Supabase, no Vercel.

Apple does **not** offer a live WebSocket for downloads; this app **refreshes every 5 minutes** (and when you click **Refresh now**).

## Run from source

You must run these **inside the repo**, not from your home folder (`~`). From Terminal:

```bash
cd /path/to/ETLabs/apps/sleeptight-desktop
npm install
npm start
```

Example if the repo is on your Desktop:

```bash
cd ~/Desktop/ETLabs/ETLabs/apps/sleeptight-desktop
npm install
npm start
```

If `cd` says “no such file,” find the folder in Finder, drag it onto the Terminal window after `cd ` (with a space), then press Enter.

## First-time config

1. On first launch, the app creates **`config.json`** in its app data folder.
2. Click **Config folder** in the app (or open the folder manually — on macOS it’s usually  
   `~/Library/Application Support/sleeptight-desktop/`).
3. Edit **`config.json`** using `config.example.json` in this folder as a reference:
   - `ascPrivateKeyPath` — full path to your App Store Connect **`.p8`** key file
   - `ascKeyId`, `ascIssuerId`, `vendorNumber`, `appAppleId` — from App Store Connect (same as the FlipFeed `ASC_*` setup)

Save the file; the next refresh will pick it up.

## Build a double-clickable `.app`

```bash
npm run dist
```

Install from the generated **`dist/`** output (`.dmg` or `.zip`).

## Security

Keep your **`config.json`** and **`.p8`** private. Do not commit them to git.

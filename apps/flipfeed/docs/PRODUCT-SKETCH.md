# FlipFeed — Product Sketch

**This is the plan.** Use this doc as the source of truth for vision, features, and monetization.

**One-sentence vision:** A configurable split-flap display you open on a TV, monitor, or stream overlay. You add widgets in Settings (weather, sports, Twitch, custom feeds), and the board shows them in real time.

---

## Platform & scope

- **FlipFeed is the web app.** Setup and day-to-day use happen in the browser (any device).
- **Platform approach: Web + tvOS.** Web for setup and universal use (phones, tablets, non-Apple TVs, stream overlays). A **tvOS app** will follow for a better living-room Apple TV experience — same account, same board, native on the TV.
- **To begin with, FlipFeed is for ETLabs only.** It’s our own product and display, not a white-label or public multi-tenant product yet. We use it as a **fun way to track SleepTight downloads**: the board can show SleepTight (and later other ET Labs apps) download counts as a widget, so the split-flap display doubles as a visible, living-room-friendly way to see how the app is doing.

---

## What It Is

FlipFeed is a **live display board** that looks like an airport or train-station split-flap board. You don’t scroll or click through menus on the board itself—you set it up once in **Settings**, then the board just runs: weather, game countdowns, scores, Twitch viewers, or any feed you plug in.

**Primary use cases:** Living room TV, stream overlay, office monitor, lobby screen. “Glanceable” info that updates on a timer.

---

## Core Loop

**First time (new customer)**  
1. Go to the site → **Create a profile** (sign up / account).  
2. **Select widgets** and configure them: location for weather, team for sports, Twitch, custom feed URL, timezone, etc.  
3. Save → You’re signed in and taken to **the board**.

**When signed in**  
- **Default view = the board only.** No settings UI, no nav — just the split-flap display with their chosen widgets.  
- To change anything, they **click Settings** (e.g. a small link or icon). That opens Settings where they can add/remove/reorder widgets, update location, team, etc.  
- After saving in Settings, they’re back to **the board** again.  

So: **signed in = board by default; Settings only when they choose to open it.**

Account/profile stores widget config and preferences (location, teams, etc.); the board reads from that when they’re logged in.

---

## Settings: Widget Types

Users go to **Settings** and see something like:

| Widget        | What you configure              | What appears on the board                          |
|---------------|----------------------------------|----------------------------------------------------|
| **Weather**   | Location (city or zip)           | Current conditions + temp, maybe “NEXT: rain 3pm”  |
| **Sports**    | Favorite team(s)                 | Countdown to next game, or live score when on      |
| **Twitch**    | Connect Twitch (OAuth or channel)| “LIVE” + viewer count, or “OFFLINE”                 |
| **Custom feed** | Name + API/URL                 | Your own list (e.g. rankings, alerts) — current behavior |
| **Clock / date** | Timezone (optional)          | Time and date row                                  |
| **ET Labs app**  | Choose app (e.g. SleepTight) | Download count from dashboard (fun way to track)   |

- **Add widget** → Pick type, fill in the fields, save.
- **Reorder** → Drag or arrows so widgets appear in the order you want on the board.
- **Remove** → Turn off or delete a widget.

Settings can live on a single page with sections per widget type, or a simple list of “cards” (one per widget) with Edit / Remove.

---

## Board Layout (How It Looks)

The board is one vertical stack. Each **widget** is one or more **rows**:

- **Weather** → e.g. 1–2 rows: `NYC 72°F CLEAR` / `NEXT RAIN 3PM`
- **Sports** → e.g. 1 row: `NEXT GAME LAKERS vs BOS MAR 16 7:30PM` or `LIVE LAKERS 98 - BOS 94 Q4 5:00`
- **Twitch** → e.g. 1 row: `TWITCH @you 1.2K VIEWERS LIVE` or `TWITCH @you OFFLINE`
- **Custom feed** → Same as today: header row (RANK, NAME, …) + one row per item, flip animation when data changes.
- **Clock** → e.g. 1 row: `SAT MAR 14 3:45 PM`

So the board might look like:

```
SAT MAR 14  3:45 PM
NYC  72°F  CLEAR  —  NEXT RAIN 3PM
NEXT GAME  LAKERS vs BOS  MAR 16  7:30 PM
TWITCH  @you  1.2K VIEWERS  LIVE
RANK  APP NAME         COUNTRY  CATEGORY
01    CHATGPT          USA      PRODUCTIVITY
02    TIKTOK           UK       SOCIAL
...
```

Split-flap animation is used where it fits (e.g. custom feed, numbers, maybe time). Weather/sports/Twitch can share the same visual language (tiles, type, colors) even if not every character flips.

---

## Data & Refresh

- **Weather** — Call a weather API (e.g. OpenWeather) by location; refresh every 10–30 min.
- **Sports** — Use a sports API (e.g. ESPN, league APIs) for schedule + live scores; refresh every 1–5 min when game is on, less when not.
- **Twitch** — Twitch API (or Helix) for channel status + viewer count; refresh every 1–2 min when live.
- **Custom feed** — User’s URL; refresh interval in Settings (e.g. 15 sec as now).
- **Clock** — Local time; update every minute (or per second if desired).

All of this can be driven by the front end (browser) for MVP: one polling loop per widget type, or a single scheduler that hits APIs / feed URL on their intervals. Later, a small backend or serverless functions could proxy API keys and cache.

---

## Fullscreen & Display Mode

- When signed in, the main view is already **board-only** (Settings is behind a click).  
- **Fullscreen** = same board, no browser chrome. One control: “Exit fullscreen” (small link or button).  
- Optional: **Display mode** (e.g. query param) that hides the Settings entry point and “Exit” after a few seconds so the board is completely clean for TV/stream.

---

## Technical Shape (High Level)

- **Account / profile**  
  - Customer creates a profile (sign up); we store widget list + config (location, team ID, Twitch channel, feed URL, etc.) per account.  
  - Signed-in default view = board only; Settings is a separate screen they open when they want to change things.

- **Board**  
  - Reads widget list and order.  
  - For each widget, a small “fetcher” or hook gets data (weather API, sports API, Twitch API, fetch(feedUrl)).  
  - Renders one block per widget (weather block, sports block, Twitch block, custom-feed table, clock).  
  - Reuses current split-flap components where it makes sense (custom feed, maybe digits for scores/time).

- **APIs / keys**  
  - Weather: API key in Settings (user or app-level).  
  - Sports: API key or use a free tier; team chosen in Settings.  
  - Twitch: OAuth or “channel name” and public API for viewer count.

---

## MVP vs Later

**MVP (v1)**  
- **Profile/sign up** → customer creates account.  
- **Settings** (only when they click in): add one **Custom feed** + one **Weather** widget (location → one row). Save stores to their profile.  
- **Signed-in default** = board only (custom feed table + weather row). No Settings visible until they click Settings.

**v2**  
- Add **Sports** (one team, countdown + live score).  
- Add **Twitch** (one channel, live/offline + viewers).  
- Optional: **Clock** row.

**Later**  
- Reorder widgets, multiple teams/channels/feeds.  
- Account + cloud sync of settings.  
- Display mode (no UI), themes, more widget types.

---

## Monetization

Yes — you can monetize FlipFeed in ways that stay aligned with ET Labs (no engagement tricks, clear value for money).

**1. Freemium / tiered features**

- **Free:** 1–2 widgets (e.g. Clock + Custom feed only), or limited widgets (e.g. one weather location, one team).
- **Paid (one-time or subscription):** More widgets, multiple teams/channels/feeds, cloud sync of settings, optional themes or display modes.  
Fits the product: power users (streamers, offices, enthusiasts) pay for a fuller board; casual users get a useful display for free.

**2. One-time purchase (e.g. “Pro” or “Unlock all widgets”)**

- Pay once to unlock all widget types and no widget limit.  
Simple, no subscription fatigue. Good if you want to keep the product simple and avoid billing infrastructure early.

**3. Subscription (monthly / yearly)**

- Unlock all widgets + cloud sync + priority support or “display mode” as a paid feature.  
Recurring revenue; makes sense once you have account/sync and heavier API usage (you’re paying for weather/sports/Twitch APIs).

**4. Pass-through for API costs (optional)**

- Some users bring their own API keys (weather, etc.); others use “FlipFeed keys” with fair-use limits.  
- Paid tier: higher limits or included API usage so users don’t have to manage keys.  
Keeps free tier viable while covering cost of data.

**5. Streamers / creators**

- FlipFeed is a natural **stream overlay** or **second-screen display**.  
- Offer a “Streamer” or “Creator” tier: branded display mode, no “Powered by” on the board, or custom domain/subdomain (e.g. `flipfeed.etlabs.com/yourname`).  
- Price as a small monthly fee; streamers are used to paying for overlays and tools.

**6. Light sponsorship or “Powered by” (only if it fits)**

- Free tier could show a small, non-intrusive “FlipFeed by ET Labs” or “Upgrade to remove this” on the board.  
- Paid tier removes it.  
Only do this if it doesn’t clash with the calm, minimal aesthetic.

**Recommendation for launch**

- Start **free** with the MVP (custom feed + maybe one weather widget).  
- Add a **one-time “Pro”** or **low annual subscription** when you ship more widgets (sports, Twitch) and/or cloud sync.  
- Position it clearly: “Free board for basic use; pay to unlock all widgets and sync.” No dark patterns, no fake limits — just a straightforward upgrade path.

---

## Summary

FlipFeed is a **configurable live board**: you set it up in Settings (weather, sports, Twitch, custom feeds, clock), then the board shows those widgets in order with split-flap style. Fullscreen turns it into a dedicated display for TV, stream, or lobby. This sketch is the target product; the current app is “custom feed only” and can be extended widget by widget toward this.

"""
Minimal private stats page. Run on your machine (or a server only you reach):

  pip install -r requirements.txt
  cp .env.example .env   # fill in keys
  uvicorn server:app --host 127.0.0.1 --port 8765

Open: http://127.0.0.1:8765/?token=YOUR_STATS_PAGE_SECRET

Never expose this to the public internet without TLS + a strong secret (or use VPN / SSH tunnel).
"""

from __future__ import annotations

import os
from datetime import date, timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse

from apple_connect import sum_units_for_dates

load_dotenv()
app = FastAPI()


@app.get("/", response_class=HTMLResponse)
def home(token: str = Query(..., min_length=8)) -> str:
    secret = os.environ.get("STATS_PAGE_SECRET", "").strip()
    if not secret or token != secret:
        raise HTTPException(status_code=404, detail="Not found")

    vendor = os.environ.get("ASC_VENDOR_NUMBER", "").strip()
    if not vendor:
        raise HTTPException(status_code=500, detail="ASC_VENDOR_NUMBER not set")

    apple_id = os.environ.get("ASC_APP_APPLE_ID", "").strip() or None
    end = date.today() - timedelta(days=1)
    days = 14
    dates = [end - timedelta(days=i) for i in range(days)]
    dates.reverse()
    rows = sum_units_for_dates(vendor, dates, apple_id)
    total = sum(u for _, u, _ in rows)

    body = "".join(
        f"<tr><td>{d}</td><td style='text-align:right'>{u}</td><td style='text-align:right'>{n}</td></tr>"
        for d, u, n in rows
    )
    filter_note = f"App Apple ID <code>{apple_id}</code>" if apple_id else "All apps in report (no ASC_APP_APPLE_ID filter)"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>App Store units (official)</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem;
      background: #111; color: #eee; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 1rem; }}
    th, td {{ border-bottom: 1px solid #333; padding: 0.5rem 0.25rem; }}
    th {{ text-align: left; color: #888; font-weight: 600; }}
    .muted {{ color: #888; font-size: 0.9rem; margin-top: 1.5rem; }}
    .total {{ font-size: 1.25rem; margin-top: 1rem; }}
  </style>
</head>
<body>
  <h1>App Store units (daily SALES summary)</h1>
  <p class="muted">{filter_note}. Last {days} days (UTC dates; Apple may delay reports).</p>
  <p class="total"><strong>Sum of days shown:</strong> {total:,}</p>
  <table>
    <thead><tr><th>Report date</th><th>Units</th><th>Rows</th></tr></thead>
    <tbody>{body}</tbody>
  </table>
  <p class="muted">Data source: App Store Connect Sales and Trends API — same family of reports as App Store Connect.</p>
</body>
</html>"""

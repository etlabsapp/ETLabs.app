"""
App Store Connect Sales API: JWT auth + gzipped tab-delimited sales reports.

Docs: https://developer.apple.com/documentation/appstoreconnectapi/get-v1-salesreports
Report columns: https://developer.apple.com/help/app-store-connect/reference/reporting/summary-sales-report/
"""

from __future__ import annotations

import gzip
import io
import os
import time
from datetime import date, timedelta
from typing import Iterable

import jwt
import requests

ASC_BASE = "https://api.appstoreconnect.apple.com"


def load_private_key() -> str:
    path = os.environ.get("ASC_PRIVATE_KEY_PATH", "").strip()
    if not path:
        raise OSError("Set ASC_PRIVATE_KEY_PATH to your .p8 file path")
    with open(path, encoding="utf-8") as f:
        return f.read()


def make_token() -> str:
    key_id = os.environ["ASC_KEY_ID"].strip()
    issuer_id = os.environ["ASC_ISSUER_ID"].strip()
    key = load_private_key()
    now = int(time.time())
    payload = {"iss": issuer_id, "iat": now, "exp": now + 19 * 60, "aud": "appstoreconnect-v1"}
    headers = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    return jwt.encode(payload, key, algorithm="ES256", headers=headers)


def fetch_sales_summary_daily(vendor_number: str, report_date: date) -> str:
    """
    Download SALES / SUMMARY / DAILY report for one calendar day (UTC processing — Apple may lag).
    Returns decompressed tab-delimited text (header + rows).
    """
    token = make_token()
    ds = report_date.isoformat()
    params = {
        "filter[frequency]": "DAILY",
        "filter[reportDate]": ds,
        "filter[reportSubType]": "SUMMARY",
        "filter[reportType]": "SALES",
        "filter[vendorNumber]": vendor_number,
        "filter[version]": "1_0",
    }
    r = requests.get(
        f"{ASC_BASE}/v1/salesReports",
        headers={"Authorization": f"Bearer {token}"},
        params=params,
        timeout=120,
    )
    if r.status_code == 404:
        raise FileNotFoundError(
            f"No report for {ds} yet (Apple often publishes the previous day after a delay), or wrong vendor number."
        )
    r.raise_for_status()
    raw = r.content
    if len(raw) >= 2 and raw[0] == 0x1F and raw[1] == 0x8B:
        raw = gzip.decompress(raw)
    return raw.decode("utf-8", errors="replace")


def parse_units_tsv(text: str, apple_identifier: str | None) -> tuple[int, int]:
    """
    Sum Units column. If apple_identifier is set, only rows whose Apple Identifier column matches.
    Returns (matched_units, row_count_considered).
    """
    lines = text.strip().splitlines()
    if not lines:
        return 0, 0
    header = lines[0].split("\t")
    try:
        units_idx = header.index("Units")
        id_idx = header.index("Apple Identifier")
    except ValueError as e:
        raise ValueError(f"Unexpected report header: {header[:12]}...") from e

    total = 0
    rows = 0
    for line in lines[1:]:
        if not line.strip():
            continue
        cols = line.split("\t")
        if len(cols) <= max(units_idx, id_idx):
            continue
        aid = cols[id_idx].strip()
        if apple_identifier and aid != apple_identifier.strip():
            continue
        rows += 1
        try:
            total += int(float(cols[units_idx].strip() or 0))
        except ValueError:
            continue
    return total, rows


def sum_units_for_dates(
    vendor_number: str,
    dates: Iterable[date],
    apple_identifier: str | None,
) -> list[tuple[date, int, int]]:
    """Returns list of (date, units, rows_matched)."""
    out: list[tuple[date, int, int]] = []
    for d in dates:
        try:
            tsv = fetch_sales_summary_daily(vendor_number, d)
            u, n = parse_units_tsv(tsv, apple_identifier)
            out.append((d, u, n))
        except FileNotFoundError:
            out.append((d, 0, 0))
    return out

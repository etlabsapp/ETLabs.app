#!/usr/bin/env python3
"""Fetch official App Store unit counts from Sales and Trends (summary daily SALES report)."""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, timedelta

from dotenv import load_dotenv

from apple_connect import sum_units_for_dates


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="App Store Connect daily units (official sales report)")
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="How many past days to request (default 7). Older days may 404 until Apple processes them.",
    )
    parser.add_argument(
        "--vendor",
        default=os.environ.get("ASC_VENDOR_NUMBER", "").strip(),
        help="Vendor number (or set ASC_VENDOR_NUMBER)",
    )
    parser.add_argument(
        "--apple-id",
        default=os.environ.get("ASC_APP_APPLE_ID", "").strip() or None,
        help="App Apple Identifier to filter (or set ASC_APP_APPLE_ID); omit to sum every row in the report",
    )
    args = parser.parse_args()
    if not args.vendor:
        print("Set ASC_VENDOR_NUMBER or pass --vendor", file=sys.stderr)
        sys.exit(1)

    end = date.today() - timedelta(days=1)
    dates = [end - timedelta(days=i) for i in range(args.days)]
    dates.reverse()

    rows = sum_units_for_dates(args.vendor, dates, args.apple_id)
    print(f"{'Date':<12} {'Units':>8} {'Rows':>6}")
    grand = 0
    for d, u, n in rows:
        print(f"{d.isoformat():<12} {u:>8} {n:>6}")
        grand += u
    print(f"{'TOTAL':<12} {grand:>8}")


if __name__ == "__main__":
    main()

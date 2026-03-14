import { COLUMN_WIDTHS } from "./constants";

export type FeedRow = {
  rank: string;
  name: string;
  country: string;
  category: string;
};

/**
 * Pad and normalize a value to fixed width for split-flap display.
 * Uppercase, trim, slice to length, pad with spaces.
 */
export function pad(value: string, length: number): string {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9 \-]/g, " ")
    .slice(0, length)
    .padEnd(length, " ");
}

/**
 * Normalize a raw feed row into fixed-width display fields.
 */
export function normalizeRow(row: FeedRow): FeedRow {
  return {
    rank: pad(row.rank, COLUMN_WIDTHS.RANK),
    name: pad(row.name, COLUMN_WIDTHS.NAME),
    country: pad(row.country, COLUMN_WIDTHS.COUNTRY),
    category: pad(row.category, COLUMN_WIDTHS.CATEGORY),
  };
}

/**
 * Convert a normalized row to a single display string (for per-char comparison).
 * Format: RANK + NAME + COUNTRY + CATEGORY (no separators; columns implied by width).
 */
export function rowToDisplayString(row: FeedRow): string {
  return (
    row.rank + row.name + row.country + row.category
  );
}

export const TOTAL_ROW_LENGTH =
  COLUMN_WIDTHS.RANK +
  COLUMN_WIDTHS.NAME +
  COLUMN_WIDTHS.COUNTRY +
  COLUMN_WIDTHS.CATEGORY;

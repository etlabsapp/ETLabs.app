export const COLUMN_WIDTHS = {
  RANK: 2,
  NAME: 14,
  COUNTRY: 3,
  CATEGORY: 16,
} as const;

export const POLL_INTERVAL_MS = 15000;

/** Supported characters for split-flap display: A-Z, 0-9, space, dash */
export const VALID_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -".split("");

export function isValidChar(char: string): boolean {
  return char.length === 1 && VALID_CHARS.includes(char);
}

/**
 * Total Cross rotation: maps a puzzle number (day 1 = 2026-05-08) to an index in PUZZLES / themes-catalog.
 * Must match apps/totalcross/game.js puzzleIndexForNumber(); see workers/totalcross-rotation.test.mjs.
 *  - n < cutover: original cycle, (n-1) % legacyCount (keeps today's, archived and saved puzzles stable)
 *  - n >= cutover: new puzzles in order from index legacyCount, then the full pool cycles from 0
 */
export function cutoverNumber(launchYmd, cutoverYmd) {
  const toUtc = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUtc(cutoverYmd) - toUtc(launchYmd)) / 86400000) + 1;
}

export function puzzleIndexForNumber(n, { total, legacyCount, cutoverN }) {
  if (!legacyCount || !cutoverN) return (Math.max(1, n) - 1) % total; // catalog without rotation info
  if (n < cutoverN) return (Math.max(1, n) - 1) % legacyCount % total;
  return (legacyCount + (n - cutoverN)) % total;
}

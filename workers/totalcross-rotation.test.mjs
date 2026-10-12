// Total Cross rotation consistency:  node workers/totalcross-rotation.test.mjs
// Checks that game.js, the puzzles.js legacy helpers and the themes API Worker pick the same puzzle for every day,
// that days before the cutover keep the original 66-cycle, and that the catalog themes match puzzles.js.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { cutoverNumber, puzzleIndexForNumber } from "./totalcross-rotation.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const catalog = JSON.parse(fs.readFileSync(root + "apps/totalcross/api/themes-catalog.json", "utf8"));
const puzzlesSrc = fs.readFileSync(root + "apps/totalcross/puzzles.js", "utf8");
const gameSrc = fs.readFileSync(root + "apps/totalcross/game.js", "utf8");

// Run puzzles.js + game.js in a stub browser context to reach window.TotalCrossRotation.
const store = {};
const ctx = {
  window: { supabase: { createClient: () => ({}) }, location: { search: "" }, addEventListener() {} },
  document: { addEventListener() {}, getElementById() { return null; } },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
  console, Date, Math, JSON, URLSearchParams,
};
vm.createContext(ctx);
vm.runInContext(puzzlesSrc + "\nthis.PUZZLES = PUZZLES; this.getPuzzleByIndex = getPuzzleByIndex;", ctx);
vm.runInContext(gameSrc, ctx);
const game = ctx.window.TotalCrossRotation;
const PUZZLES = ctx.PUZZLES;
assert.ok(game, "game.js exposes TotalCrossRotation");

const LEGACY = 66;
assert.equal(catalog.legacyCount, LEGACY);
assert.equal(game.legacyCount, LEGACY);
assert.equal(catalog.cutoverDate, game.cutoverDate);
const cutoverN = cutoverNumber(catalog.launchDate, catalog.cutoverDate);
assert.equal(cutoverN, game.cutoverN);
assert.equal(cutoverN, 158); // 2026-10-12

// Catalog themes mirror puzzles.js
assert.equal(catalog.themes.length, PUZZLES.length);
PUZZLES.forEach((p, i) => {
  assert.equal(p.id, i, `puzzle id ${p.id} at index ${i}`);
  assert.equal(catalog.themes[i].acrossTheme, p.acrossTheme, `across theme ${i}`);
  assert.equal(catalog.themes[i].downTheme, p.downTheme, `down theme ${i}`);
});

const rot = { total: catalog.themes.length, legacyCount: catalog.legacyCount, cutoverN };
for (let n = 1; n <= 3000; n++) {
  const g = game.puzzleIndexForNumber(n);
  assert.equal(puzzleIndexForNumber(n, rot), g, `worker vs game, #${n}`);
  assert.equal(ctx.getPuzzleByIndex(n - 1), PUZZLES[g], `puzzles.js helper vs game, #${n}`);
  if (n < cutoverN) assert.equal(g, (n - 1) % LEGACY, `pre-cutover #${n} keeps the 66-cycle`);
}
// Spot checks: today (2026-10-03) is #149, which stays index 16.
assert.equal(game.puzzleIndexForNumber(149), 16);
assert.equal(game.puzzleIndexForNumber(150), 17);
assert.equal(game.puzzleIndexForNumber(157), 24);
assert.equal(game.puzzleIndexForNumber(158), 66);
assert.equal(game.puzzleIndexForNumber(158 + 99), 165);
assert.equal(game.puzzleIndexForNumber(158 + 100), 0);
// Every new puzzle appears exactly once in the first 100 days after the cutover.
const firstRun = new Set(Array.from({ length: 100 }, (_, k) => game.puzzleIndexForNumber(cutoverN + k)));
assert.equal(firstRun.size, 100);
assert.ok([...firstRun].every(i => i >= LEGACY));
console.log(`totalcross rotation tests passed (${PUZZLES.length} puzzles, cutover #${cutoverN} ${catalog.cutoverDate})`);

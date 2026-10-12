#!/usr/bin/env node
// Total Cross: batch puzzle generator for the 100-puzzle expansion (ids 66-165).
// Reuses CrosswordBuilder from tools/puzzle-gen.js and adds a seeded randomized search:
// many layouts are tried per theme pair and the best one (word count, balance, density, size) is kept.
//
// Usage: node tools/puzzle-gen-batch.js > /tmp/new-puzzles.json
// Then node tools/totalcross-append.js /tmp/new-puzzles.json, which appends them to apps/totalcross/puzzles.js.
'use strict';
const { CrosswordBuilder } = require('./puzzle-gen.js');
const DEFS = require('./totalcross-new-themes.js');

const START_ID = 66;
const TRIALS = Number(process.env.TRIALS || 4000);
const MAX_COLS = Number(process.env.MAX_COLS || 15); // phone-friendly: fits a 375px screen
const MAX_ROWS = 19;
const MAX_DIM = Math.max(MAX_COLS, MAX_ROWS);
const TARGET_WORDS = 14;     // 12-15 entries per puzzle
const MIN_PER_DIR = 6;

function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

class SearchBuilder extends CrosswordBuilder {
  constructor(size) { super(size); this.used = { across: new Set(), down: new Set() }; }
  // The base builder lets a word run over a same-direction word (SURFING inside WINDSURFING); forbid that.
  canPlace(word, row, col, dir) {
    for (let i = 0; i < word.length; i++) {
      const r = dir === 'across' ? row : row + i, c = dir === 'across' ? col + i : col;
      if (this.used[dir].has(r * 1000 + c)) return false;
    }
    return super.canPlace(word, row, col, dir);
  }
  place(word, row, col, dir) {
    for (let i = 0; i < word.length; i++) this.used[dir].add(dir === 'across' ? row * 1000 + col + i : (row + i) * 1000 + col);
    super.place(word, row, col, dir);
  }
  bbox(extra) {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const { row, col, word, dir } of extra ? [...this.placed, extra] : this.placed) {
      minR = Math.min(minR, row); minC = Math.min(minC, col);
      maxR = Math.max(maxR, dir === 'across' ? row : row + word.length - 1);
      maxC = Math.max(maxC, dir === 'across' ? col + word.length - 1 : col);
    }
    return { rows: maxR - minR + 1, cols: maxC - minC + 1 };
  }
  // All legal placements of a word (crossing at least one existing word), with crossing counts.
  placements(word, dir) {
    const W = word.toUpperCase(), out = [], seen = new Set();
    const opp = dir === 'across' ? 'down' : 'across';
    for (const p of this.placed) {
      if (p.dir !== opp) continue;
      for (let i = 0; i < W.length; i++) for (let j = 0; j < p.word.length; j++) {
        if (W[i] !== p.word[j]) continue;
        const row = dir === 'across' ? p.row + j : p.row - i;
        const col = dir === 'across' ? p.col - i : p.col + j;
        const key = row + ',' + col;
        if (seen.has(key)) continue; seen.add(key);
        if (row < 1 || col < 1 || row >= this.size - 1 || col >= this.size - 1) continue;
        if (!this.canPlace(W, row, col, dir)) continue;
        const b = this.bbox({ word: W, row, col, dir });
        if (b.rows > MAX_ROWS || b.cols > MAX_COLS) continue;
        let x = 0;
        for (let k = 0; k < W.length; k++) {
          const r = dir === 'across' ? row : row + k, c = dir === 'across' ? col + k : col;
          if (this.grid[r][c] !== null) x++;
        }
        out.push({ row, col, x, area: b.rows * b.cols });
      }
    }
    return out;
  }
}

function attempt(def, r) {
  const b = new SearchBuilder(MAX_DIM * 2 + 3);
  const across = def.across.map(w => w.toUpperCase()), down = def.down.map(w => w.toUpperCase());
  // Start from a random long Across word, centred.
  const longA = [...across].filter(w => w.length <= MAX_COLS).sort((a, b) => b.length - a.length).slice(0, 5);
  const first = longA[Math.floor(r() * longA.length)];
  const mid = Math.floor(b.size / 2);
  b.place(first, mid, mid - Math.floor(first.length / 2), 'across');
  const pool = { across: shuffle(across.filter(w => w !== first), r), down: shuffle(down, r) };
  let count = { across: 1, down: 0 };
  let stall = 0;
  while (b.placed.length < TARGET_WORDS + 1 && stall < 2) {
    // Prefer the direction that is behind, so the split stays balanced.
    const dir = count.down <= count.across ? 'down' : 'across';
    let placed = false;
    for (const d of [dir, dir === 'down' ? 'across' : 'down']) {
      const opts = [];
      for (const w of pool[d]) for (const p of b.placements(w, d)) opts.push({ w, ...p });
      if (!opts.length) continue;
      // Score: more crossings and a smaller box are better, plus randomness for variety.
      opts.forEach(o => { o.s = o.x * 3 - o.area / 60 + r() * 2.5; });
      opts.sort((a, b2) => b2.s - a.s);
      const o = opts[0];
      b.place(o.w, o.row, o.col, d);
      pool[d] = pool[d].filter(w => w !== o.w);
      count[d]++; placed = true; break;
    }
    stall = placed ? 0 : stall + 1;
    if (!placed) break;
  }
  return { b, count };
}

function score({ b, count }) {
  const n = b.placed.length;
  const { rows, cols } = b.bbox();
  let crossings = 0;
  for (let r = 0; r < b.size; r++) for (let c = 0; c < b.size; c++) {
    if (b.grid[r][c] === null) continue;
    const h = (b.grid[r][c - 1] ?? null) !== null || (b.grid[r][c + 1] ?? null) !== null;
    const v = (b.grid[r - 1]?.[c] ?? null) !== null || (b.grid[r + 1]?.[c] ?? null) !== null;
    if (h && v) crossings++;
  }
  const longest = Math.max(...b.placed.map(p => p.word.length));
  let s = Math.min(n, TARGET_WORDS) * 100 - Math.max(0, n - 15) * 200;
  s -= Math.abs(count.across - count.down) * 25;
  if (Math.min(count.across, count.down) < MIN_PER_DIR) s -= 150;
  s += crossings * 6;
  if (cols < 11) s -= (11 - cols) * 20;
  if (rows < 11) s -= (11 - rows) * 20;
  if (longest >= 9) s += 30;
  if (longest >= 11) s += 10;
  s -= (rows * cols) / 40;
  return s;
}

function generate(def, idx) {
  let best = null, bestScore = -Infinity;
  const r = rng(0xC0FFEE + idx * 7919);
  for (let t = 0; t < TRIALS; t++) {
    const res = attempt(def, r);
    const s = score(res);
    if (s > bestScore) { bestScore = s; best = res; }
  }
  return best.b.toPuzzle(START_ID + idx, def.acrossTheme, def.downTheme);
}

if (require.main === module) {
  const only = process.env.ONLY ? Number(process.env.ONLY) : null;
  const out = [];
  DEFS.forEach((def, i) => {
    if (only !== null && i !== only) return;
    const p = generate(def, i);
    const a = p.words.filter(w => w.direction === 'across').length;
    process.stderr.write(`${p.id} ${def.acrossTheme} / ${def.downTheme}: ${p.words.length} words (${a}A/${p.words.length - a}D) ${p.grid.length}x${p.grid[0].length}\n`);
    out.push(p);
  });
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
module.exports = { generate };

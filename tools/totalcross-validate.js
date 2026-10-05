#!/usr/bin/env node
// Total Cross: validate every puzzle in apps/totalcross/puzzles.js.
// Usage: node tools/totalcross-validate.js [--json report.json]
// Checks: schema, A=1..Z=26 sums, uppercase A-Z answers, grid/word agreement, crossing letters,
// no unintended letter runs, numbering, connectivity, unique theme pairs, unique answers per puzzle.
// Exit code 1 if any puzzle with index >= 66 (the new ones) has an error. Issues in 0-65 are reported, never fixed.
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../apps/totalcross/puzzles.js'), 'utf8');
const PUZZLES = new Function(src + '; return PUZZLES;')();
const LEGACY = 66;
const sum = w => [...w].reduce((s, ch) => s + ch.charCodeAt(0) - 64, 0);

function check(p, idx) {
  const errs = [], warns = [];
  if (p.id !== idx) errs.push(`id ${p.id} != index ${idx}`);
  if (!p.acrossTheme || !p.downTheme) errs.push('missing theme');
  const R = p.grid.length, C = p.grid[0].length;
  if (p.grid.some(r => r.length !== C || r.some(v => v !== 0 && v !== 1))) errs.push('grid not rectangular 0/1');
  const letters = Array.from({ length: R }, () => Array(C).fill(null));
  const owner = { across: Array.from({ length: R }, () => Array(C).fill(null)), down: Array.from({ length: R }, () => Array(C).fill(null)) };
  const answers = new Set();
  for (const w of p.words) {
    const tag = `${w.id} ${w.answer}`;
    if (!/^[A-Z]+$/.test(w.answer)) { errs.push(`${tag}: not uppercase A-Z`); continue; }
    if (w.length !== w.answer.length) errs.push(`${tag}: length ${w.length} != ${w.answer.length}`);
    if (w.sum !== sum(w.answer)) errs.push(`${tag}: sum ${w.sum} != ${sum(w.answer)}`);
    if (answers.has(w.answer)) errs.push(`${tag}: duplicate answer in puzzle`);
    answers.add(w.answer);
    if (!/^\d+[AD]$/.test(w.id) || (w.id.endsWith('A') !== (w.direction === 'across'))) errs.push(`${tag}: bad id/direction`);
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.direction === 'across' ? w.row : w.row + i, c = w.direction === 'across' ? w.col + i : w.col;
      if (r < 0 || r >= R || c < 0 || c >= C) { errs.push(`${tag}: out of bounds`); break; }
      if (p.grid[r][c] !== 1) errs.push(`${tag}: cell ${r},${c} is 0 in grid`);
      if (letters[r][c] && letters[r][c] !== w.answer[i]) errs.push(`${tag}: crossing conflict at ${r},${c} (${letters[r][c]} vs ${w.answer[i]})`);
      letters[r][c] = w.answer[i];
      if (owner[w.direction][r][c]) errs.push(`${tag}: overlaps ${owner[w.direction][r][c]} in same direction`);
      owner[w.direction][r][c] = w.id;
    }
  }
  // Every open cell is covered; every maximal run of 2+ letters is exactly one entry.
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (p.grid[r][c] === 1 && !letters[r][c]) errs.push(`cell ${r},${c} open but not in any word`);
  const runs = (dir) => {
    const out = [];
    const [A, B] = dir === 'across' ? [R, C] : [C, R];
    for (let a = 0; a < A; a++) { let start = null;
      for (let b = 0; b <= B; b++) {
        const open = b < B && (dir === 'across' ? p.grid[a][b] : p.grid[b][a]) === 1;
        if (open && start === null) start = b;
        if (!open && start !== null) { if (b - start >= 2) out.push(dir === 'across' ? [a, start, b - start] : [start, a, b - start]); start = null; }
      } }
    return out;
  };
  for (const dir of ['across', 'down']) for (const [r, c, len] of runs(dir)) {
    const w = p.words.find(x => x.direction === dir && x.row === r && x.col === c && x.length === len);
    if (!w) errs.push(`unintended ${dir} run at ${r},${c} len ${len} (letters that are not an entry)`);
  }
  // Numbering: row-major start cells numbered 1..k.
  const starts = [...new Set(p.words.map(w => w.row * 1000 + w.col))].sort((a, b) => a - b);
  for (const w of p.words) { const n = starts.indexOf(w.row * 1000 + w.col) + 1; if (parseInt(w.id, 10) !== n) { warns.push(`numbering: ${w.id} expected ${n}`); break; } }
  // Connectivity
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (p.grid[r][c]) cells.push([r, c]);
  const seen = new Set([cells[0].join()]), q = [cells[0]];
  while (q.length) { const [r, c] = q.pop(); for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k = `${r+dr},${c+dc}`; if (p.grid[r+dr]?.[c+dc] === 1 && !seen.has(k)) { seen.add(k); q.push([r+dr, c+dc]); } } }
  if (seen.size !== cells.length) errs.push(`grid not connected (${seen.size}/${cells.length} cells reachable)`);
  const a = p.words.filter(w => w.direction === 'across').length;
  return { errs, warns, stats: { rows: R, cols: C, words: p.words.length, across: a, down: p.words.length - a, longest: Math.max(...p.words.map(w => w.length)) } };
}

const report = { total: PUZZLES.length, legacy: [], new: [], themePairDuplicates: [] };
const pairs = new Map();
PUZZLES.forEach((p, i) => {
  const k = `${p.acrossTheme}|${p.downTheme}`.toLowerCase();
  if (pairs.has(k)) report.themePairDuplicates.push(`${i} duplicates ${pairs.get(k)}: ${p.acrossTheme} / ${p.downTheme}`);
  else pairs.set(k, i);
  const r = check(p, i);
  (i < LEGACY ? report.legacy : report.new).push({ index: i, theme: `${p.acrossTheme} / ${p.downTheme}`, ...r });
});

const fmt = list => list.filter(x => x.errs.length || x.warns.length).map(x => `  #${x.index} ${x.theme}\n` + [...x.errs.map(e => '    ERROR ' + e), ...x.warns.map(w => '    warn  ' + w)].join('\n')).join('\n');
const newErr = report.new.reduce((s, x) => s + x.errs.length, 0), oldErr = report.legacy.reduce((s, x) => s + x.errs.length, 0);
const st = report.new.map(x => x.stats);
const range = k => `${Math.min(...st.map(s => s[k]))}-${Math.max(...st.map(s => s[k]))}`;
const avg = k => (st.reduce((s, x) => s + x[k], 0) / st.length).toFixed(1);
console.log(`Total Cross validator: ${PUZZLES.length} puzzles (0-${LEGACY - 1} original, ${LEGACY}-${PUZZLES.length - 1} new)`);
console.log(`Theme pair duplicates: ${report.themePairDuplicates.length}`); report.themePairDuplicates.forEach(d => console.log('  ' + d));
console.log(`New puzzles: ${newErr} errors, ${report.new.filter(x => !x.errs.length).length}/${report.new.length} clean`);
if (st.length) console.log(`  cols ${range('cols')} (avg ${avg('cols')}), rows ${range('rows')}, entries ${range('words')} (avg ${avg('words')}), longest ${range('longest')}`);
const f = fmt(report.new); if (f) console.log(f);
console.log(`Original puzzles (reported only, not modified): ${oldErr} errors in ${report.legacy.filter(x => x.errs.length).length} puzzles`);
const g = fmt(report.legacy); if (g) console.log(g);
const ji = process.argv.indexOf('--json'); if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(report, null, 2));
process.exit(newErr || report.themePairDuplicates.length ? 1 : 0);

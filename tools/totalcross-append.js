#!/usr/bin/env node
// Append generated puzzles (JSON array from tools/puzzle-gen-batch.js) to apps/totalcross/puzzles.js after the
// existing entries (indexes 0-65 are left byte-for-byte unchanged) and rebuild apps/totalcross/api/themes-catalog.json.
// Usage: node tools/totalcross-append.js new-puzzles.json
'use strict';
const fs = require('fs');
const path = require('path');
const PJ = path.join(__dirname, '../apps/totalcross/puzzles.js');
const CAT = path.join(__dirname, '../apps/totalcross/api/themes-catalog.json');
const add = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let src = fs.readFileSync(PJ, 'utf8');
const existing = new Function(src + '; return PUZZLES;')();
if (existing.length !== 66) throw new Error(`expected 66 existing puzzles, found ${existing.length} (already appended?)`);
add.forEach((p, i) => { if (p.id !== 66 + i) throw new Error(`id ${p.id} at position ${i}`); });
const end = src.indexOf('\n];\n');
if (end < 0) throw new Error('could not find end of PUZZLES array');
const body = add.map(p => JSON.stringify(p, null, 2).replace(/^/gm, '')).join(',\n');
src = src.slice(0, end) + ',\n' + body + src.slice(end);
fs.writeFileSync(PJ, src);
const all = new Function(src + '; return PUZZLES;')();
const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const out = {
  launchDate: cat.launchDate,
  legacyCount: 66,
  cutoverDate: '2026-10-12',
  themes: all.map(p => ({ acrossTheme: p.acrossTheme, downTheme: p.downTheme })),
};
fs.writeFileSync(CAT, JSON.stringify(out, null, 2) + '\n');
console.log(`appended ${add.length}; PUZZLES now ${all.length}; catalog themes ${out.themes.length}`);

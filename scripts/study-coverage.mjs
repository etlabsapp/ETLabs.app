#!/usr/bin/env node
/* Coverage + sanity check for study/index.html (Security+ SY0-701 deck).
   Usage: node scripts/study-coverage.mjs [--quiet]
   Fails (exit 1) if any objective lacks term cards or scenarios, an answer index is invalid,
   a question/term repeats, or a domain is too small for a ranked round. */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "study/index.html"), "utf8");
const a = html.indexOf("/* ==== DECK START"), b = html.indexOf("/* ============================ END DECK");
if (a < 0 || b < 0) { console.error("deck markers not found"); process.exit(1); }
const ctx = {};
vm.runInNewContext(html.slice(a, b) + "\n;this.D={DOMAINS,OBJECTIVES,CARDS_ALL,SCEN_ALL,ROUND};this.PBQ=typeof PBQ_ALL==='undefined'?[]:PBQ_ALL;", ctx);
const { DOMAINS, OBJECTIVES, CARDS_ALL, SCEN_ALL, ROUND } = ctx.D;

const MIN_TERMS = 5, MIN_SCEN = 3;          // hard minimums per objective
const THIN_TERMS = 8, THIN_SCEN = 5;        // below these, flag as "thin" (warning only)
const EXPECTED = { 1: 4, 2: 5, 3: 4, 4: 9, 5: 6 };  // SY0-701: 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.9, 5.1-5.6
const errors = [], warns = [];
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// objectives list matches the official outline
for (const [d, n] of Object.entries(EXPECTED)) {
  if (!DOMAINS[d]) errors.push(`domain ${d} missing`);
  for (let i = 1; i <= n; i++) if (!OBJECTIVES[`${d}.${i}`]) errors.push(`objective ${d}.${i} missing`);
}
if (Object.keys(OBJECTIVES).length !== 28) errors.push(`expected 28 objectives, found ${Object.keys(OBJECTIVES).length}`);

// term cards
const seenTerm = new Map(), seenMeaning = new Map();
CARDS_ALL.forEach((c, i) => {
  const at = `card[${i}] "${c.term}"`;
  if (!OBJECTIVES[c.o]) errors.push(`${at}: unknown objective ${c.o}`);
  if (!c.term || !c.meaning) errors.push(`${at}: empty term or meaning`);
  const t = norm(c.term), m = norm(c.meaning);
  if (seenTerm.has(t)) errors.push(`${at}: duplicate term (also card[${seenTerm.get(t)}])`); else seenTerm.set(t, i);
  if (seenMeaning.has(m)) errors.push(`${at}: duplicate meaning (also card[${seenMeaning.get(m)}])`); else seenMeaning.set(m, i);
  if (c.meaning.length > 120) warns.push(`${at}: meaning is long (${c.meaning.length} chars)`);
});

// scenarios
const seenQ = new Map();
SCEN_ALL.forEach((s, i) => {
  const at = `scen[${i}] (${s.o}) "${String(s.q).slice(0, 50)}..."`;
  if (!OBJECTIVES[s.o]) errors.push(`${at}: unknown objective ${s.o}`);
  if (!Array.isArray(s.options) || s.options.length !== 4) errors.push(`${at}: needs exactly 4 options`);
  else {
    if (new Set(s.options.map(norm)).size !== 4) errors.push(`${at}: duplicate options`);
    if (s.options.some(o => !String(o).trim())) errors.push(`${at}: empty option`);
  }
  if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer > 3) errors.push(`${at}: answer index ${s.answer} is not 0-3`);
  if (!s.why || !String(s.why).trim()) errors.push(`${at}: missing why`);
  const q = norm(s.q);
  if (seenQ.has(q)) errors.push(`${at}: duplicate question (also scen[${seenQ.get(q)}])`); else seenQ.set(q, i);
});

// per-objective coverage table
const rows = [];
const dom = {};
for (const o of Object.keys(OBJECTIVES)) {
  const t = CARDS_ALL.filter(c => c.o === o).length, s = SCEN_ALL.filter(x => x.o === o).length;
  const d = o.split(".")[0]; dom[d] = dom[d] || { t: 0, s: 0 }; dom[d].t += t; dom[d].s += s;
  if (t < MIN_TERMS) errors.push(`objective ${o}: only ${t} term cards (min ${MIN_TERMS})`);
  if (s < MIN_SCEN) errors.push(`objective ${o}: only ${s} scenarios (min ${MIN_SCEN})`);
  const thin = t < THIN_TERMS || s < THIN_SCEN;
  if (thin) warns.push(`objective ${o} is thin: ${t} terms, ${s} scenarios`);
  rows.push(`${o.padEnd(4)} ${String(t).padStart(4)} ${String(s).padStart(5)}${thin ? "  THIN" : ""}  ${OBJECTIVES[o]}`);
}
// every domain must fill a ranked round
for (const d of Object.keys(DOMAINS)) {
  if ((dom[d] || {}).t < ROUND.terms) errors.push(`domain ${d}: ${dom[d].t} terms < terms round size ${ROUND.terms}`);
  if ((dom[d] || {}).s < ROUND.scen) errors.push(`domain ${d}: ${dom[d].s} scenarios < scenario round size ${ROUND.scen}`);
}
// client round sizes must match the leaderboard worker
const router = fs.readFileSync(path.join(root, "workers/router.js"), "utf8");
for (const k of ["exam", "d1", "d2", "d3", "d4", "d5"]) {
  const m = new RegExp(`"${k}":\\s*STUDY_EXAM_DECK`).test(router);
  if (!m) errors.push(`workers/router.js: STUDY_DECKS has no "${k}" entry`);
}
const rm = /const STUDY_EXAM_DECK = \{([\s\S]*?)\};/.exec(router);
if (rm) for (const mode of ["terms", "scen", "mixed", "cert"]) {
  const q = new RegExp(`${mode}:\\s*\\{\\s*questions:\\s*(\\d+)`).exec(rm[1]);
  const want = mode === "mixed" ? ROUND.mixed * 2 : ROUND[mode];
  if (!q || +q[1] !== want) errors.push(`router STUDY_EXAM_DECK.${mode}.questions = ${q && q[1]}, client round = ${want}`);
} else errors.push("workers/router.js: STUDY_EXAM_DECK not found");

if (!process.argv.includes("--quiet")) {
  console.log("obj  terms scen   objective");
  rows.forEach(r => console.log(r));
  console.log("\ndomain totals:");
  for (const d of Object.keys(DOMAINS)) console.log(`  ${d}.0 ${DOMAINS[d].padEnd(42)} ${String(dom[d].t).padStart(4)} terms ${String(dom[d].s).padStart(4)} scenarios`);
  console.log(`  ALL ${"".padEnd(43)}${String(CARDS_ALL.length).padStart(4)} terms ${String(SCEN_ALL.length).padStart(4)} scenarios`);
  const ans = [0, 1, 2, 3].map(k => SCEN_ALL.filter(s => s.answer === k).length);
  console.log(`  answer index spread A/B/C/D: ${ans.join("/")} (options are shuffled on screen anyway)`);
}
// PBQ validation: objective exists, 2+ items, every answer is one of the choices, unique titles (titles key the seen/missed stores)
{
  const P = ctx.PBQ || [], titles = new Set(), per = {};
  P.forEach((p, i) => {
    const tag = `pbq[${i}] (${p.o}) "${p.title}"`;
    if (!OBJECTIVES[p.o]) errors.push(`${tag}: unknown objective`);
    if (!Array.isArray(p.items) || p.items.length < 2) errors.push(`${tag}: needs 2+ items`);
    if (!Array.isArray(p.choices) || new Set(p.choices).size !== p.choices.length) errors.push(`${tag}: choices missing or duplicated`);
    (p.items || []).forEach(([label, ans]) => { if (!(p.choices || []).includes(ans)) errors.push(`${tag}: answer "${ans}" for "${label}" is not a choice`); });
    if (!p.prompt || !p.exhibit || !p.why) errors.push(`${tag}: prompt, exhibit and why are required`);
    if (titles.has(p.title)) errors.push(`${tag}: duplicate title`); titles.add(p.title);
    const d = p.o.split(".")[0]; per[d] = (per[d] || 0) + 1;
  });
  console.log(`\nPBQs: ${P.length} total, per domain ` + Object.keys(DOMAINS).map(d => d + ":" + (per[d] || 0)).join(" "));
}
warns.forEach(w => console.log("WARN  " + w));
errors.forEach(e => console.log("ERROR " + e));
console.log(errors.length ? `\nFAIL: ${errors.length} error(s)` : `\nOK: ${Object.keys(OBJECTIVES).length} objectives covered, ${CARDS_ALL.length} terms, ${SCEN_ALL.length} scenarios`);
process.exit(errors.length ? 1 : 0);

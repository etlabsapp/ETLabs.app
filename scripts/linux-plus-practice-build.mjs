/**
 * Builds linux-plus/practice-tests.json from the question files in linux-plus/src/practice/set{1,2,3}.txt.
 *
 * File format, one block per question:
 *   @ <number>
 *   stem paragraph (one per line), with ``` fenced blocks for terminal output
 *   * correct option :: why it is right
 *   - wrong option :: why it is wrong
 * "⏎" inside an option is a line break. "(Choose two.)" / "(Select three.)" in the stem must match the number of * options.
 *
 * Run from linux-plus/: npm run build:practice  (also runs as part of npm test, which fails on any problem)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = join(here, "..", "linux-plus");
export const SET_INFO = [
  { set: 1, title: "Set 1", count: 28 },
  { set: 2, title: "Set 2", count: 100 },
  { set: 3, title: "Set 3", count: 99 },
];

export function parseSet(text, set) {
  const problems = [];
  const out = [];
  const parts = text.split(/^@ (\d+)\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const id = `s${set}q${n}`;
    const stem = [];
    const options = [];
    const answer = [];
    let code = null;
    for (const line of parts[i + 1].replace(/^\n+|\n+$/g, "").split("\n")) {
      if (line.startsWith("```")) {
        if (code) { stem.push({ t: "code", v: code.join("\n") }); code = null; } else code = [];
        continue;
      }
      if (code) { code.push(line); continue; }
      const m = /^([*-]) (.*?) :: (.*)$/.exec(line);
      if (m) {
        if (m[1] === "*") answer.push(options.length);
        options.push({ text: m[2].replace(/⏎/g, "\n"), why: m[3].trim() });
        continue;
      }
      if (line.trim()) stem.push({ t: "p", v: line.trim() });
    }
    if (code) problems.push(`${id}: unclosed code block`);
    const stemText = stem.filter((b) => b.t === "p").map((b) => b.v).join(" ");
    const mm = /\((?:Choose|Select) (two|three)\.?\)/.exec(stemText);
    const want = mm ? { two: 2, three: 3 }[mm[1]] : 1;
    if (answer.length !== want) problems.push(`${id}: stem asks for ${want} answer(s) but ${answer.length} are marked`);
    if (options.length < 4) problems.push(`${id}: only ${options.length} options`);
    if (!stemText) problems.push(`${id}: empty stem`);
    if (options.some((o) => !o.why || !o.text)) problems.push(`${id}: option without text or explanation`);
    out.push({ id, set, n, stem, options, answer });
  }
  return { questions: out, problems };
}

/** Well-known public service addresses (DNS resolvers, example.com, public NTP) that are fine in study material. */
const WELL_KNOWN = new Set(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4", "9.9.9.9", "93.184.215.14", "93.184.216.34", "162.159.200.1", "162.159.200.123"]);

/** IPv4 addresses that are not documentation (RFC 5737), private, loopback, link-local, a netmask or well known. */
export function publicIps(text) {
  const out = [];
  for (const m of text.matchAll(/(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g)) {
    const [a, b, c] = m.slice(1, 4).map(Number);
    if (m.slice(1, 5).some((x) => Number(x) > 255)) continue;
    const ok = a === 10 || a === 127 || a === 0 || a >= 224 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
      || (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || (a === 100 && b >= 64 && b <= 127) || a === 255;
    if (!ok && !WELL_KNOWN.has(m[0])) out.push(m[0]);
  }
  return out;
}

export function buildAll(root = defaultRoot) {
  const all = [];
  const problems = [];
  for (const info of SET_INFO) {
    const r = parseSet(readFileSync(join(root, "src", "practice", `set${info.set}.txt`), "utf8"), info.set);
    if (r.questions.length !== info.count) problems.push(`set ${info.set}: ${r.questions.length} questions, expected ${info.count}`);
    const ids = new Set();
    for (const q of r.questions) { if (ids.has(q.id)) problems.push(`duplicate ${q.id}`); ids.add(q.id); }
    all.push(...r.questions);
    problems.push(...r.problems);
  }
  const blob = JSON.stringify(all);
  for (const ip of publicIps(blob)) problems.push(`public IP address ${ip} in question text (use 203.0.113.x, 198.51.100.x, 192.0.2.x or a private range)`);
  return { questions: all, problems, json: JSON.stringify({ version: 1, sets: SET_INFO, questions: all }) };
}

if (process.argv[1] && /linux-plus-practice-build\.mjs$/.test(process.argv[1])) {
  const { questions, problems, json } = buildAll();
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  writeFileSync(join(defaultRoot, "practice-tests.json"), json + "\n");
  console.log(`wrote practice-tests.json: ${questions.length} questions`);
}

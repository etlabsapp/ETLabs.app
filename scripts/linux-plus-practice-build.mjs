/**
 * Builds linux-plus/practice-tests.json, the single exam question pool, from the question banks in linux-plus/src/practice/bank-{a,b,c,d}.txt.
 * Banks a to c are rewritten class practice questions. Bank d is written from the class review sheet. The exam UI treats them as one pool.
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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = join(here, "..", "linux-plus");
export const BANKS = [
  { file: "bank-a.txt", prefix: "a", count: 28 },
  { file: "bank-b.txt", prefix: "b", count: 100 },
  { file: "bank-c.txt", prefix: "c", count: 99 },
  { file: "bank-d.txt", prefix: "d", count: 23 },
];
export const POOL_SIZE = BANKS.reduce((t, b) => t + b.count, 0);

export function parseBank(text, prefix) {
  const problems = [];
  const out = [];
  const parts = text.split(/^@ (\d+)\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const id = `${prefix}${n}`;
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
    out.push({ id, stem, options, answer });
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


// ---------- Spoken scripts for the recorded voice (hands-free mode) ----------
// linux-plus/src/practice/spoken-{a,b,c,d}.txt hold what the recorded voice says for each question (see the header of spoken-a.txt).
// Every line becomes one clip, linux-plus/audio/<hash>.mp3, named by a hash of the voice, speed and text, so editing a line
// gives it a new name and the old clip is never played for the new text. Clips are rendered offline by
// scripts/linux-plus-voice-render.py. A line whose clip is missing has no "a" field and the site reads it with the device voice.
export const VOICE = { id: "af_heart", speed: 1, commandSpeed: 0.85 };
export const AUDIO_DIR = "audio";
export const clipName = (text, speed = VOICE.speed) => createHash("sha1").update(`kokoro|${VOICE.id}|${speed}|${text}`).digest("hex").slice(0, 16);
const LETTERS = "ABCDEFGH";
const NUMS = { 2: "two", 3: "three" };

/** Everything the recorded voice says outside a question. Keys are used by the site. */
export function globalLines() {
  const g = { letters: {}, correct: "Correct.", wrong: {}, prompts: {
    reprompt: "Say your answer, or say repeat.",
    already: "That one is already answered. Say next to continue.",
    need2: "This question needs two answers, for example A and C.",
    need3: "This question needs three answers, for example A, C and D.",
    sample: "This is how questions will sound.",
  } };
  for (const L of LETTERS) { g.letters[L] = `${L}.`; g.wrong[L] = `Not quite, the answer is ${L}.`; }
  for (let n = 4; n <= LETTERS.length; n++) {
    const l = LETTERS.slice(0, n).split("");
    g.prompts[`sorry${n}`] = `Sorry, I didn't catch that. Say ${l.slice(0, -1).join(", ")} or ${l[n - 1]}, or say repeat.`;
  }
  const combos = (k, start = 0, pre = []) => (pre.length === k ? [pre.join("")] : LETTERS.slice(start).split("").flatMap((c, i) => combos(k, start + i + 1, [...pre, c])));
  for (const k of [2, 3]) for (const c of combos(k)) {
    const l = c.split("");
    g.wrong[c] = `Not quite, the answers are ${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}.`;
  }
  return g;
}

export function parseSpoken(text) {
  const out = {};
  const problems = [];
  for (const block of text.split(/^@ /m).slice(1)) {
    const [head, ...lines] = block.split("\n");
    const id = head.trim();
    const s = { stem: "", options: [], reason: "", command: "" };
    for (const line of lines) {
      const m = /^([SORC]): (.+)$/.exec(line.trim());
      if (!m) { if (line.trim() && !line.startsWith("#")) problems.push(`${id}: bad spoken line "${line}"`); continue; }
      if (m[1] === "S") s.stem = m[2].trim(); else if (m[1] === "O") s.options.push(m[2].trim()); else if (m[1] === "R") s.reason = m[2].trim(); else s.command = m[2].trim();
    }
    if (out[id]) problems.push(`${id}: spoken script given twice`);
    out[id] = s;
  }
  return { spoken: out, problems };
}

const words = (t) => t.split(/\s+/).filter(Boolean).length;
/** Rules for what the recorded voice says. Returns problems for one question. */
export function lintSpoken(q, s) {
  const p = [];
  const id = q.id;
  if (!s) return [`${id}: no spoken script`];
  if (!s.stem) p.push(`${id}: spoken stem missing`);
  if (!s.reason) p.push(`${id}: spoken reason missing`);
  if (s.options.length !== q.options.length) p.push(`${id}: ${s.options.length} spoken options for ${q.options.length} options`);
  s.options.forEach((o, i) => { if (words(o) > 16) p.push(`${id}: spoken option ${i + 1} has ${words(o)} words (keep it under about 15)`); });
  if (words(s.reason) > 45) p.push(`${id}: spoken reason has ${words(s.reason)} words`);
  const plain = [s.stem, ...s.options, s.reason];
  for (const t of plain) {
    const bad = t.match(/[\/\\|$=<>~*`_@#{}\[\];]|(^|\s)-\w|\s-\s/g);
    if (bad) p.push(`${id}: raw symbol ${JSON.stringify(bad.join(""))} in "${t}" (say it in words; only the command line may spell symbols, and it spells them as words too)`);
    if (/\b(option|answer|choice)s? [A-H]\b|\b[A-H] (is|was) (right|correct|wrong)\b/.test(t)) p.push(`${id}: "${t}" names an option letter, but letters are shuffled`);
  }
  if (s.command && /[\/\\|$=<>~*`_@#{}\[\];]|(^|\s)-\w/.test(s.command)) p.push(`${id}: command line should spell symbols as words: "${s.command}"`);
  if (s.command && !/^The (commands? (is|are)|line is|instruction is|operator is): /.test(s.command)) p.push(`${id}: command line should start with "The command is: "`);
  const want = q.answer.length;
  if (want > 1 && !new RegExp(`Pick ${NUMS[want]} answers\\.$`).test(s.stem)) p.push(`${id}: spoken stem should end with "Pick ${NUMS[want]} answers."`);
  if (want === 1 && /Pick (two|three) answers/.test(s.stem)) p.push(`${id}: spoken stem asks for more than one answer`);
  return p;
}

const clip = (root, text, speed = VOICE.speed) => {
  const a = clipName(text, speed);
  return existsSync(join(root, AUDIO_DIR, `${a}.mp3`)) ? { t: text, a } : { t: text };
};
/** Adds q.spoken to every question and returns the global lines, each as {t, a?}. */
export function attachSpoken(root, questions, spoken) {
  const problems = [];
  for (const q of questions) {
    const s = spoken[q.id];
    problems.push(...lintSpoken(q, s));
    if (!s) continue;
    q.spoken = { stem: clip(root, s.stem), options: s.options.map((o) => clip(root, o)), reason: clip(root, s.reason) };
    if (s.command) q.spoken.command = clip(root, s.command, VOICE.commandSpeed);
  }
  for (const id of Object.keys(spoken)) if (!questions.some((q) => q.id === id)) problems.push(`spoken script for unknown question ${id}`);
  const g = globalLines();
  const map = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clip(root, v)]));
  const voice = { voice: VOICE.id, base: `/linux-plus/${AUDIO_DIR}/`, letters: map(g.letters), correct: clip(root, g.correct), wrong: map(g.wrong), prompts: map(g.prompts) };
  return { voice, problems };
}

/** Every clip the site can ask for: [name, text, speed]. Used by the renderer. */
export function allClips(questions, voice) {
  const out = new Map();
  const add = (c, speed = VOICE.speed) => out.set(clipName(c.t, speed), [c.t, speed]);
  for (const q of questions) {
    if (!q.spoken) continue;
    add(q.spoken.stem); q.spoken.options.forEach((o) => add(o)); add(q.spoken.reason);
    if (q.spoken.command) add(q.spoken.command, VOICE.commandSpeed);
  }
  Object.values(voice.letters).forEach((c) => add(c)); add(voice.correct);
  Object.values(voice.wrong).forEach((c) => add(c)); Object.values(voice.prompts).forEach((c) => add(c));
  return out;
}

export function buildAll(root = defaultRoot) {
  const all = [];
  const problems = [];
  const ids = new Set();
  for (const bank of BANKS) {
    const r = parseBank(readFileSync(join(root, "src", "practice", bank.file), "utf8"), bank.prefix);
    if (r.questions.length !== bank.count) problems.push(`${bank.file}: ${r.questions.length} questions, expected ${bank.count}`);
    for (const q of r.questions) { if (ids.has(q.id)) problems.push(`duplicate ${q.id}`); ids.add(q.id); }
    all.push(...r.questions);
    problems.push(...r.problems);
  }
  const spoken = {};
  for (const bank of BANKS) {
    const f = join(root, "src", "practice", `spoken-${bank.prefix}.txt`);
    if (!existsSync(f)) continue;
    const r = parseSpoken(readFileSync(f, "utf8"));
    Object.assign(spoken, r.spoken);
    problems.push(...r.problems);
  }
  const sp = attachSpoken(root, all, spoken);
  problems.push(...sp.problems);
  const blob = JSON.stringify(all);
  for (const ip of publicIps(blob)) problems.push(`public IP address ${ip} in question text (use 203.0.113.x, 198.51.100.x, 192.0.2.x or a private range)`);
  return { questions: all, voice: sp.voice, problems, json: JSON.stringify({ version: 3, total: all.length, voice: sp.voice, questions: all }) };
}

if (process.argv[1] && /linux-plus-practice-build\.mjs$/.test(process.argv[1])) {
  const { questions, voice, problems, json } = buildAll();
  if (process.argv.includes("--clips")) {
    // For the renderer: every clip as JSON lines {name, text, speed}, then exit without writing the pool.
    for (const [name, [text, speed]] of allClips(questions, voice)) console.log(JSON.stringify({ name, text, speed }));
    process.exit(0);
  }
  if (problems.length && !process.argv.includes("--draft")) { console.error(problems.join("\n")); process.exit(1); }
  if (problems.length) console.error(problems.join("\n"));
  writeFileSync(join(defaultRoot, "practice-tests.json"), json + "\n");
  console.log(`wrote practice-tests.json: ${questions.length} questions`);
}

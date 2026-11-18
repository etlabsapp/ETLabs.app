/**
 * Checks the Linux+ practice exam pool, timer math, the random sampler and question rotation.
 * Run from linux-plus/: npm test (bundled with esbuild, so paths are taken from the working directory).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAll, BANKS, POOL_SIZE, publicIps } from "./linux-plus-practice-build.mjs";
import { isCorrect } from "../linux-plus/src/practice.tsx";
import { PRESETS, timeLimitSeconds, formatClock, clampCount, drawExam, recordExam, weightFor, optionOrder, seededRng, missedIds, W_UNSEEN } from "../linux-plus/src/exam.ts";

const root = process.cwd();
const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(name + (detail ? ": " + detail : "")); else console.log("ok", name + (detail ? " (" + detail + ")" : "")); };

// ---- pool ----
const { questions, problems, json } = buildAll(root);
check("question banks parse with no problems", problems.length === 0, problems.join("; "));
check("pool has 250 questions", questions.length === 250 && POOL_SIZE === 250, String(questions.length));
check("question ids are unique", new Set(questions.map((q) => q.id)).size === questions.length);
check("bank d (review sheet) has 23 questions", questions.filter((q) => q.id.startsWith("d")).length === 23);
for (const b of BANKS) check(`${b.file} count matches`, questions.filter((q) => q.id.startsWith(b.prefix) && /^\D+\d+$/.test(q.id) && q.id.replace(/\d+$/, "") === b.prefix).length === b.count);
const multi = questions.filter((q) => q.answer.length > 1);
check("multi-answer questions present", multi.length >= 6, String(multi.length));
for (const q of questions) {
  const text = q.stem.map((b) => b.v).join(" ");
  const asks = /\((?:Choose|Select) two\.?\)/.test(text) ? 2 : /\((?:Choose|Select) three\.?\)/.test(text) ? 3 : 1;
  if (asks !== q.answer.length || q.answer.length >= q.options.length || new Set(q.answer).size !== q.answer.length || q.answer.some((a) => a < 0 || a >= q.options.length))
    check(`${q.id} has a valid answer count`, false, `asks ${asks}, marked ${q.answer.length} of ${q.options.length}`);
}
check("every multi-answer question asks for the marked count", true);
check("every option has an explanation", questions.every((q) => q.options.every((o) => o.text && o.why)));
const committed = readFileSync(join(root, "practice-tests.json"), "utf8").trim();
check("practice-tests.json is up to date (run npm run build:practice)", committed === json);
const lab = readFileSync(join(root, "lab.js"), "utf8");
for (const [name, text] of [["practice-tests.json", committed], ["lab.js", lab]]) {
  check(`${name} has only documentation or private IP addresses`, publicIps(text).length === 0, publicIps(text).slice(0, 5).join(", "));
}
check("question data is not bundled into lab.js", !lab.includes(questions[0].options[0].why));
check("no set wording left in the exam UI", !/\bSet [123]\b|Shuffle all|setN|"sets"/.test(lab) && !/"sets"/.test(committed));
const page = readFileSync(join(root, "index.html"), "utf8") + lab;
check("CompTIA disclaimer is on the page", /Not affiliated with or endorsed by CompTIA/.test(page));

// ---- timer ----
check("timer is 1 minute per question", timeLimitSeconds(1) === 60 && timeLimitSeconds(10) === 600 && timeLimitSeconds(90) === 5400 && timeLimitSeconds(250) === 15000);
check("presets are 10, 25, 50, 90", JSON.stringify(PRESETS) === "[10,25,50,90]");
check("clock formats", formatClock(0) === "0:00" && formatClock(59.2) === "1:00" && formatClock(600) === "10:00" && formatClock(5400) === "1:30:00" && formatClock(-5) === "0:00");
check("custom count clamps to 1..250", clampCount("0", 250) === 0 && clampCount("abc", 250) === 0 && clampCount("1", 250) === 1 && clampCount("90", 250) === 90 && clampCount("999", 250) === 250);

// ---- sampler ----
const ids = questions.map((q) => q.id);
const rng = seededRng(42);
let noRepeat = true, sizeOk = true;
for (const n of [1, 10, 25, 50, 90, 137, 250]) for (let t = 0; t < 40; t++) {
  const e = drawExam(ids, n, {}, 1, rng);
  if (e.length !== n) sizeOk = false;
  if (new Set(e).size !== e.length || e.some((id) => !ids.includes(id))) noRepeat = false;
}
check("sampler returns the requested count", sizeOk);
check("sampler never repeats a question within an exam", noRepeat);
const a = drawExam(ids, 50, {}, 1, rng), b = drawExam(ids, 50, {}, 1, rng);
check("two exams are not alike", a.join() !== b.join() && a.filter((x) => b.includes(x)).length < 30);
const full1 = drawExam(ids, 250, {}, 1, rng), full2 = drawExam(ids, 250, {}, 1, rng);
check("a full exam covers every question in a new order", new Set(full1).size === 250 && full1.join() !== full2.join());
const o1 = optionOrder("1:a1", 4), o2 = optionOrder("2:a1", 4);
check("option order is a stable permutation", JSON.stringify(optionOrder("1:a1", 4)) === JSON.stringify(o1) && [...o1].sort().join() === "0,1,2,3");
let differs = 0; for (let e = 1; e <= 20; e++) if (optionOrder(`${e}:a1`, 4).join() !== o1.join()) differs++;
check("answer order changes between exams", differs >= 12, `${differs}/20`);
let spread = [0, 0, 0, 0];
for (const q of questions) if (q.answer.length === 1 && q.options.length === 4) spread[optionOrder(`7:${q.id}`, 4).indexOf(q.answer[0])]++;
check("correct answers are spread across letters", Math.max(...spread) < 0.4 * questions.length, spread.join("/"));
check("grading", questions.every((q) => {
  const wrong = q.options.findIndex((_, i) => !q.answer.includes(i));
  return isCorrect(q, q.answer) && isCorrect(q, [...q.answer].reverse()) && !isCorrect(q, [wrong, ...q.answer.slice(1)]) && !isCorrect(q, q.answer.slice(0, -1).length ? q.answer.slice(0, -1) : []);
}));

// ---- rotation ----
check("unseen questions far outweigh the last exam's", weightFor(undefined, 2) === W_UNSEEN && W_UNSEEN >= 40 && weightFor({ last: 1, times: 1, missed: false }, 2) === 1);
check("missed questions get a boost", weightFor({ last: 1, times: 1, missed: true }, 2) === 6 && weightFor({ last: 1, times: 1, missed: true }, 9) > weightFor({ last: 1, times: 1, missed: false }, 9));
check("older questions come back gradually", weightFor({ last: 1, times: 1, missed: false }, 3) === 2 && weightFor({ last: 1, times: 1, missed: false }, 30) === 4 && weightFor({ last: 1, times: 3, missed: false }, 30) === 8 / 3);
// Overlap between consecutive 50-question exams: random draws average 10 shared questions; rotation should cut that well down.
let overlap = 0, plain = 0; const trials = 200;
for (let t = 0; t < trials; t++) {
  const r = seededRng(1000 + t);
  const first = drawExam(ids, 50, {}, 1, r);
  const seen = recordExam({}, 1, Object.fromEntries(first.map((id) => [id, true])));
  const second = drawExam(ids, 50, seen, 2, r);
  overlap += second.filter((id) => first.includes(id)).length;
  plain += drawExam(ids, 50, {}, 2, r).filter((id) => first.includes(id)).length;
}
check("rotation: the last exam's questions are much less likely next time", overlap / trials < 3 && plain / trials > 7, `avg overlap ${(overlap / trials).toFixed(2)} vs ${(plain / trials).toFixed(2)} without history`);
// Missed questions should come back more often than ones answered right in the same exam.
let backMissed = 0, backRight = 0;
for (let t = 0; t < trials; t++) {
  const r = seededRng(5000 + t);
  const first = drawExam(ids, 50, {}, 1, r);
  const res = Object.fromEntries(first.map((id, i) => [id, i % 2 === 0]));
  const seen = recordExam({}, 1, res);
  const second = drawExam(ids, 50, seen, 2, r);
  for (const id of second) if (id in res) { if (res[id]) backRight++; else backMissed++; }
}
check("rotation: missed questions return far more often than right ones", backMissed > 3 * backRight, `${backMissed} missed vs ${backRight} right`);
// Coverage: repeated 25-question exams, all answered right, should see the whole pool soon (10 exams is the minimum).
const r = seededRng(9); let seen = {}, examsToCover = 0;
while (Object.keys(seen).length < 250 && examsToCover < 100) {
  examsToCover++;
  const e = drawExam(ids, 25, seen, examsToCover, r);
  seen = recordExam(seen, examsToCover, Object.fromEntries(e.map((id) => [id, true])));
}
check("rotation: every question gets covered", Object.keys(seen).length === 250 && examsToCover <= 15, `${examsToCover} exams of 25`);
const rs = recordExam({ a1: { last: 1, times: 1, missed: true } }, 2, { a1: true, b2: false });
check("missed list updates across exams", JSON.stringify(missedIds(rs)) === '["b2"]' && rs.a1.times === 2 && rs.a1.last === 2);

if (failures.length) { console.error("\nFAILED"); failures.forEach((f) => console.error(" -", f)); process.exit(1); }
console.log("\nAll practice exam checks passed.");

/**
 * Checks the Linux+ practice test data and quiz grading.
 * Run from linux-plus/: npm test (bundled with esbuild, so paths are taken from the working directory).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAll, SET_INFO, publicIps } from "./linux-plus-practice-build.mjs";
import { optionOrder, isCorrect } from "../linux-plus/src/practice.tsx";

const root = process.cwd();
const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(name + (detail ? ": " + detail : "")); else console.log("ok", name); };

const { questions, problems, json } = buildAll(root);
check("question files parse with no problems", problems.length === 0, problems.join("; "));
for (const info of SET_INFO) {
  const n = questions.filter((q) => q.set === info.set).length;
  check(`${info.title} has ${info.count} questions`, n === info.count, String(n));
}
check("227 questions in total", questions.length === 227, String(questions.length));
const multi = questions.filter((q) => q.answer.length > 1);
check("multi-answer questions present", multi.length >= 5, String(multi.length));
for (const q of multi) {
  const want = /\b(two|2)\b/i.test(q.stem.map((b) => b.v).join(" ")) ? 2 : /\b(three|3)\b/i.test(q.stem.map((b) => b.v).join(" ")) ? 3 : 0;
  check(`${q.id} asks for ${q.answer.length} answers`, want === q.answer.length, `stem asks for ${want}`);
}
const committed = readFileSync(join(root, "practice-tests.json"), "utf8").trim();
check("practice-tests.json is up to date (run npm run build:practice)", committed === json);
const lab = readFileSync(join(root, "lab.js"), "utf8");
for (const [name, text] of [["practice-tests.json", committed], ["lab.js", lab]]) {
  check(`${name} has only documentation or private IP addresses`, publicIps(text).length === 0, publicIps(text).slice(0, 5).join(", "));
}
check("question data is not bundled into lab.js", !lab.includes(questions[0].options[0].why));
const page = readFileSync(join(root, "index.html"), "utf8") + lab;
check("CompTIA disclaimer is on the page", /Not affiliated with or endorsed by CompTIA/.test(page));

let orderOk = true, spread = [0, 0, 0, 0, 0, 0];
for (const q of questions) {
  const o = optionOrder(q.id, q.options.length);
  if (o.length !== q.options.length || new Set(o).size !== o.length || JSON.stringify(optionOrder(q.id, q.options.length)) !== JSON.stringify(o)) orderOk = false;
  if (q.answer.length === 1) spread[o.indexOf(q.answer[0])]++;
  if (!isCorrect(q, q.answer) || isCorrect(q, q.options.map((_, i) => i).filter((i) => !q.answer.includes(i)).slice(0, q.answer.length))) orderOk = false;
  if (q.answer.length > 1 && isCorrect(q, q.answer.slice(0, 1))) orderOk = false;
}
check("option shuffle is stable and grading is right", orderOk);
check("correct answers are spread across letters", Math.max(...spread.slice(0, 4)) < 0.4 * questions.length, spread.join("/"));

if (failures.length) { console.error("\nFAILED"); failures.forEach((f) => console.error(" -", f)); process.exit(1); }
console.log("\nAll practice test checks passed.");

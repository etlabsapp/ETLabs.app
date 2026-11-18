/**
 * Tests for the recorded voice and the hands-free conversation: on-screen letters under shuffling, correct vs wrong
 * feedback, and the wait / re-prompt / repeat / sorry / next flow, using a fake speech engine and clock.
 * Run from linux-plus/: npm test (after npm run build:practice).
 */
import { readFileSync } from "node:fs";
import { questionParts, feedbackParts, promptParts, shownAnswer, textOnly, clipUrls } from "../linux-plus/src/spoken.ts";
import { HandsFreeFlow, FLOW_DEFAULTS } from "../linux-plus/src/flow.ts";
import { optionOrder } from "../linux-plus/src/exam.ts";

const failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(name + (detail ? ": " + detail : "")); else console.log("ok", name); };
const eq = (name, got, want) => check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ---- spoken parts ----
const pack = {
  voice: "af_heart", base: "/a/",
  letters: Object.fromEntries("ABCDEFGH".split("").map((L) => [L, { t: `${L}.`, a: `l${L}` }])),
  correct: { t: "Correct.", a: "ok" },
  wrong: { A: { t: "Not quite, the answer is A.", a: "wA" }, B: { t: "Not quite, the answer is B.", a: "wB" }, C: { t: "Not quite, the answer is C.", a: "wC" }, D: { t: "Not quite, the answer is D.", a: "wD" }, AC: { t: "Not quite, the answers are A and C.", a: "wAC" }, BD: { t: "Not quite, the answers are B and D.", a: "wBD" } },
  prompts: { reprompt: { t: "Say your answer, or say repeat.", a: "rp" }, sorry4: { t: "Sorry, I didn't catch that. Say A, B, C or D, or say repeat.", a: "s4" } },
};
const sp = { stem: { t: "Which one?", a: "st" }, options: [{ t: "zero", a: "o0" }, { t: "one", a: "o1" }, { t: "two", a: "o2" }, { t: "three" }], reason: { t: "Because.", a: "rs" }, command: { t: "The command is: L S block.", a: "cm" } };
const order = [2, 0, 3, 1]; // on screen: A=two, B=zero, C=three, D=one
eq("shown answer follows the shuffle", shownAnswer(order, [0]), "B");
eq("shown multi-answer follows the shuffle", shownAnswer(order, [1, 3]), "CD");
eq("multi-answer letters are in screen order", shownAnswer(order, [3, 2]), "AC");
eq("question reads shuffled options with on-screen letters", questionParts(sp, order, pack).map((p) => p.text), ["Which one?", "A.", "two", "B.", "zero", "C.", "three", "D.", "one"]);
eq("question clips point at the recordings", questionParts(sp, order, pack).map((p) => p.clip ?? null), ["/a/st.mp3", "/a/lA.mp3", "/a/o2.mp3", "/a/lB.mp3", "/a/o0.mp3", "/a/lC.mp3", null, "/a/lD.mp3", "/a/o1.mp3"]);
eq("correct feedback: Correct. + reason, no command", feedbackParts(sp, order, [0], true, pack).map((p) => p.text), ["Correct.", "Because."]);
eq("wrong feedback: shown letter + reason + command", feedbackParts(sp, order, [0], false, pack).map((p) => p.text), ["Not quite, the answer is B.", "Because.", "The command is: L S block."]);
eq("wrong feedback multi-answer says the shown letters", feedbackParts(sp, order, [3, 2], false, pack)[0], { text: "Not quite, the answers are A and C.", clip: "/a/wAC.mp3" });
eq("wrong feedback without a clip falls back to text", feedbackParts(sp, [3, 2, 1, 0], [3, 2], false, pack)[0], { text: "Not quite, the answers are A and B." });
eq("sorry prompt uses the option count", promptParts(pack, "sorry", 4)[0].clip, "/a/s4.mp3");
eq("sorry prompt for 5 options without a clip", promptParts(pack, "sorry", 5)[0].text, "Sorry, I didn't catch that. Say A, B, C, D or E, or say repeat.");
eq("device voice drops clips", clipUrls(textOnly(questionParts(sp, order, pack))), []);

// ---- the real bank: every question has a script, and every shuffle has a matching recorded line ----
const data = JSON.parse(readFileSync("practice-tests.json", "utf8"));
check("bank has the voice pack", !!data.voice && data.voice.voice === "af_heart");
const missing = data.questions.filter((q) => !q.spoken || q.spoken.options.length !== q.options.length);
check("all questions have a spoken script with one line per option", missing.length === 0, missing.map((q) => q.id).join(","));
let combos = 0, bad = [];
for (const q of data.questions) {
  if (!q.spoken) continue;
  for (let k = 0; k < 6; k++) {
    const ord = optionOrder(`${k}:${q.id}`, q.options.length);
    const letters = shownAnswer(ord, q.answer);
    combos++;
    if (!data.voice.wrong[letters]) bad.push(`${q.id}:${letters}`);
    const f = feedbackParts(q.spoken, ord, q.answer, false, data.voice)[0].text;
    const want = letters.length === 1 ? `the answer is ${letters}.` : `the answers are`;
    if (!f.includes(want)) bad.push(`${q.id}:${f}`);
    const qp = questionParts(q.spoken, ord, data.voice);
    if (qp.length !== 1 + 2 * q.options.length || qp[2].text !== q.spoken.options[ord[0]].t) bad.push(`${q.id}:order`);
  }
}
check(`every shuffle has a recorded wrong-answer line (${combos} checked)`, bad.length === 0, bad.slice(0, 5).join(" | "));
const clips = new Set();
for (const q of data.questions) if (q.spoken) for (const c of [q.spoken.stem, q.spoken.reason, q.spoken.command, ...q.spoken.options]) if (c?.a) clips.add(c.a);
const lines = data.questions.reduce((n, q) => n + (q.spoken ? 2 + q.spoken.options.length + (q.spoken.command ? 1 : 0) : 0), 0);
console.log(`recorded lines: ${clips.size} unique clips for ${lines} question lines`);

// ---- flow with a fake engine and clock ----
function rig({ canListen = true, need = 1, n = 4 } = {}) {
  let now = 0, seq = 0;
  const timers = new Map();
  const clock = { set: (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; }, clear: (id) => timers.delete(id), now: () => now };
  const log = [];
  const eng = { speaking: null, listening: null, listens: 0,
    speak(parts, done) { this.speaking = { parts, done }; this.listening = null; log.push("say:" + parts.map((p) => p.text).join(" ")); },
    listen(onText, onEnd) { if (this.speaking) log.push("BUG: listening while speaking"); this.listening = { onText, onEnd }; this.listenAt = now; this.listens++; return true; },
    stopListening() { this.listening = null; },
    cancel() { this.speaking = null; this.listening = null; },
  };
  const host = { canListen, optionCount: () => n, need: () => need,
    questionParts: () => [{ text: "Q" }], feedbackParts: () => [{ text: "FB" }],
    prompt: (k) => [{ text: "P:" + k }],
    submit: (p) => log.push("submit:" + p.join("")), next: () => log.push("next"), pause: () => log.push("pause"), stop: () => log.push("stop"),
    status: (s) => { host.st = s; }, heard: () => {}, st: "" };
  const flow = new HandsFreeFlow(eng, host, clock);
  const api = {
    flow, eng, host, log,
    finishSpeech() { const s = eng.speaking; eng.speaking = null; s && s.done(); },
    say(text) { const l = eng.listening; eng.listening = null; l.onText([text]); l.onEnd("result"); },
    // Recognizer hears nothing for ms; like Chrome it gives up ("silence") 5 s after each start. Timers run in between.
    silence(ms) { const end = now + ms; for (;;) {
      if (eng.speaking) return;
      const due = [...timers.values()].filter((t) => t.at <= end).sort((x, y) => x.at - y.at)[0];
      const lEnd = eng.listening ? eng.listenAt + 5000 : Infinity;
      if (due && due.at <= lEnd) { api.tick(due.at - now); continue; }
      if (lEnd <= end) { now = lEnd; const l = eng.listening; eng.listening = null; l.onEnd("silence"); continue; }
      now = end; return; } },
    tick(ms) { const end = now + ms; for (;;) { const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; timers.delete(due[0]); now = due[1].at; due[1].fn(); } now = end; },
    get now() { return now; },
  };
  return api;
}

{ const r = rig(); r.flow.ask();
  check("question is read first, mic closed while speaking", r.eng.speaking && !r.eng.listening && r.host.st === "speaking");
  r.finishSpeech();
  check("after the options it listens", !!r.eng.listening && r.host.st === "listening");
  r.silence(5000);
  check("no re-prompt before 8 s", !r.log.some((l) => l === "say:P:reprompt"));
  r.silence(5000);
  check("gentle re-prompt after about 8 s of silence", r.log.includes("say:P:reprompt") && r.eng.speaking);
  r.finishSpeech();
  check("listens again after the re-prompt", !!r.eng.listening);
  for (let i = 0; i < 6; i++) { r.silence(10000); if (r.eng.speaking) r.finishSpeech(); }
  check("never auto-advances while waiting", !r.log.includes("next") && !r.log.some((l) => l.startsWith("submit")));
  check(`re-prompts are capped at ${FLOW_DEFAULTS.maxReprompts}`, r.log.filter((l) => l === "say:P:reprompt").length === FLOW_DEFAULTS.maxReprompts);
  check("still listening after the re-prompts run out", !!r.eng.listening);
  r.say("B");
  check("a valid answer is submitted (screen position)", r.log.at(-1) === "submit:1");
  check("never listened while speaking", !r.log.includes("BUG: listening while speaking"));
}
{ const r = rig(); r.flow.ask(); r.finishSpeech();
  r.say("repeat");
  check("repeat replays the question from the start", r.log.filter((l) => l === "say:Q").length === 2 && r.eng.speaking);
  r.finishSpeech(); r.say("um banana");
  check("unclear input: sorry prompt", r.log.at(-1) === "say:P:sorry");
  r.finishSpeech();
  check("then listens again", !!r.eng.listening && !r.log.some((l) => l.startsWith("submit")));
  r.say("next");
  check("next moves on", r.log.at(-1) === "next");
}
{ const r = rig({ need: 2 }); r.flow.ask(); r.finishSpeech();
  r.say("A");
  check("one letter for a two-answer question asks for two", r.log.at(-1) === "say:P:need2");
  r.finishSpeech(); r.say("A and C");
  check("multi-answer is submitted", r.log.at(-1) === "submit:02");
}
{ const r = rig(); r.flow.ask(); r.finishSpeech(); r.say("pause"); check("pause hands back", r.log.at(-1) === "pause" && !r.eng.listening); }
{ const r = rig(); r.flow.ask(); r.finishSpeech(); r.say("stop"); check("stop hands back", r.log.at(-1) === "stop" && !r.eng.listening); }
{ const r = rig(); r.flow.ask(); r.finishSpeech(); r.say("C");
  r.flow.feedback();
  check("feedback plays after the answer", r.log.at(-1) === "say:FB" && !r.eng.listening);
  r.tick(10000);
  check("does not move on while feedback is still playing", !r.log.includes("next"));
  r.finishSpeech();
  check("listens for repeat or next after feedback", !!r.eng.listening);
  r.say("repeat");
  check("repeat after feedback replays the feedback", r.log.at(-1) === "say:FB");
  r.finishSpeech(); r.say("next");
  check("next after feedback moves on at once", r.log.at(-1) === "next");
}
{ const r = rig(); r.flow.feedback(); r.finishSpeech();
  r.silence(FLOW_DEFAULTS.afterFeedbackMs + 500);
  check("moves on after the feedback window", r.log.filter((l) => l === "next").length === 1);
}
{ const r = rig(); r.flow.feedback(); r.finishSpeech(); r.say("B");
  check("an answer after feedback says it is already answered", r.log.at(-1) === "say:P:already");
}
{ const r = rig({ canListen: false }); r.flow.ask(); r.finishSpeech(); r.tick(60000);
  check("without a microphone it waits for taps and never moves on", r.host.st === "waiting" && !r.log.includes("next") && !r.log.includes("say:P:reprompt"));
}
{ const r = rig(); r.flow.ask(); r.finishSpeech();
  for (let i = 0; i < 6 && r.eng.listening; i++) { const l = r.eng.listening; r.eng.listening = null; l.onEnd("error"); r.tick(300); }
  check("fast-failing recognizer stops retrying", r.host.st === "waiting" && r.eng.listens <= FLOW_DEFAULTS.maxFastFails + 1);
  r.flow.listenNow();
  check("mic tap listens again", !!r.eng.listening);
}
{ const r = rig(); r.flow.ask(); r.finishSpeech();
  r.eng.hearing = true; r.tick(9000);
  check("no re-prompt while the user is talking", !r.log.includes("say:P:reprompt") && !!r.eng.listening);
  r.eng.hearing = false; r.tick(1600);
  check("re-prompt once they stop", r.log.includes("say:P:reprompt"));
}
{ const r = rig(); r.flow.ask(); r.flow.cancel(); r.finishSpeech();
  check("cancelled flow does nothing when old speech ends", !r.eng.listening);
}

if (failures.length) { console.error("\nFAILED:\n" + failures.join("\n")); process.exit(1); }
console.log("\nall flow tests passed");

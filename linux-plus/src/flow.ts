/**
 * Hands-free conversation for one exam question, separate from React so it can be tested with a fake engine and clock.
 *
 * Question: read the stem and options, then wait for a spoken answer. Nothing moves on by itself while waiting (the exam
 * clock keeps running). After about 8 s of silence a gentle re-prompt plays ("Say your answer, or say repeat."), a few
 * times at most, and listening carries on. "repeat" reads the question again from the start, "next"/"skip" moves on,
 * "pause" and "stop" hand back to the page, and anything unclear gets "Sorry, I didn't catch that" and listening again.
 * A valid answer is handed to the page (host.submit); the page then calls feedback().
 * Feedback: "Correct." plus the reason, or "Not quite, the answer is X." plus the reason and the command. Afterwards it
 * listens briefly: "repeat" replays the feedback, "next" moves on at once, otherwise it moves on when the window ends.
 * The microphone is never open while anything is being played.
 */
import type { Part, PromptKey } from "./spoken";
import { parseHeard } from "./voice";
import type { Heard } from "./voice";

export type EndReason = "result" | "silence" | "blocked" | "error";
export interface FlowEngine {
  speak(parts: Part[], onDone: () => void): void;
  listen(onText: (alts: string[]) => void, onEnd: (why: EndReason) => void): boolean;
  stopListening(): void;
  /** True while the recognizer hears someone talking (optional). */
  hearing?: boolean;
  cancel(): void;
}
export interface Clock { set(fn: () => void, ms: number): number; clear(id: number): void; now(): number }
export type FlowStatus = "speaking" | "listening" | "waiting" | "blocked" | "idle";
export interface FlowHost {
  canListen: boolean;
  optionCount(): number;
  need(): number;
  questionParts(): Part[];
  feedbackParts(): Part[];
  prompt(key: PromptKey): Part[];
  /** picks are on-screen positions (0 = A). */
  submit(picks: number[]): void;
  next(): void;
  pause(): void;
  stop(): void;
  status(s: FlowStatus): void;
  heard(text: string, meaning: string): void;
}
export const FLOW_DEFAULTS = { repromptMs: 8000, maxReprompts: 3, afterFeedbackMs: 4000, relistenMs: 250, fastFailMs: 700, maxFastFails: 4 };

export class HandsFreeFlow {
  private run = 0;
  private timer = 0;
  private rtimer = 0;
  private quietSince = 0;
  private reprompts = 0;
  private fastFails = 0;
  phase: "idle" | "question" | "feedback" = "idle";
  constructor(private engine: FlowEngine, private host: FlowHost, private clock: Clock, private opt = FLOW_DEFAULTS) {}

  /** Stop everything this flow started. */
  cancel() { this.run++; this.clearTimers(); this.engine.cancel(); this.phase = "idle"; }
  private clearTimers() { this.clock.clear(this.timer); this.clock.clear(this.rtimer); }

  private say(parts: Part[], then: () => void) {
    const id = this.run;
    this.host.status("speaking");
    this.engine.speak(parts, () => { if (id === this.run) then(); });
  }

  /** Read the question and options, then wait for an answer. */
  ask() {
    this.cancel();
    this.phase = "question";
    this.reprompts = 0;
    this.say(this.host.questionParts(), () => this.awaitAnswer());
  }

  /** Read the feedback for the answer just given, then listen briefly for repeat or next. */
  feedback() {
    this.cancel();
    this.phase = "feedback";
    this.say(this.host.feedbackParts(), () => this.afterFeedback());
  }

  /** Open the microphone for an answer now (mic tap). */
  listenNow() {
    if (this.phase === "idle") return;
    this.run++; this.clearTimers(); this.engine.cancel();
    if (this.phase === "question") this.awaitAnswer(); else this.afterFeedback();
  }

  private awaitAnswer() {
    this.quietSince = this.clock.now();
    this.fastFails = 0;
    this.clock.clear(this.rtimer);
    if (this.host.canListen && this.reprompts < this.opt.maxReprompts) {
      // About 8 s after the last thing was said, stop listening for a moment and re-prompt.
      const id = this.run;
      const fire = () => {
        if (id !== this.run || this.phase !== "question") return;
        if (this.engine.hearing) { this.rtimer = this.clock.set(fire, 1500); return; } // never talk over the user
        this.run++; this.clock.clear(this.timer); this.engine.stopListening();
        this.reprompts++;
        this.say(this.host.prompt("reprompt"), () => this.awaitAnswer());
      };
      this.rtimer = this.clock.set(fire, this.opt.repromptMs);
    }
    this.listenLoop();
  }

  private listenLoop() {
    const id = this.run;
    if (!this.host.canListen) { this.host.status("waiting"); return; }
    const started = this.clock.now();
    this.host.status("listening");
    const ok = this.engine.listen((alts) => { if (id === this.run) this.onAnswerText(alts); }, (why) => {
      if (id !== this.run || why === "result") return;
      if (why === "blocked") { this.clock.clear(this.rtimer); this.host.status("blocked"); return; }
      // Recognizers that end at once over and over (no mic, offline) would spin. Give up and wait for a tap.
      if (this.clock.now() - started < this.opt.fastFailMs) { if (++this.fastFails >= this.opt.maxFastFails) { this.clock.clear(this.rtimer); this.host.status("waiting"); return; } }
      else this.fastFails = 0;
      this.timer = this.clock.set(() => { if (id === this.run) this.listenLoop(); }, this.opt.relistenMs);
    });
    if (!ok) { this.clock.clear(this.rtimer); this.host.status("waiting"); }
  }

  private parse(alts: string[]): { h: Heard; text: string } {
    const n = this.host.optionCount(), need = this.host.need();
    for (const a of alts) { const h = parseHeard(a, n, need); if (h.kind !== "unknown") return { h, text: a }; }
    return { h: { kind: "unknown" }, text: alts[0] || "" };
  }

  private command(c: string): boolean {
    if (c === "next" || c === "skip") { this.cancel(); this.host.next(); return true; }
    if (c === "pause") { this.cancel(); this.host.pause(); return true; }
    if (c === "stop") { this.cancel(); this.host.stop(); return true; }
    return false;
  }

  private onAnswerText(alts: string[]) {
    const { h, text } = this.parse(alts);
    this.clock.clear(this.rtimer);
    if (h.kind === "answer") {
      this.host.heard(text, h.picks.map((p) => "ABCDEFGH"[p]).join(" and "));
      const need = this.host.need();
      if (h.picks.length !== need) { this.say(this.host.prompt(need === 3 ? "need3" : "need2"), () => this.awaitAnswer()); return; }
      this.run++; this.clearTimers();
      this.host.submit(h.picks);
      return;
    }
    if (h.kind === "command") {
      this.host.heard(text, h.command);
      if (h.command === "repeat") { this.ask(); return; }
      this.command(h.command);
      return;
    }
    this.host.heard(text, "not understood");
    this.say(this.host.prompt("sorry"), () => this.awaitAnswer());
  }

  private afterFeedback() {
    const id = this.run;
    const until = this.clock.now() + this.opt.afterFeedbackMs;
    const moveOn = () => { if (id !== this.run) return; this.cancel(); this.host.next(); };
    this.clock.clear(this.timer);
    this.timer = this.clock.set(moveOn, this.opt.afterFeedbackMs);
    if (!this.host.canListen) { this.host.status("idle"); return; }
    const listen = () => {
      if (id !== this.run) return;
      this.host.status("listening");
      const ok = this.engine.listen((alts) => {
        if (id !== this.run) return;
        const { h, text } = this.parse(alts);
        if (h.kind === "command") {
          this.host.heard(text, h.command);
          if (h.command === "repeat") { this.feedback(); return; }
          if (this.command(h.command)) return;
        }
        if (h.kind === "answer") {
          this.host.heard(text, h.picks.map((p) => "ABCDEFGH"[p]).join(" and "));
          this.clock.clear(this.timer);
          this.say(this.host.prompt("already"), () => this.afterFeedback());
          return;
        }
        if (this.clock.now() < until - 600) listen();
      }, (why) => {
        if (id !== this.run || why === "result") return;
        if (why === "blocked") { this.host.status("idle"); return; }
        if (this.clock.now() < until - 600) this.clock.set(listen, this.opt.relistenMs);
      });
      if (!ok) this.host.status("idle");
    };
    listen();
  }
}

/**
 * Recorded-voice scripts for hands-free mode. practice-tests.json carries, for each question, what the recorded voice says
 * (q.spoken) and the shared clips (data.voice): letters, "Correct.", "Not quite, the answer is ...", and prompts.
 * Every line is one clip at <base><a>.mp3. A line without "a" has no recording yet and is read by the device voice.
 * Options are recorded without their letter, so the site can say the letter that matches the shuffled order on screen.
 * Pure functions only, so they can be tested in Node.
 */
export type Clip = { t: string; a?: string };
export type Spoken = { stem: Clip; options: Clip[]; reason: Clip; command?: Clip };
export type VoicePack = { voice: string; base: string; letters: Record<string, Clip>; correct: Clip; wrong: Record<string, Clip>; prompts: Record<string, Clip> };
/** One thing to say: the text, and the recorded clip's URL when there is one. */
export type Part = { text: string; clip?: string };

export const LETTERS = "ABCDEFGH";
export const part = (c: Clip | undefined, base: string, fallback = ""): Part =>
  c ? (c.a ? { text: c.t, clip: `${base}${c.a}.mp3` } : { text: c.t }) : { text: fallback };

/** Letters of the right answers as they appear on screen. order[pos] is the original option shown at pos. */
export function shownAnswer(order: number[], answer: number[]): string {
  return order.map((o, pos) => (answer.includes(o) ? LETTERS[pos] : "")).join("");
}

/** Stem, then each option in the on-screen order, each preceded by its on-screen letter. */
export function questionParts(sp: Spoken, order: number[], pack: VoicePack): Part[] {
  const out: Part[] = [part(sp.stem, pack.base)];
  order.forEach((o, pos) => {
    const L = LETTERS[pos];
    out.push(part(pack.letters[L], pack.base, `${L}.`));
    out.push(part(sp.options[o], pack.base));
  });
  return out;
}

const wrongText = (letters: string) => {
  const l = letters.split("");
  return l.length === 1 ? `Not quite, the answer is ${l[0]}.` : `Not quite, the answers are ${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}.`;
};

/** Correct: "Correct." and the reason. Wrong: "Not quite, the answer is X." (letters as on screen), the reason, then the command. */
export function feedbackParts(sp: Spoken, order: number[], answer: number[], ok: boolean, pack: VoicePack): Part[] {
  if (ok) return [part(pack.correct, pack.base, "Correct."), part(sp.reason, pack.base)];
  const letters = shownAnswer(order, answer);
  const out = [part(pack.wrong[letters], pack.base, wrongText(letters)), part(sp.reason, pack.base)];
  if (sp.command) out.push(part(sp.command, pack.base));
  return out;
}

export type PromptKey = "reprompt" | "already" | "need2" | "need3" | "sorry" | "sample";
const PROMPT_TEXT: Record<string, string> = {
  reprompt: "Say your answer, or say repeat.",
  already: "That one is already answered. Say next to continue.",
  need2: "This question needs two answers, for example A and C.",
  need3: "This question needs three answers, for example A, C and D.",
  sample: "This is how questions will sound.",
};
export function promptParts(pack: VoicePack | null, key: PromptKey, optionCount = 4): Part[] {
  if (key === "sorry") {
    const l = LETTERS.slice(0, optionCount).split("");
    const text = `Sorry, I didn't catch that. Say ${l.slice(0, -1).join(", ")} or ${l[l.length - 1]}, or say repeat.`;
    return [pack ? part(pack.prompts[`sorry${optionCount}`], pack.base, text) : { text }];
  }
  return [pack ? part(pack.prompts[key], pack.base, PROMPT_TEXT[key]) : { text: PROMPT_TEXT[key] }];
}

export const clipUrls = (parts: Part[]) => parts.map((p) => p.clip).filter((u): u is string => !!u);
/** Device-voice only: drop the clips. */
export const textOnly = (parts: Part[]): Part[] => parts.map((p) => ({ text: p.text }));

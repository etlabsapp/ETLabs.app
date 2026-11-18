/**
 * Exam logic for Linux+ Study practice exams: timing, a weighted random sampler with rotation, and option shuffling.
 * Pure functions only, so they can be tested in Node.
 */

export const SECONDS_PER_QUESTION = 60;
export const PRESETS = [10, 25, 50, 90];

/** One minute per question, the same pace as the real exam (90 minutes for up to 90 questions). */
export const timeLimitSeconds = (count: number) => Math.max(0, Math.floor(count)) * SECONDS_PER_QUESTION;

/** 3725 -> "1:02:05", 125 -> "2:05". Negative values show as 0:00. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** Clamp a typed question count to 1..max. Returns 0 for anything that is not a number. */
export function clampCount(value: string | number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n, max);
}

/** Per-browser history of each question: the exam number it last appeared in, how many times it was answered, and whether the last answer was wrong. */
export type Seen = Record<string, { last: number; times: number; missed: boolean }>;

export const W_UNSEEN = 80;
export const W_SEEN_MAX = 4;
export const MISSED_BOOST = 6;

/**
 * Weight for drawing a question into exam number `examNo`.
 * Never-seen questions get the top weight (80), so the whole pool gets covered quickly. A question seen k exams ago gets
 * weight k, capped at 4: the last exam's questions are the least likely to come back, and older ones return gradually.
 * Every earlier appearance trims the weight a little more, so the least-seen questions stay ahead. A question answered
 * wrong last time gets a 6x boost, so missed questions come back sooner than ones answered right.
 */
export function weightFor(seen: Seen[string] | undefined, examNo: number): number {
  if (!seen) return W_UNSEEN;
  const age = Math.max(1, examNo - seen.last);
  let w = Math.min(W_SEEN_MAX, age) / (1 + 0.25 * Math.max(0, seen.times - 1));
  if (seen.missed) w *= MISSED_BOOST;
  return w;
}

export type Rng = () => number;

/** Small seeded PRNG (mulberry32), so tests are repeatable. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Draw `count` distinct question ids for exam number `examNo`, weighted by weightFor (weighted sampling without replacement,
 * Efraimidis-Spirakis), then put them in a fresh random order. No id can appear twice in one exam.
 */
export function drawExam(ids: string[], count: number, seen: Seen, examNo: number, rng: Rng = Math.random): string[] {
  const k = Math.min(Math.max(0, Math.floor(count)), ids.length);
  const keyed = ids.map((id) => {
    const w = weightFor(seen[id], examNo);
    return { id, key: Math.log(Math.max(rng(), 1e-12)) / w };
  });
  keyed.sort((x, y) => y.key - x.key);
  return shuffle(keyed.slice(0, k).map((x) => x.id), rng);
}

/** Record a finished exam. Answered questions get this exam number and their result. Unanswered ones are left as they were. */
export function recordExam(seen: Seen, examNo: number, results: Record<string, boolean>): Seen {
  const next: Seen = { ...seen };
  for (const [id, ok] of Object.entries(results)) {
    const prev = next[id];
    next[id] = { last: examNo, times: (prev?.times ?? 0) + 1, missed: !ok };
  }
  return next;
}

export const missedIds = (seen: Seen) => Object.keys(seen).filter((id) => seen[id].missed);

/** Option order for one question in one exam. The same exam always shows the same order, and a new exam gets a new one. */
export function optionOrder(seed: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return shuffle(Array.from({ length: n }, (_, i) => i), seededRng(h));
}

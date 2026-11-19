import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PRESETS, clampCount, drawExam, formatClock, missedIds, optionOrder, recordExam, timeLimitSeconds } from "./exam";
import type { Seen } from "./exam";
import { useVoice } from "./handsfree";
import { RATE_MAX, RATE_MIN, clampRate, feedbackScript, questionScript, speakable } from "./voice";
import { HandsFreeFlow } from "./flow";
import type { FlowHost } from "./flow";
import { clipUrls, feedbackParts, promptParts, questionParts, shownAnswer, textOnly } from "./spoken";
import type { Part, Spoken, VoicePack } from "./spoken";

export type Block = { t: "p" | "code"; v: string };
export type PQ = { id: string; stem: Block[]; options: { text: string; why: string }[]; answer: number[]; spoken?: Spoken };
type Data = { version: number; total: number; questions: PQ[]; voice?: VoicePack };
type Ans = { picked: number[]; ok: boolean };
type Exam = { no: number; ids: string[]; answers: Record<string, Ans>; idx: number; startedAt: number; limit: number; review: boolean };
type Result = Exam & { finishedAt: number; timedOut: boolean };
type Past = { at: number; count: number; correct: number; used: number; limit: number; review: boolean };
type Store = { examNo: number; seen: Seen; current: Exam | null; last: Result | null; history: Past[]; size: number };

const STORE_KEY = "etlabs-linux-plus-exam-v1";
const OLD_KEY = "etlabs-linux-plus-practice-v1";
const DATA_URL = "/linux-plus/practice-tests.json";
const C = { bg: "#0d1117", bar: "#161b22", text: "#e6edf3", dim: "#7d8590", panel: "rgba(17,24,39,0.9)", edge: "#24304d", ink: "#e5e9f5", soft: "#9aa6c4", faint: "#6b7796", cyan: "#22d3ee", violet: "#a78bfa", green: "#34d399", red: "#f87171", amber: "#fbbf24" };
const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const LETTERS = "ABCDEFGH";

export const isCorrect = (q: PQ, picked: number[]) => picked.length === q.answer.length && q.answer.every((a) => picked.includes(a));
const looksLikeCode = (s: string) => !/^[A-Z]/.test(s) || /^[A-Z_]+=|^[A-Z]+ [a-z/]/.test(s) && !/ (the|a|an|to|is|and) /i.test(s);
/** Keep paths and options like site-backup.tar.gz in one piece: a word joiner after inner hyphens stops line breaks there. */
const nb = (s: string) => s.replace(/\S*-\S*/g, (t) => t.replace(/-/g, "\u2060-\u2060"));

function loadStore(): Store {
  const empty: Store = { examNo: 0, seen: {}, current: null, last: null, history: [], size: 25 };
  try {
    localStorage.removeItem(OLD_KEY);
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (s && typeof s.examNo === "number" && s.seen) return { ...empty, ...s };
  } catch (_e) { /* private mode or bad data */ }
  return empty;
}
function saveStore(s: Store) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_e) { /* ignore */ } }

const Code = ({ v }: { v: string }) => (
  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #30363d", margin: "12px 0", maxWidth: "100%" }}>
    <div style={{ background: C.bar, padding: "6px 10px", display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: "#ff5f57" }} />
      <span style={{ width: 10, height: 10, borderRadius: 5, background: "#febc2e" }} />
      <span style={{ width: 10, height: 10, borderRadius: 5, background: "#28c840" }} />
      <span style={{ marginLeft: 6, fontSize: 12, color: C.dim, fontFamily: mono }}>sample output</span>
    </div>
    <pre className="px-code" style={{ margin: 0, background: C.bg, color: C.text, padding: "12px 12px 14px", fontFamily: mono, fontSize: 12.5, lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre", WebkitOverflowScrolling: "touch" }}>{v}</pre>
  </div>
);
const Stem = ({ q, size = 18 }: { q: PQ; size?: number }) => (
  <>{q.stem.map((b, i) => (b.t === "code" ? <Code key={i} v={b.v} /> : <p key={i} className="px-stem" style={{ margin: "0 0 8px", fontSize: size, lineHeight: 1.45, fontWeight: 600 }}>{nb(b.v)}</p>))}</>
);

const card: CSSProperties = { background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 18, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" };
const bigBtn: CSSProperties = { width: "100%", minHeight: 52, borderRadius: 14, border: "none", fontSize: 17, fontWeight: 800, cursor: "pointer", color: "#04121a", background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`, boxShadow: "0 8px 24px rgba(34,211,238,0.25)" };
const ghost: CSSProperties = { minHeight: 44, borderRadius: 12, border: `1px solid ${C.edge}`, background: "rgba(255,255,255,0.03)", color: C.soft, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "0 16px" };
const kicker: CSSProperties = { fontSize: 12, letterSpacing: "0.14em", color: C.faint, fontWeight: 700 };
const Sticky = ({ children }: { children: ReactNode }) => (
  <div className="px-sticky" style={{ position: "sticky", bottom: 0, zIndex: 5, padding: "12px 0 calc(12px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(7,11,22,0), #070b16 35%)" }}>{children}</div>
);

export default function PracticeTests() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [store, setStore] = useState<Store>(loadStore);
  const [showResult, setShowResult] = useState(false);
  const [draft, setDraft] = useState<number[]>([]);
  const [custom, setCustom] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const topRef = useRef<HTMLDivElement>(null);
  const vcRef = useRef<ReturnType<typeof useVoice> | null>(null);

  useEffect(() => {
    let live = true;
    fetch(DATA_URL).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: Data) => { if (live) setData(d); })
      .catch(() => { if (live) setErr("The practice questions could not be loaded. Check your connection and reload the page."); });
    return () => { live = false; };
  }, []);
  useEffect(() => { saveStore(store); }, [store]);

  const byId = useMemo(() => { const m: Record<string, PQ> = {}; data?.questions.forEach((q) => { m[q.id] = q; }); return m; }, [data]);
  const total = data?.questions.length ?? 250;
  const exam = store.current && data ? { ...store.current, ids: store.current.ids.filter((id) => byId[id]) } : null;
  const remaining = exam ? exam.limit - (now - exam.startedAt) / 1000 : 0;
  const q = exam && exam.idx < exam.ids.length ? byId[exam.ids[exam.idx]] : null;
  const answered = q && exam ? exam.answers[q.id] : undefined;

  const toTop = () => setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  const finish = (timedOut: boolean) => setStore((st) => {
    if (!st.current) return st;
    const ex = st.current;
    const finishedAt = Math.min(Date.now(), ex.startedAt + ex.limit * 1000);
    const results: Record<string, boolean> = {};
    for (const id of ex.ids) if (ex.answers[id]) results[id] = ex.answers[id].ok;
    const correct = ex.ids.filter((id) => ex.answers[id]?.ok).length;
    const past: Past = { at: finishedAt, count: ex.ids.length, correct, used: Math.round((finishedAt - ex.startedAt) / 1000), limit: ex.limit, review: ex.review };
    return { ...st, seen: recordExam(st.seen, ex.no, results), current: null, last: { ...ex, finishedAt, timedOut }, history: [past, ...st.history].slice(0, 20) };
  });

  // Countdown. The clock runs from the start time, so it keeps going if the page is closed, like a real exam.
  useEffect(() => {
    if (!store.current) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [store.current?.no]);
  useEffect(() => {
    if (store.current && data && remaining <= 0) { finish(true); setShowResult(true); toTop(); }
  }, [remaining <= 0, !!store.current, !!data]);

  const start = (ids: string[], review: boolean) => {
    if (vcRef.current?.settings.on) vcRef.current.engine.unlock();
    const no = store.examNo + 1;
    setStore((st) => ({ ...st, examNo: no, current: { no, ids, answers: {}, idx: 0, startedAt: Date.now(), limit: timeLimitSeconds(ids.length), review } }));
    setNow(Date.now()); setDraft([]); setShowResult(false); toTop();
  };
  const startNew = (count: number) => {
    if (!data || count < 1) return;
    setStore((st) => ({ ...st, size: count }));
    start(drawExam(data.questions.map((x) => x.id), count, store.seen, store.examNo + 1), false);
  };
  const startMissed = (ids: string[]) => start(drawExam(ids, ids.length, store.seen, store.examNo + 1), true);
  const submit = (picked: number[]) => {
    if (!q || !exam || answered || remaining <= 0) return;
    setStore((st) => (st.current ? { ...st, current: { ...st.current, answers: { ...st.current.answers, [q.id]: { picked, ok: isCorrect(q, picked) } } } } : st));
  };
  const tap = (orig: number) => {
    if (!q || answered) return;
    if (q.answer.length === 1) { submit([orig]); return; }
    setDraft((d) => (d.includes(orig) ? d.filter((x) => x !== orig) : d.length >= q.answer.length ? d : [...d, orig]));
  };
  const next = () => {
    if (!exam) return;
    if (exam.idx + 1 >= exam.ids.length) { finish(false); setShowResult(true); toTop(); return; }
    setStore((st) => (st.current ? { ...st, current: { ...st.current, idx: st.current.idx + 1 } } : st));
    setDraft([]); toTop();
  };
  const endEarly = () => {
    if (!exam) return;
    const left = exam.ids.length - Object.keys(exam.answers).length;
    if (left > 0 && !window.confirm(`End the exam now? ${left} unanswered question${left === 1 ? "" : "s"} will count as wrong.`)) return;
    finish(false); setShowResult(true); toTop();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || !exam || e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
      const order = optionOrder(`${exam.no}:${q.id}`, q.options.length);
      const k = e.key.toUpperCase();
      const li = LETTERS.indexOf(k);
      if (k.length === 1 && li >= 0 && li < order.length) { e.preventDefault(); tap(order[li]); }
      else if (e.key === "Enter") { e.preventDefault(); if (answered) next(); else if (q.answer.length > 1 && draft.length === q.answer.length) submit(draft); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });


  // ---------- Hands-free: read aloud (recorded voice, device voice as fallback), listen for answers ----------
  const vc = useVoice();
  vcRef.current = vc;
  const hf = vc.settings.on && (vc.synth || vc.audio);
  const pack = data?.voice ?? null;
  const [hfStatus, setHfStatus] = useState<"idle" | "speaking" | "listening" | "waiting" | "paused" | "blocked">("idle");
  const [hfPaused, setHfPaused] = useState(false);
  const [heard, setHeard] = useState<{ text: string; meaning: string } | null>(null);
  const [nonce, setNonce] = useState(0);
  const qOrder = q && exam ? optionOrder(`${exam.no}:${q.id}`, q.options.length) : [];
  const live = useRef<{ q: PQ | null; exam: typeof exam; answered: Ans | undefined; order: number[]; submit: (p: number[]) => void; next: () => void }>(null as any);
  live.current = { q, exam, answered, order: qOrder, submit, next };

  /** Recorded clips when the recorded voice is on, otherwise the same words read by the device voice. */
  const voiced = (parts: Part[]) => (vc.settings.recorded && pack ? parts : textOnly(parts));
  const qParts = (lq: PQ, order: number[]): Part[] => lq.spoken && pack
    ? voiced(questionParts(lq.spoken, order, pack))
    : questionScript(lq.stem, order.map((i) => lq.options[i].text), lq.answer.length).map((text) => ({ text }));
  const fParts = (lq: PQ, order: number[], ok: boolean): Part[] => {
    if (lq.spoken && pack) return voiced(feedbackParts(lq.spoken, order, lq.answer, ok, pack));
    const why = order.filter((o) => lq.answer.includes(o)).map((o) => lq.options[o].why).join(" ");
    return [{ text: feedbackScript(ok, shownAnswer(order, lq.answer), why) }];
  };
  const flowRef = useRef<HandsFreeFlow | null>(null);
  const hostRef = useRef<FlowHost>(null as any);
  hostRef.current = {
    canListen: vc.listenable,
    optionCount: () => live.current.q?.options.length ?? 4,
    need: () => live.current.q?.answer.length ?? 1,
    questionParts: () => { const L = live.current; return L.q ? qParts(L.q, L.order) : []; },
    feedbackParts: () => { const L = live.current; return L.q && L.answered ? fParts(L.q, L.order, L.answered.ok) : []; },
    prompt: (key) => voiced(promptParts(pack, key, live.current.q?.options.length ?? 4)),
    submit: (picks) => { const L = live.current; L.submit(picks.map((p) => L.order[p])); },
    next: () => live.current.next(),
    pause: () => setHfPaused(true),
    stop: () => vc.setSettings((st) => ({ ...st, on: false })),
    status: (st) => setHfStatus(st),
    heard: (text, meaning) => setHeard({ text, meaning }),
  };
  if (!flowRef.current) {
    const host = new Proxy({} as FlowHost, { get: (_t, k) => (hostRef.current as any)[k] });
    flowRef.current = new HandsFreeFlow(vc.engine, host, { set: (fn, ms) => window.setTimeout(fn, ms), clear: (t) => window.clearTimeout(t), now: () => Date.now() });
  }
  const flow = flowRef.current;
  const hfKey = hf && !hfPaused && q && exam && !showResult ? `${exam.no}:${exam.idx}:${answered ? "a" : "q"}:${nonce}` : "";
  useEffect(() => {
    if (!hfKey) { flow.cancel(); setHfStatus(hf && hfPaused ? "paused" : "idle"); return; }
    const L = live.current;
    if (!L.q || !L.exam) return;
    if (!L.answered) {
      setHeard(null);
      flow.ask();
      // Fetch this question's feedback and the next question while this one is read.
      if (vc.settings.recorded && pack) {
        const urls = [...clipUrls(qParts(L.q, L.order)), ...clipUrls(fParts(L.q, L.order, true)), ...clipUrls(fParts(L.q, L.order, false))];
        const nid = L.exam.ids[L.exam.idx + 1], nq = nid ? byId[nid] : null;
        if (nq) urls.push(...clipUrls(qParts(nq, optionOrder(`${L.exam.no}:${nq.id}`, nq.options.length))));
        vc.engine.preload(urls);
      }
    } else flow.feedback();
  }, [hfKey]);
  useEffect(() => () => flow.cancel(), []);
  const resultKey = hf && showResult && store.last && !store.current ? `r:${store.last.finishedAt}` : "";
  useEffect(() => {
    if (!resultKey || !store.last) return;
    const r = store.last, ok = r.ids.filter((id) => r.answers[id]?.ok).length;
    setHfStatus("speaking");
    vc.engine.speak([`Exam finished. You got ${ok} of ${r.ids.length} correct${r.timedOut ? ", and time ran out" : ""}.`], () => setHfStatus("idle"));
  }, [resultKey]);
  // Turning on happens inside a tap: that tap unlocks audio and asks for the microphone (iOS Safari needs both from a gesture).
  const hfToggle = (on: boolean) => { if (on) { vc.engine.unlock(); vc.engine.askMic(); } else flow.cancel(); setHfPaused(false); vc.setSettings((st) => ({ ...st, on })); };
  const hfCan = vc.synth || (vc.audio && !!pack);
  const bubble = (docked: boolean) => hfCan ? <HfBubble on={!!hf} status={hfStatus} docked={docked} onToggle={() => hfToggle(!hf)} /> : null;
  const micTap = () => {
    vc.engine.unlock();
    if (hfStatus === "paused" || hfPaused) { setHfPaused(false); return; }
    if (hfStatus === "listening") { vc.engine.stopListening(); setHfStatus("waiting"); return; }
    flow.listenNow();
  };
  const testVoice = () => {
    vc.engine.unlock();
    const sample = byId["a19"];
    const parts = [...voiced(promptParts(pack, "sample")), ...(sample?.spoken && pack ? voiced(questionParts(sample.spoken, [0, 1, 2, 3], pack)).slice(0, 3) : [{ text: `For example: ${speakable("usermod -aG docker dev3")}.` }])];
    setHfStatus("speaking");
    vc.engine.speak(parts, () => setHfStatus("idle"));
  };

  if (err) return <div ref={topRef} style={{ ...card, color: C.amber }}>{err}</div>;
  if (!data) return <div ref={topRef} style={{ ...card, color: C.soft }} aria-live="polite">Loading practice questions…</div>;

  // ---------- Results ----------
  if (showResult && store.last && !store.current) {
    const r = store.last;
    const ids = r.ids.filter((id) => byId[id]);
    const correct = ids.filter((id) => r.answers[id]?.ok).length;
    const missed = ids.filter((id) => !r.answers[id]?.ok);
    const pct = ids.length ? Math.round((correct / ids.length) * 100) : 0;
    const used = Math.round((r.finishedAt - r.startedAt) / 1000);
    const allMissed = missedIds(store.seen).filter((id) => byId[id]);
    return (
      <div ref={topRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={kicker}>{r.review ? "MISSED-QUESTION EXAM" : "PRACTICE EXAM"} · RESULTS</div>
          <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, margin: "8px 0", color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red }}>{pct}%</div>
          <div style={{ color: C.ink, fontSize: 18, fontWeight: 700 }}>{correct} of {ids.length} correct</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 12, fontFamily: mono, fontSize: 15, color: C.soft, flexWrap: "wrap" }}>
            <span>time used {formatClock(used)}</span><span>of {formatClock(r.limit)}</span>
          </div>
          {r.timedOut && <div style={{ marginTop: 12, color: C.amber, fontSize: 15, fontWeight: 600 }}>Time ran out, so the exam was submitted automatically. Unanswered questions count as wrong.</div>}
        </div>
        <button style={bigBtn} onClick={() => setShowResult(false)}>New exam</button>
        {allMissed.length > 0 && <button style={ghost} onClick={() => startMissed(allMissed)}>Retake all missed questions ({allMissed.length})</button>}
        {missed.length > 0 && <div style={{ ...kicker, marginTop: 8 }}>REVIEW MISSED ({missed.length})</div>}
        {missed.map((id, i) => {
          const mq = byId[id];
          const order = optionOrder(`${r.no}:${id}`, mq.options.length);
          const picked = r.answers[id]?.picked ?? [];
          return (
            <div key={id} style={{ ...card, padding: "16px 14px" }}>
              <div style={{ ...kicker, marginBottom: 8 }}>MISSED {i + 1} of {missed.length}{picked.length ? "" : " · NOT ANSWERED"}</div>
              <Stem q={mq} size={16} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {order.map((orig, pos) => {
                  const ok = mq.answer.includes(orig), mine = picked.includes(orig);
                  if (!ok && !mine) return null;
                  return (
                    <div key={orig} style={{ borderRadius: 12, padding: "10px 12px", border: `2px solid ${ok ? C.green : C.red}`, background: ok ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: ok ? C.green : C.red, marginBottom: 4 }}>{ok ? (mine ? "YOUR ANSWER · CORRECT" : "CORRECT ANSWER") : "YOUR ANSWER"}</div>
                      <div style={{ fontSize: 15, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: looksLikeCode(mq.options[orig].text) ? mono : "inherit" }}><b>{LETTERS[pos]}.</b> {nb(mq.options[orig].text)}</div>
                      <div style={{ fontSize: 15, color: C.soft, lineHeight: 1.5, marginTop: 6 }}>{mq.options[orig].why}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {missed.length > 3 && <button style={ghost} onClick={() => { setShowResult(false); toTop(); }}>Back to the exam builder</button>}
      </div>
    );
  }

  // ---------- Builder ----------
  if (!exam || !q) {
    const seenCount = Object.keys(store.seen).filter((id) => byId[id]).length;
    const allMissed = missedIds(store.seen).filter((id) => byId[id]);
    const customN = clampCount(custom, total);
    const chosen = custom ? customN : store.size;
    const cur = store.current;
    return (
      <div ref={topRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {cur && (
          <div style={{ ...card, borderColor: "rgba(251,191,36,0.5)" }}>
            <div style={{ ...kicker, color: C.amber }}>EXAM IN PROGRESS</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: "6px 0 12px" }}>Question {cur.idx + 1} of {cur.ids.length} · {formatClock(remaining)} left</div>
            <button style={bigBtn} onClick={() => { setShowResult(false); toTop(); }}>Resume exam</button>
          </div>
        )}
        <div style={{ ...card, background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(167,139,250,0.14)), rgba(17,24,39,0.9)" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.16em", fontWeight: 800, color: C.cyan }}>PRACTICE EXAM</div>
          <div className="px-h2" style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 6px", lineHeight: 1.2 }}>Build a timed exam</div>
          <div style={{ color: C.soft, fontSize: 15, lineHeight: 1.5 }}>Questions are drawn at random from a pool of {total}, in a new order with the answers shuffled each time. You get 1 minute per question, the same pace as the real exam (90 minutes for up to 90 questions).</div>
        </div>
        <div style={card}>
          <div style={{ ...kicker, marginBottom: 10 }}>HOW MANY QUESTIONS?</div>
          <div className="px-presets" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {PRESETS.map((n) => {
              const on = !custom && store.size === n;
              return (
                <button key={n} aria-pressed={on} onClick={() => { setCustom(""); setStore((st) => ({ ...st, size: n })); }}
                  style={{ minHeight: 60, borderRadius: 14, cursor: "pointer", border: `2px solid ${on ? C.cyan : C.edge}`, background: on ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)", color: on ? C.ink : C.soft, fontWeight: 800, fontSize: 20, fontFamily: mono }}>
                  {n}<span style={{ display: "block", fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: on ? C.cyan : C.faint }}>{n} min</span>
                </button>
              );
            })}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 15, color: C.soft }}>
            <span style={{ flexShrink: 0 }}>Custom</span>
            <input type="number" inputMode="numeric" min={1} max={total} placeholder={`1 to ${total}`} value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              aria-label={`Custom number of questions, 1 to ${total}`}
              style={{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 12, border: `2px solid ${custom ? (customN ? C.cyan : C.red) : C.edge}`, background: C.bg, color: C.text, fontFamily: mono, fontSize: 18, padding: "0 14px", outline: "none" }} />
          </label>
          {custom && !customN && <div style={{ color: C.red, fontSize: 14, marginTop: 6 }}>Pick a number from 1 to {total}.</div>}
          {custom && customN && Number(custom) > total && <div style={{ color: C.amber, fontSize: 14, marginTop: 6 }}>The pool has {total} questions, so the exam uses {total}.</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 0 12px", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{chosen || "–"} questions</span>
            <span style={{ fontFamily: mono, fontSize: 18, color: C.cyan, fontWeight: 700 }}>{"\u23f1"} {chosen ? formatClock(timeLimitSeconds(chosen)) : "–"}</span>
          </div>
          <button style={{ ...bigBtn, opacity: chosen ? 1 : 0.45 }} disabled={!chosen || !!cur} onClick={() => startNew(chosen)}>{cur ? "Finish or end the current exam first" : `Start ${chosen || ""}-question exam`}</button>
          <div style={{ fontSize: 13, color: C.faint, marginTop: 10, lineHeight: 1.5 }}>The clock keeps running if you leave the page. When it hits 0:00 the exam is submitted automatically.</div>
        </div>
        <HandsFreeCard vc={vc} onToggle={hfToggle} test={testVoice} recordedAvailable={!!pack} />
        {bubble(false)}
        <div style={card}>
          <div style={{ ...kicker, marginBottom: 8 }}>YOUR PROGRESS</div>
          <div style={{ fontSize: 15, color: C.soft, marginBottom: 8 }}>{seenCount} of {total} questions seen. New exams favor questions you have not seen yet, and ones you missed.</div>
          <div style={{ height: 8, borderRadius: 4, background: "#1b2440", overflow: "hidden" }}><div style={{ width: `${Math.round((seenCount / total) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})` }} /></div>
          {allMissed.length > 0 && <button style={{ ...ghost, width: "100%", marginTop: 14, color: C.amber, borderColor: "rgba(251,191,36,0.45)" }} disabled={!!cur} onClick={() => startMissed(allMissed)}>Review missed: timed exam of {allMissed.length} question{allMissed.length === 1 ? "" : "s"}</button>}
          {store.last && !cur && <button style={{ ...ghost, width: "100%", marginTop: 10 }} onClick={() => { setShowResult(true); toTop(); }}>See last results</button>}
          {store.history.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {store.history.slice(0, 5).map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, fontFamily: mono, color: C.soft }}>
                  <span>{new Date(h.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{h.review ? " missed" : ""}</span>
                  <span>{h.correct}/{h.count}</span>
                  <span>{formatClock(h.used)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {hfCan && <div aria-hidden="true" style={{ height: 64 }} />}
      </div>
    );
  }

  // ---------- Question ----------
  const order = optionOrder(`${exam.no}:${q.id}`, q.options.length);
  const multi = q.answer.length > 1;
  const picked = answered ? answered.picked : draft;
  const done = Object.keys(exam.answers).length;
  const right = Object.values(exam.answers).filter((a) => a.ok).length;
  const low = remaining <= Math.max(60, exam.limit * 0.1);
  const last = exam.idx + 1 >= exam.ids.length;
  return (
    <div ref={topRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="px-timerbar" style={{ position: "sticky", top: 0, zIndex: 6, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 14, background: "rgba(13,17,30,0.96)", border: `1px solid ${low ? "rgba(248,113,113,0.6)" : C.edge}` }}>
        <div role="timer" aria-live="off" aria-label={`Time left ${formatClock(remaining)}`} style={{ fontFamily: mono, fontWeight: 800, fontSize: 24, color: low ? C.red : C.cyan, minWidth: 0 }}>{"\u23f1"} {formatClock(remaining)}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "right", fontFamily: mono, fontSize: 14, color: C.soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exam.idx + 1}/{exam.ids.length} · {right}{"\u2713"} {done - right}{"\u2717"}</div>
        <button style={{ ...ghost, padding: "0 12px", fontSize: 14 }} onClick={endEarly}>End</button>
      </div>
      {hf && <MicPanel status={hfStatus} heard={heard} listenable={vc.listenable} count={q.options.length} need={q.answer.length} answered={!!answered}
        onMic={micTap} onPause={() => { if (hfPaused) { vc.engine.unlock(); setHfPaused(false); } else { flow.cancel(); setHfPaused(true); } }} paused={hfPaused}
        onRepeat={() => { vc.engine.unlock(); setHfPaused(false); setNonce((n) => n + 1); }} />}
      <div style={{ height: 6, borderRadius: 3, background: "#1b2440", overflow: "hidden" }}><div style={{ width: `${Math.round((exam.idx / exam.ids.length) * 100)}%`, height: "100%", background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`, transition: "width 300ms" }} /></div>
      <div style={{ ...card, padding: "16px 14px" }}>
        <div style={{ ...kicker, marginBottom: 8 }}>QUESTION {exam.idx + 1}{multi ? ` · PICK ${q.answer.length}` : ""}</div>
        <Stem q={q} />
      </div>
      <div role="group" aria-label="Answer choices" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {order.map((orig, pos) => {
          const o = q.options[orig];
          const isAns = q.answer.includes(orig);
          const isPick = picked.includes(orig);
          let border = C.edge, bg = "rgba(255,255,255,0.03)", badge = C.soft;
          if (!answered && isPick) { border = C.cyan; bg = "rgba(34,211,238,0.1)"; badge = C.cyan; }
          if (answered && isAns) { border = C.green; bg = "rgba(52,211,153,0.12)"; badge = C.green; }
          if (answered && isPick && !isAns) { border = C.red; bg = "rgba(248,113,113,0.12)"; badge = C.red; }
          return (
            <button key={orig} onClick={() => tap(orig)} disabled={!!answered} aria-pressed={isPick}
              style={{ display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", width: "100%", minHeight: 56, padding: "14px 14px", borderRadius: 14, border: `2px solid ${border}`, background: bg, color: C.ink, cursor: answered ? "default" : "pointer", transition: "all 150ms" }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: multi ? 8 : 15, border: `2px solid ${badge}`, color: badge, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>{answered && isAns ? "\u2713" : answered && isPick ? "\u2717" : LETTERS[pos]}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 1.4, paddingTop: 4, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: looksLikeCode(o.text) ? mono : "inherit" }}>{nb(o.text)}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{ ...card, borderColor: answered.ok ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.5)" }} aria-live="polite">
          <div style={{ fontSize: 20, fontWeight: 900, color: answered.ok ? C.green : C.red, marginBottom: 8 }}>{answered.ok ? "\u2713 Correct" : "\u2717 Not quite"}</div>
          <div style={{ fontSize: 14, color: C.soft, marginBottom: 10 }}>Answer: <b style={{ color: C.ink }}>{order.map((orig, pos) => (q.answer.includes(orig) ? LETTERS[pos] : "")).join("")}</b></div>
          {order.filter((orig) => q.answer.includes(orig)).map((orig) => (
            <p key={orig} style={{ margin: "0 0 10px", fontSize: 16, lineHeight: 1.5 }}><b style={{ color: C.green }}>{LETTERS[order.indexOf(orig)]}.</b> {q.options[orig].why}</p>
          ))}
          <div style={{ ...kicker, margin: "14px 0 8px" }}>WHY THE OTHERS ARE WRONG</div>
          {order.filter((orig) => !q.answer.includes(orig)).map((orig) => (
            <p key={orig} style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.5, color: C.soft }}><b style={{ color: answered.picked.includes(orig) ? C.red : C.ink }}>{LETTERS[order.indexOf(orig)]}.</b> {q.options[orig].why}</p>
          ))}
        </div>
      )}
      <Sticky>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
        {answered ? (
          <button style={bigBtn} onClick={next}>{last ? "Finish exam" : "Next question \u2192"}</button>
        ) : multi ? (
          <button style={{ ...bigBtn, opacity: draft.length === q.answer.length ? 1 : 0.45 }} disabled={draft.length !== q.answer.length} onClick={() => submit(draft)}>{draft.length === q.answer.length ? "Check answer" : `Pick ${q.answer.length - draft.length} more`}</button>
        ) : (
          <div style={{ textAlign: "center", fontSize: 14, color: C.faint, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>{hf ? "Say or tap an answer" : <>Tap an answer<span className="px-keyhint">{" \u00b7 "}or press A–{LETTERS[q.options.length - 1]}</span></>}</div>
        )}
        </div>
        {bubble(true)}
        </div>
      </Sticky>
    </div>
  );
}

type VC = ReturnType<typeof useVoice>;

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, width: 64, height: 44, borderRadius: 22, border: `2px solid ${on ? C.cyan : C.edge}`, background: on ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.04)", position: "relative", cursor: "pointer", padding: 0 }}>
      <span style={{ position: "absolute", top: 5, left: on ? 25 : 5, width: 30, height: 30, borderRadius: 15, background: on ? C.cyan : C.soft, transition: "left 150ms" }} />
    </button>
  );
}

const BUBBLE_CSS = `
@keyframes pxHfGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.55), 0 8px 24px rgba(34,211,238,0.35); } 50% { box-shadow: 0 0 0 8px rgba(34,211,238,0), 0 8px 30px rgba(167,139,250,0.5); } }
@keyframes pxHfDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.px-hf-bubble { -webkit-tap-highlight-color: transparent; transition: transform 120ms ease, background 200ms ease; }
.px-hf-bubble:active { transform: scale(0.94); }
.px-hf-bubble.on { animation: pxHfGlow 2.2s ease-in-out infinite; }
.px-hf-bubble.on .px-hf-dot { animation: pxHfDot 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .px-hf-bubble.on, .px-hf-bubble.on .px-hf-dot { animation: none; } }
@media (pointer: coarse) { .px-keyhint { display: none; } }
`;
const MicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2.5" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /><path d="M8.5 21h7" />
  </svg>
);
/** The hands-free switch everyone can find: a pill with a mic. Floating bottom-right on the setup screen; docked in the
 * sticky bar during a test so it never covers the answers or the Next button. On = filled gradient with a soft glow. */
function HfBubble({ on, status, docked, onToggle }: { on: boolean; status: string; docked: boolean; onToggle: () => void }) {
  const live = on && (status === "listening" || status === "speaking");
  const style: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8, minHeight: 50, padding: "0 10px 0 7px", borderRadius: 999, cursor: "pointer",
    fontSize: 15, fontWeight: 800, letterSpacing: "0.01em", whiteSpace: "nowrap", flexShrink: 0,
    border: on ? `2px solid ${C.cyan}` : "2px solid #3a4870",
    background: on ? "linear-gradient(135deg, rgba(34,211,238,0.28), rgba(167,139,250,0.24)), #0a1222" : "rgba(10,16,32,0.94)",
    color: on ? "#ffffff" : C.soft,
    boxShadow: on ? undefined : "0 6px 20px rgba(0,0,0,0.5)",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    ...(docked ? {} : { position: "fixed", right: "calc(14px + env(safe-area-inset-right))", bottom: "calc(16px + env(safe-area-inset-bottom))", zIndex: 30 }),
  };
  return (
    <>
      <style>{BUBBLE_CSS}</style>
      <button type="button" className={`px-hf-bubble${on ? " on" : ""}`} style={style} onClick={onToggle} role="switch" aria-checked={on}
        aria-label={on ? "Hands-free is on. Tap to turn it off." : "Hands-free is off. Tap to turn it on."}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, background: on ? C.cyan : "rgba(34,211,238,0.12)", color: on ? "#04121a" : C.cyan, boxShadow: on ? "0 0 14px rgba(34,211,238,0.8)" : undefined }}><MicIcon size={19} /></span>
        <span>Hands-free</span>
        <span className="px-hf-dot" style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.06em", padding: "3px 7px", borderRadius: 999, background: on ? (live ? C.green : C.cyan) : "rgba(255,255,255,0.07)", color: on ? "#04121a" : C.faint }}>{on ? "ON" : "OFF"}</span>
      </button>
    </>
  );
}

const REC = "__recorded__";
function HandsFreeCard({ vc, onToggle, test, recordedAvailable }: { vc: VC; onToggle: (on: boolean) => void; test: () => void; recordedAvailable: boolean }) {
  const { settings, setSettings, voices, chosen } = vc;
  const can = vc.synth || (vc.audio && recordedAvailable);
  const on = settings.on && can;
  const rec = settings.recorded && recordedAvailable;
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={kicker}>HANDS-FREE</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{vc.listenable ? "Read aloud and answer by voice" : "Read questions aloud"}</div>
        </div>
        {can && <Switch on={!!on} onChange={onToggle} label="Hands-free mode" />}
      </div>
      {!can ? (
        <p style={{ fontSize: 15, color: C.soft, margin: "10px 0 0", lineHeight: 1.5 }}>Read-aloud is not available in this browser.</p>
      ) : (
        <>
          <p style={{ fontSize: 15, color: C.soft, margin: "10px 0 0", lineHeight: 1.5 }}>
            {vc.listenable
              ? <>Each question and its options are read out, then it waits for you. Say <b style={{ color: C.ink }}>A, B, C or D</b> (or "A and C" when two answers are needed), or say <b style={{ color: C.ink }}>repeat, next, skip, pause</b> or <b style={{ color: C.ink }}>stop</b>. After the answer is explained, say <b style={{ color: C.ink }}>repeat</b> to hear it again or <b style={{ color: C.ink }}>next</b> to move on. Taps still work.</>
              : <>Each question and its options are read out. This browser cannot listen for spoken answers, so tap your answer.</>}
          </p>
          {on && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: C.soft }}>
                Voice
                <select value={rec ? REC : settings.voiceURI} onChange={(e) => { const v = e.target.value; setSettings((st) => (v === REC ? { ...st, recorded: true } : { ...st, recorded: false, voiceURI: v })); }}
                  style={{ minHeight: 48, borderRadius: 12, border: `1px solid ${C.edge}`, background: C.bg, color: C.text, fontSize: 16, padding: "0 12px", maxWidth: "100%" }}>
                  {recordedAvailable && <option value={REC}>Heart, recorded natural voice (best)</option>}
                  {vc.synth && <option value="">{voices[0] ? `Device voice, auto: ${voices[0].name}` : "Device default voice"}</option>}
                  {vc.synth && voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: C.soft }}>
                <span>Speed <b style={{ color: C.ink, fontFamily: mono }}>{settings.rate.toFixed(2)}x</b></span>
                <input type="range" min={RATE_MIN} max={RATE_MAX} step={0.05} value={settings.rate} aria-label="Speech speed"
                  onChange={(e) => setSettings((st) => ({ ...st, rate: clampRate(Number(e.target.value)) }))} style={{ width: "100%", height: 44, accentColor: C.cyan }} />
              </label>
              <button style={ghost} onClick={test}>{"\u25b6"} Test voice{rec ? ": Heart" : chosen ? `: ${chosen.name}` : ""}</button>
            </div>
          )}
          {rec && <p style={{ fontSize: 13, color: C.faint, margin: "12px 0 0", lineHeight: 1.5 }}>The recorded voice streams small audio files (about 250 KB per question) and loads the next question ahead of time.</p>}
          {!rec && <p style={{ fontSize: 13, color: C.faint, margin: "12px 0 0", lineHeight: 1.5 }}>Tip: Websites can't use Siri's voice. For a more natural voice on iPhone/Mac download a Premium voice in Settings &gt; Accessibility &gt; Spoken Content &gt; Voices; on Android install Speech Services by Google.</p>}
          {vc.listenable && <p style={{ fontSize: 13, color: C.faint, margin: "6px 0 0", lineHeight: 1.5 }}>Voice answers use your browser's built-in speech recognition. Some browsers, such as Chrome, send the audio to their own online service to turn it into text.</p>}
        </>
      )}
    </div>
  );
}

const MIC_STYLE: Record<string, { color: string; icon: string; label: string }> = {
  speaking: { color: C.violet, icon: "\ud83d\udd0a", label: "Reading aloud\u2026" },
  listening: { color: C.green, icon: "\ud83c\udfa4", label: "Listening\u2026" },
  waiting: { color: C.cyan, icon: "\ud83c\udfa4", label: "Tap the mic to answer by voice" },
  paused: { color: C.amber, icon: "\u23f8", label: "Paused" },
  blocked: { color: C.faint, icon: "\ud83d\udeab", label: "Microphone blocked" },
  idle: { color: C.soft, icon: "\ud83d\udd0a", label: "Hands-free on" },
  unsupported: { color: C.soft, icon: "\ud83d\udd07", label: "Voice answers not supported here" },
};

function MicPanel(p: { status: string; heard: { text: string; meaning: string } | null; listenable: boolean; count: number; need: number; answered: boolean; paused: boolean; onMic: () => void; onPause: () => void; onRepeat: () => void }) {
  const key = p.paused ? "paused" : !p.listenable && p.status === "waiting" ? "unsupported" : p.status;
  const st = MIC_STYLE[key] ?? MIC_STYLE.idle;
  const letters = LETTERS.slice(0, p.count).split("");
  const hint = key === "listening" ? (p.need > 1 ? `Say ${p.need} letters, like "A and C"` : `Say ${letters.slice(0, -1).join(", ")} or ${letters[letters.length - 1]}`)
    : key === "blocked" ? "Allow the microphone in site settings, or tap an answer."
    : key === "unsupported" ? "Questions are read aloud. Tap your answer."
    : key === "paused" ? "Tap \u25b6 to carry on." : key === "speaking" ? "Tap the mic to stop and answer now." : p.answered ? "Moving to the next question." : "";
  const hintNow = key === "listening" && p.answered ? 'Say "repeat" to hear it again, or "next"' : hint;
  return (
    <div className="px-hf" style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12, borderColor: `${st.color}66` }}>
      <style>{"@keyframes pxpulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}70%{box-shadow:0 0 0 16px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}"}</style>
      <button onClick={p.onMic} aria-label={`${st.label}. Tap the microphone.`}
        style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 32, border: `3px solid ${st.color}`, background: `${st.color}22`, fontSize: 28, cursor: "pointer", animation: key === "listening" ? "pxpulse 1.4s infinite" : "none", padding: 0 }}>{st.icon}</button>
      <div style={{ flex: 1, minWidth: 0 }} aria-live="polite">
        <div style={{ fontWeight: 800, fontSize: 17, color: st.color }}>{st.label}</div>
        {p.heard ? (
          <div style={{ fontSize: 14, color: C.ink, marginTop: 2, overflowWrap: "anywhere" }}>Heard "{p.heard.text}" {"\u2192"} <b style={{ color: p.heard.meaning === "not understood" ? C.amber : C.green }}>{p.heard.meaning}</b></div>
        ) : hintNow ? <div style={{ fontSize: 14, color: C.soft, marginTop: 2 }}>{hintNow}</div> : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button style={{ ...ghost, padding: 0, width: 48, fontSize: 18 }} onClick={p.onPause} aria-label={p.paused ? "Resume reading" : "Pause reading"}>{p.paused ? "\u25b6" : "\u23f8"}</button>
        <button style={{ ...ghost, padding: 0, width: 48, fontSize: 18 }} onClick={p.onRepeat} aria-label="Repeat">{"\u21bb"}</button>
      </div>
    </div>
  );
}

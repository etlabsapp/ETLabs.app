import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PRESETS, clampCount, drawExam, formatClock, missedIds, optionOrder, recordExam, timeLimitSeconds } from "./exam";
import type { Seen } from "./exam";

export type Block = { t: "p" | "code"; v: string };
export type PQ = { id: string; stem: Block[]; options: { text: string; why: string }[]; answer: number[] };
type Data = { version: number; total: number; questions: PQ[] };
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
        <div style={{ flex: 1, minWidth: 0, textAlign: "right", fontFamily: mono, fontSize: 14, color: C.soft }}>{exam.idx + 1}/{exam.ids.length} · {right}{"\u2713"} {done - right}{"\u2717"}</div>
        <button style={{ ...ghost, padding: "0 12px", fontSize: 14 }} onClick={endEarly}>End</button>
      </div>
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
        {answered ? (
          <button style={bigBtn} onClick={next}>{last ? "Finish exam" : "Next question \u2192"}</button>
        ) : multi ? (
          <button style={{ ...bigBtn, opacity: draft.length === q.answer.length ? 1 : 0.45 }} disabled={draft.length !== q.answer.length} onClick={() => submit(draft)}>{draft.length === q.answer.length ? "Check answer" : `Pick ${q.answer.length - draft.length} more`}</button>
        ) : (
          <div style={{ textAlign: "center", fontSize: 14, color: C.faint, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>Tap an answer{" \u00b7 "}or press A–{LETTERS[q.options.length - 1]}</div>
        )}
      </Sticky>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type Block = { t: "p" | "code"; v: string };
export type PQ = { id: string; set: number; n: number; stem: Block[]; options: { text: string; why: string }[]; answer: number[] };
type SetInfo = { set: number; title: string; count: number };
type Data = { version: number; sets: SetInfo[]; questions: PQ[] };
type Ans = { picked: number[]; ok: boolean };
type Session = { key: string; title: string; ids: string[]; idx: number; answers: Record<string, Ans> };
type Store = { sessions: Record<string, Session>; best: Record<string, number> };

const STORE_KEY = "etlabs-linux-plus-practice-v1";
const DATA_URL = "/linux-plus/practice-tests.json";
const C = { bg: "#0d1117", bar: "#161b22", text: "#e6edf3", dim: "#7d8590", panel: "rgba(17,24,39,0.9)", edge: "#24304d", ink: "#e5e9f5", soft: "#9aa6c4", faint: "#6b7796", cyan: "#22d3ee", violet: "#a78bfa", green: "#34d399", red: "#f87171", amber: "#fbbf24" };
const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const LETTERS = "ABCDEFGH";

/** Stable per-question option order, so the same question shows the same layout on every visit. */
export function optionOrder(id: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
export const isCorrect = (q: PQ, picked: number[]) => picked.length === q.answer.length && q.answer.every((a) => picked.includes(a));
const shuffled = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const looksLikeCode = (s: string) => !/^[A-Z]/.test(s) || /^[A-Z_]+=|^[A-Z]+ [a-z/]/.test(s) && !/ (the|a|an|to|is|and) /i.test(s);

function loadStore(): Store {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (s && s.sessions) return { sessions: s.sessions, best: s.best || {} }; } catch (_e) { /* ignore */ }
  return { sessions: {}, best: {} };
}
function saveStore(s: Store) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_e) { /* ignore */ } }

const Code = ({ v }: { v: string }) => (
  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #30363d", margin: "12px 0", maxWidth: "100%" }}>
    <div style={{ background: C.bar, padding: "6px 10px", display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: "#ff5f57" }} />
      <span style={{ width: 10, height: 10, borderRadius: 5, background: "#febc2e" }} />
      <span style={{ width: 10, height: 10, borderRadius: 5, background: "#28c840" }} />
      <span style={{ marginLeft: 6, fontSize: 11, color: C.dim, fontFamily: mono }}>sample output</span>
    </div>
    <pre className="px-code" style={{ margin: 0, background: C.bg, color: C.text, padding: "12px 12px 14px", fontFamily: mono, fontSize: 12.5, lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre", WebkitOverflowScrolling: "touch" }}>{v}</pre>
  </div>
);

export default function PracticeTests() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [store, setStore] = useState<Store>(loadStore);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<number[]>([]);
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
  const session = active ? store.sessions[active] : null;
  const q = session && session.idx < session.ids.length ? byId[session.ids[session.idx]] : null;
  const answered = q && session ? session.answers[q.id] : undefined;
  const finished = !!session && session.idx >= session.ids.length;

  const put = (s: Session) => setStore((st) => {
    const next: Store = { sessions: { ...st.sessions, [s.key]: s }, best: { ...st.best } };
    if (s.idx >= s.ids.length && !s.key.startsWith("review")) {
      const score = s.ids.filter((id) => s.answers[id]?.ok).length;
      next.best[s.key] = Math.max(next.best[s.key] ?? 0, score);
    }
    return next;
  });
  const scrollTop = () => setTimeout(() => topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  const startSession = (key: string, title: string, ids: string[]) => { put({ key, title, ids, idx: 0, answers: {} }); setActive(key); setDraft([]); scrollTop(); };
  const openSet = (info: SetInfo) => {
    const key = `set${info.set}`;
    const ex = store.sessions[key];
    if (ex && ex.ids.length === info.count) { setActive(key); setDraft([]); scrollTop(); return; }
    startSession(key, `${info.title}`, data!.questions.filter((x) => x.set === info.set).map((x) => x.id));
  };
  const openMix = (fresh: boolean) => {
    const ex = store.sessions.mix;
    if (ex && !fresh) { setActive("mix"); setDraft([]); scrollTop(); return; }
    startSession("mix", "Shuffle all", shuffled(data!.questions.map((x) => x.id)));
  };
  const submit = (picked: number[]) => {
    if (!q || !session || answered) return;
    put({ ...session, answers: { ...session.answers, [q.id]: { picked, ok: isCorrect(q, picked) } } });
  };
  const tap = (orig: number) => {
    if (!q || answered) return;
    if (q.answer.length === 1) { submit([orig]); return; }
    setDraft((d) => (d.includes(orig) ? d.filter((x) => x !== orig) : d.length >= q.answer.length ? d : [...d, orig]));
  };
  const next = () => { if (!session) return; put({ ...session, idx: session.idx + 1 }); setDraft([]); scrollTop(); };

  // Keyboard: letters pick, Enter checks or moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
      const order = optionOrder(q.id, q.options.length);
      const k = e.key.toUpperCase();
      const li = LETTERS.indexOf(k);
      if (k.length === 1 && li >= 0 && li < order.length) { e.preventDefault(); tap(order[li]); }
      else if (e.key === "Enter") { e.preventDefault(); if (answered) next(); else if (q.answer.length > 1 && draft.length === q.answer.length) submit(draft); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const card: CSSProperties = { background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 18, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" };
  const bigBtn: CSSProperties = { width: "100%", minHeight: 52, borderRadius: 14, border: "none", fontSize: 17, fontWeight: 800, cursor: "pointer", color: "#04121a", background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`, boxShadow: "0 8px 24px rgba(34,211,238,0.25)" };
  const ghost: CSSProperties = { minHeight: 44, borderRadius: 12, border: `1px solid ${C.edge}`, background: "rgba(255,255,255,0.03)", color: C.soft, fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "0 16px" };
  const Sticky = ({ children }: { children: ReactNode }) => (
    <div className="px-sticky" style={{ position: "sticky", bottom: 0, zIndex: 5, padding: "12px 0 calc(12px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(7,11,22,0), #070b16 35%)" }}>{children}</div>
  );

  if (err) return <div ref={topRef} style={{ ...card, color: C.amber }}>{err}</div>;
  if (!data) return <div ref={topRef} style={{ ...card, color: C.soft }} aria-live="polite">Loading practice tests…</div>;

  // ---------- Menu ----------
  if (!session) {
    const total = data.questions.length;
    const mix = store.sessions.mix;
    return (
      <div ref={topRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...card, background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(167,139,250,0.14)), rgba(17,24,39,0.9)" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.16em", fontWeight: 800, color: C.cyan }}>PRACTICE TESTS</div>
          <div className="px-h2" style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 6px", lineHeight: 1.2 }}>{total} exam-style questions</div>
          <div style={{ color: C.soft, fontSize: 15, lineHeight: 1.5 }}>One question at a time. Tap an answer to see right or wrong with a plain-English reason for every option. Progress saves on this device.</div>
        </div>
        <div className="px-sets" style={{ display: "grid", gap: 12 }}>
          {data.sets.map((info) => {
            const s = store.sessions[`set${info.set}`];
            const done = s ? Object.keys(s.answers).length : 0;
            const right = s ? Object.values(s.answers).filter((a) => a.ok).length : 0;
            const best = store.best[`set${info.set}`];
            const pct = Math.round((done / info.count) * 100);
            return (
              <div key={info.set} style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{info.title}</div>
                  <div style={{ fontFamily: mono, color: C.cyan, fontSize: 14 }}>{info.count} questions</div>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#1b2440", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})` }} /></div>
                <div style={{ fontSize: 14, color: C.soft }}>{done ? `${done} of ${info.count} answered · ${right} correct` : "Not started"}{best != null ? ` · best ${best}/${info.count}` : ""}</div>
                <button style={bigBtn} onClick={() => openSet(info)}>{!s ? "Start" : s.idx >= s.ids.length ? "See results" : "Continue"}</button>
                {s && <button style={ghost} onClick={() => startSession(`set${info.set}`, info.title, data.questions.filter((x) => x.set === info.set).map((x) => x.id))}>Start over</button>}
              </div>
            );
          })}
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10, borderColor: "rgba(167,139,250,0.45)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Shuffle all</div>
              <div style={{ fontFamily: mono, color: C.violet, fontSize: 14 }}>{total} questions</div>
            </div>
            <div style={{ fontSize: 14, color: C.soft }}>{mix ? `${Object.keys(mix.answers).length} answered · ${Object.values(mix.answers).filter((a) => a.ok).length} correct` : "All three sets mixed in random order."}</div>
            <button style={bigBtn} onClick={() => openMix(false)}>{mix ? (mix.idx >= mix.ids.length ? "See results" : "Continue") : "Start shuffle"}</button>
            {mix && <button style={ghost} onClick={() => openMix(true)}>New shuffle</button>}
          </div>
        </div>
      </div>
    );
  }

  const correctCount = session.ids.filter((id) => session.answers[id]?.ok).length;
  const answeredCount = Object.keys(session.answers).length;
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button style={{ ...ghost, padding: "0 12px" }} onClick={() => setActive(null)} aria-label="Back to practice tests">{"\u2190"} Tests</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</div>
        <div style={{ fontSize: 13, color: C.soft, fontFamily: mono }}>{finished ? "done" : `${session.idx + 1}/${session.ids.length}`} · {correctCount}{"\u2713"} {answeredCount - correctCount}{"\u2717"}</div>
      </div>
    </div>
  );

  // ---------- Results ----------
  if (finished) {
    const missed = session.ids.filter((id) => !session.answers[id]?.ok);
    const pct = Math.round((correctCount / session.ids.length) * 100);
    return (
      <div ref={topRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {header}
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.14em", color: C.faint, fontWeight: 700 }}>SCORE</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red }}>{pct}%</div>
          <div style={{ color: C.soft, fontSize: 16 }}>{correctCount} of {session.ids.length} correct</div>
        </div>
        {missed.length > 0 && <button style={bigBtn} onClick={() => startSession(`review-${session.key}`, `Review missed · ${session.title}`, missed)}>Review {missed.length} missed</button>}
        <button style={ghost} onClick={() => startSession(session.key, session.title.replace(/^Review missed · /, ""), session.key === "mix" ? shuffled(session.ids) : session.ids)}>Retake</button>
        <button style={ghost} onClick={() => setActive(null)}>Back to all tests</button>
      </div>
    );
  }
  if (!q) return null;

  // ---------- Question ----------
  const order = optionOrder(q.id, q.options.length);
  const multi = q.answer.length > 1;
  const picked = answered ? answered.picked : draft;
  const pctDone = Math.round((session.idx / session.ids.length) * 100);
  return (
    <div ref={topRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {header}
      <div style={{ height: 6, borderRadius: 3, background: "#1b2440", overflow: "hidden" }}><div style={{ width: `${pctDone}%`, height: "100%", background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`, transition: "width 300ms" }} /></div>
      <div style={{ ...card, padding: "16px 14px" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.14em", color: C.faint, fontWeight: 700, marginBottom: 8 }}>QUESTION {session.idx + 1}{multi ? ` · PICK ${q.answer.length}` : ""}</div>
        {q.stem.map((b, i) => (b.t === "code" ? <Code key={i} v={b.v} /> : <p key={i} className="px-stem" style={{ margin: "0 0 8px", fontSize: 18, lineHeight: 1.45, fontWeight: 600 }}>{b.v}</p>))}
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
              <span style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 1.4, paddingTop: 4, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: looksLikeCode(o.text) ? mono : "inherit" }}>{o.text}</span>
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
          <div style={{ fontSize: 12, letterSpacing: "0.14em", color: C.faint, fontWeight: 700, margin: "14px 0 8px" }}>WHY THE OTHERS ARE WRONG</div>
          {order.filter((orig) => !q.answer.includes(orig)).map((orig) => (
            <p key={orig} style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.5, color: C.soft }}><b style={{ color: answered.picked.includes(orig) ? C.red : C.ink }}>{LETTERS[order.indexOf(orig)]}.</b> {q.options[orig].why}</p>
          ))}
        </div>
      )}
      <Sticky>
        {answered ? (
          <button style={bigBtn} onClick={next}>{session.idx + 1 >= session.ids.length ? "See results" : "Next question \u2192"}</button>
        ) : multi ? (
          <button style={{ ...bigBtn, opacity: draft.length === q.answer.length ? 1 : 0.45 }} disabled={draft.length !== q.answer.length} onClick={() => submit(draft)}>{draft.length === q.answer.length ? "Check answer" : `Pick ${q.answer.length - draft.length} more`}</button>
        ) : (
          <div style={{ textAlign: "center", fontSize: 14, color: C.faint, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>Tap an answer{" \u00b7 "}or press A–{LETTERS[q.options.length - 1]}</div>
        )}
      </Sticky>
    </div>
  );
}

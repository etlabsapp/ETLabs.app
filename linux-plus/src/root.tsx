import { useEffect, useState } from "react";
import { Lab } from "./lab";
import PracticeTests from "./practice";

type View = "practice" | "lab";
const viewFromHash = (): View => (typeof location !== "undefined" && location.hash === "#lab" ? "lab" : "practice");
const P = { page: "#070b16", ink: "#e5e9f5", soft: "#9aa6c4", faint: "#6b7796", cyan: "#22d3ee", violet: "#a78bfa", edge: "#1f2a44" };

export default function Root() {
  const [view, setView] = useState<View>(viewFromHash);
  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (v: View) => {
    setView(v);
    try { history.replaceState(null, "", v === "lab" ? "#lab" : "#practice"); } catch (_e) { /* ignore */ }
    window.scrollTo({ top: 0 });
  };
  const tab = (v: View, label: string, sub: string) => {
    const on = view === v;
    return (
      <button role="tab" aria-selected={on} onClick={() => go(v)} className="rt-tab"
        style={{ flex: 1, minHeight: 48, borderRadius: 12, border: "none", cursor: "pointer", padding: "6px 10px", background: on ? `linear-gradient(90deg, ${P.cyan}, ${P.violet})` : "transparent", color: on ? "#04121a" : P.soft, fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>
        {label}<span className="rt-sub" style={{ display: "block", fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{sub}</span>
      </button>
    );
  };
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(1000px 500px at 10% -10%, rgba(34,211,238,0.12), transparent), radial-gradient(900px 500px at 100% 0%, rgba(167,139,250,0.12), transparent), ${P.page}`, color: P.ink, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", overflowX: "clip" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;background:${P.page};overflow-x:clip;-webkit-text-size-adjust:100%}
        .rt-wrap{max-width:1100px;margin:0 auto;padding:12px 14px 28px}
        .rt-narrow{max-width:720px;margin:0 auto}
        .rt-h1{font-size:26px}
        @media (min-width:721px){ .rt-wrap{padding:24px 24px 40px} .rt-h1{font-size:34px} }
      `}</style>
      <div className="rt-wrap">
        <header style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 14 }}>
            <a href="/" style={{ color: P.cyan, textDecoration: "none", padding: "14px 8px 14px 0" }}>ET Labs</a>
            <a href="/study/" style={{ color: P.soft, textDecoration: "none", padding: "14px 8px" }}>Security+ Study</a>
            <a href="/products" style={{ color: P.soft, textDecoration: "none", padding: "14px 8px" }}>Products</a>
          </nav>
          <h1 className="rt-h1" style={{ fontWeight: 900, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1, background: `linear-gradient(90deg, ${P.ink}, ${P.cyan} 60%, ${P.violet})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Linux+ Study</h1>
        </header>
        <div role="tablist" aria-label="Study mode" style={{ display: "flex", gap: 6, padding: 5, borderRadius: 16, background: "rgba(13,17,30,0.92)", border: `1px solid ${P.edge}`, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", marginBottom: 16 }}>
          {tab("practice", "Practice Exam", "250 questions")}
          {tab("lab", "Terminal Lab", "10 missions")}
        </div>
        <main>{view === "practice" ? <div className="rt-narrow"><PracticeTests /></div> : <Lab />}</main>
        <footer style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${P.edge}`, fontSize: 12, lineHeight: 1.6, color: P.faint, textAlign: "center" }}>
          Not affiliated with or endorsed by CompTIA. CompTIA and Linux+ are trademarks of CompTIA, Inc. Practice questions are original study material, and terminal output in the lab is illustrative.
        </footer>
      </div>
    </div>
  );
}

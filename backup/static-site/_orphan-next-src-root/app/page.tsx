import Link from "next/link";

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_SLEEPTIGHT_APP_STORE_URL ?? "";

const s = {
  page: {
    minHeight: "100vh" as const,
    color: "#11121a",
    background:
      "radial-gradient(ellipse 100% 60% at 50% -15%, rgba(181, 192, 255, 0.28), transparent 50%), linear-gradient(180deg, #f2f3fa 0%, #eef0f8 100%)",
    fontFamily:
      '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  stars: {
    pointerEvents: "none" as const,
    position: "fixed" as const,
    inset: 0,
    zIndex: 0,
    opacity: 0.3,
    backgroundImage: `
      radial-gradient(1px 1px at 15% 25%, rgba(75, 89, 201, 0.35), transparent),
      radial-gradient(1px 1px at 85% 40%, rgba(75, 89, 201, 0.2), transparent)
    `,
  },
  wrap: { position: "relative" as const, zIndex: 1 },
  container: {
    width: "min(1120px, calc(100% - 48px))",
    margin: "0 auto",
  },
  eyebrow: {
    margin: "0 0 14px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "#4b59c9",
  },
  h1: {
    margin: "0 0 16px",
    fontSize: "clamp(2.5rem, 5.5vw, 3.75rem)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.05,
    maxWidth: "820px",
  },
  lead: {
    margin: "0 0 28px",
    fontSize: "1.08rem",
    lineHeight: 1.75,
    color: "#636676",
    maxWidth: "680px",
  },
  actions: { display: "flex", flexWrap: "wrap" as const, gap: "14px" },
  btnP: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "52px",
    padding: "0 22px",
    borderRadius: "16px",
    fontWeight: 700,
    color: "#fff",
    background: "linear-gradient(135deg, #11121a 0%, #1f2436 50%, #11121a 100%)",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.2)",
    textDecoration: "none",
  },
  btnS: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "52px",
    padding: "0 22px",
    borderRadius: "16px",
    fontWeight: 600,
    color: "#11121a",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(255,255,255,0.88)",
    textDecoration: "none",
  },
  section: { padding: "72px 0" },
  h2: {
    margin: "0 0 12px",
    fontSize: "clamp(1.65rem, 3vw, 2.1rem)",
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  st: {
    margin: "0 0 24px",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    color: "#636676",
    maxWidth: "640px",
  },
  card: {
    padding: "28px 26px",
    borderRadius: "22px",
    border: "1px solid rgba(22, 24, 35, 0.07)",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    marginBottom: "20px",
  },
  chip: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#fff",
    background: "linear-gradient(135deg, #4b59c9, #7b86e6)",
    marginBottom: "10px",
  },
  muted: { fontSize: "0.95rem", color: "#636676", lineHeight: 1.65 },
};

export default function HomePage() {
  return (
    <>
      <div style={s.stars} aria-hidden />
      <div style={s.page}>
        <div style={s.wrap}>
          <section style={{ ...s.section, paddingTop: "88px" }}>
            <div style={s.container}>
              <p style={s.eyebrow}>Intentional software studio</p>
              <h1 style={s.h1}>Software should support life, not consume it.</h1>
              <p style={s.lead}>
                ET Labs builds calm, focused tools that help people do something
                meaningful—then return to their lives. No infinite feeds. No engagement
                tricks. The flagship app is SleepTight: DreamWrite; smaller experiments
                like FlipFeed stay clearly secondary.
              </p>
              <div style={s.actions}>
                <Link href="#products" style={s.btnP}>
                  Explore products
                </Link>
                <Link href="#philosophy" style={s.btnS}>
                  Read the philosophy
                </Link>
              </div>
            </div>
          </section>

          <section style={s.section} id="philosophy">
            <div style={s.container}>
              <p style={s.eyebrow}>Philosophy</p>
              <h2 style={s.h2}>Finishable experiences</h2>
              <p style={s.st}>
                Clear starts and ends, restrained surfaces, and respect for attention.
                Products are meant to be left—not to colonize the evening.
              </p>
            </div>
          </section>

          <section style={s.section} id="products">
            <div style={s.container}>
              <p style={s.eyebrow}>Products</p>
              <h2 style={s.h2}>Focused tools</h2>
              <p style={s.st}>
                One main product in submission; one side experiment for displays and
                streams.
              </p>

              <div style={s.card}>
                <span style={s.chip}>Featured</span>
                <p style={s.eyebrow}>Submitted to the App Store</p>
                <h2 style={{ ...s.h2, fontSize: "1.75rem" }}>SleepTight: DreamWrite</h2>
                <p style={s.muted}>
                  Sleep timing, real alarms, naps, guided rituals (prayer, affirmations,
                  gratitude, reflection) with time-of-day personalization, morning and nap
                  check-ins, and private journaling. Voice memos are free. SleepTight+ adds
                  DreamWrite—on-device transcription, full archive beyond the free typed
                  window, transcript-backed search—plus Morning Score, Sleep Debt, Ideal
                  Bedtime Tonight, and Weekly Sleep Report.
                </p>
                <div style={{ ...s.actions, marginTop: "22px" }}>
                  <Link href="/apps/sleeptight" style={s.btnP}>
                    Product details
                  </Link>
                  {APP_STORE_URL ? (
                    <Link href={APP_STORE_URL} style={s.btnS}>
                      App Store
                    </Link>
                  ) : null}
                </div>
              </div>

              <div style={{ ...s.card, opacity: 0.97 }}>
                <p style={s.eyebrow}>Side experiment</p>
                <h2 style={{ ...s.h2, fontSize: "1.5rem" }}>FlipFeed</h2>
                <p style={s.muted}>
                  Live split-flap board for TVs, lobbies, and streams—useful for demos and
                  post-launch experiments, not part of the sleep product.
                </p>
                <div style={{ ...s.actions, marginTop: "18px" }}>
                  <a
                    href="https://etlabsflipfeed.vercel.app/"
                    style={s.btnS}
                    rel="noopener noreferrer"
                  >
                    Open FlipFeed
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

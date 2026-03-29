import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SleepTight: DreamWrite | ET Labs",
  description:
    "Sleep timing, real alarms, naps, guided rituals, and private journaling on iPhone. Voice memos free; SleepTight+ adds DreamWrite transcription, archive, and search.",
};

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_SLEEPTIGHT_APP_STORE_URL ?? "";

const base = {
  color: "#11121a",
  fontFamily:
    '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

const styles = {
  page: {
    ...base,
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(181, 192, 255, 0.35), transparent 55%), linear-gradient(180deg, #f2f3fa 0%, #eef0f8 55%, #f2f3fa 100%)",
  },
  stars: {
    pointerEvents: "none" as const,
    position: "fixed" as const,
    inset: 0,
    zIndex: 0,
    opacity: 0.35,
    backgroundImage: `
      radial-gradient(1px 1px at 10% 20%, rgba(75, 89, 201, 0.4), transparent),
      radial-gradient(1px 1px at 80% 30%, rgba(75, 89, 201, 0.25), transparent),
      radial-gradient(1px 1px at 40% 70%, rgba(75, 89, 201, 0.2), transparent),
      radial-gradient(1px 1px at 90% 80%, rgba(75, 89, 201, 0.3), transparent)
    `,
    backgroundSize: "100% 100%",
  },
  inner: { position: "relative" as const, zIndex: 1 },
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
    fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.08,
  },
  sub: {
    margin: "0 0 16px",
    fontSize: "clamp(1.05rem, 2vw, 1.2rem)",
    color: "#3b3f4f",
    lineHeight: 1.6,
    maxWidth: "40rem",
  },
  tag: {
    margin: "0 0 24px",
    fontSize: "0.9rem",
    color: "#636676",
    letterSpacing: "0.05em",
  },
  body: {
    margin: "0 0 28px",
    fontSize: "1.05rem",
    lineHeight: 1.75,
    color: "#636676",
    maxWidth: "44rem",
  },
  actions: { display: "flex", flexWrap: "wrap" as const, gap: "14px" },
  btnPrimary: {
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
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "52px",
    padding: "0 22px",
    borderRadius: "16px",
    fontWeight: 600,
    color: "#11121a",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(255,255,255,0.85)",
    textDecoration: "none",
  },
  section: { padding: "64px 0" },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: "clamp(1.65rem, 3vw, 2.05rem)",
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  sectionLead: {
    margin: "0 0 24px",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    color: "#636676",
    maxWidth: "42rem",
  },
  grid2: {
    display: "grid",
    gap: "20px",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  grid3: {
    display: "grid",
    gap: "18px",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  },
  card: {
    padding: "22px 20px",
    borderRadius: "20px",
    border: "1px solid rgba(22, 24, 35, 0.06)",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 12px 36px rgba(15, 23, 42, 0.05)",
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: "1rem",
    fontWeight: 700,
  },
  cardText: { margin: 0, fontSize: "0.95rem", lineHeight: 1.65, color: "#636676" },
  list: {
    margin: "10px 0 0",
    paddingLeft: "1.2rem",
    color: "#636676",
    fontSize: "0.95rem",
    lineHeight: 1.65,
  },
  twoCol: {
    display: "grid",
    gap: "28px",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  callout: {
    padding: "26px 24px",
    borderRadius: "20px",
    border: "1px solid rgba(75, 89, 201, 0.15)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,244,247,0.88))",
  },
  muted: { color: "#636676", fontSize: "0.94rem", lineHeight: 1.65 },
  hr: {
    border: "none",
    borderTop: "1px solid rgba(22, 24, 35, 0.08)",
    margin: "40px 0",
  },
};

const freeFeatures = [
  "Bedtime planning",
  "Cycle-based planning",
  "Wake-target planning",
  "Alarm scheduling",
  "Nap planning",
  "Guided bedtime ritual",
  "Sleep wake confirmation",
  "Nap wake confirmation",
  "Morning check-ins",
  "Nap check-ins",
  "Typed dreams and reflections",
  "Local voice memo recording",
  "History and archive browsing",
  "Free typed dream review for the last 7 days",
  "Analytics browsing",
  "Bedtime reminders",
  "Live Activities",
];

const plusFeatures = [
  "Morning Score (with breakdown and framing)",
  "Sleep Debt",
  "Ideal Bedtime Tonight",
  "Weekly Sleep Report",
  "DreamWrite: full archive beyond 7 days",
  "DreamWrite: searchable voice journaling (transcripts)",
  "On-device transcription for dream and reflection memos",
  "Transcript-backed history search",
];

export default function SleepTightPage() {
  return (
    <>
      <div style={styles.stars} aria-hidden />
      <main style={styles.page}>
        <div style={styles.inner}>
          <section style={{ ...styles.section, paddingTop: "80px" }}>
            <div style={styles.container}>
              <p style={styles.eyebrow}>Submitted to the App Store</p>
              <h1 style={styles.h1}>SleepTight: DreamWrite</h1>
              <p style={styles.sub}>
                Sleep and nap guidance built around timing, real alarms, guided rituals,
                and private recovery—not meditation audio or wearable dashboards.
              </p>
              <p style={styles.tag}>
                Calm interface · Finishable flow · Privacy-first
              </p>
              <p style={styles.body}>
                SleepTight today is a sleep timing and recovery app with nightly planning,
                real alarm scheduling, naps, guided ritual content before sleep,
                different personalized sendoff content after waking, staged morning and nap
                check-ins, typed and voice dream journaling, a free 7-day typed dream
                review window, and optional SleepTight+ for DreamWrite (full archive,
                on-device transcription, transcript search) plus premium sleep
                intelligence on the clock and weekly reporting.
              </p>
              <div style={styles.actions}>
                {APP_STORE_URL ? (
                  <Link href={APP_STORE_URL} style={styles.btnPrimary}>
                    Explore SleepTight
                  </Link>
                ) : (
                  <span
                    style={{
                      ...styles.btnPrimary,
                      cursor: "default",
                      opacity: 0.92,
                    }}
                  >
                    App Store link when live
                  </span>
                )}
                <Link href="#flow" style={styles.btnSecondary}>
                  See the full flow
                </Link>
              </div>
            </div>
          </section>

          <section style={styles.section} id="philosophy">
            <div style={styles.container}>
              <p style={styles.eyebrow}>Why this exists</p>
              <h2 style={styles.sectionTitle}>
                Software that supports rest, then steps aside
              </h2>
              <p style={styles.sectionLead}>
                The product story is sleep timing intelligence, ritualized bedtime
                guidance, morning and nap recovery capture, and private journaling—with
                optional premium interpretation. It is not positioned as meditation
                content, a wearable companion, or an engagement feed.
              </p>
            </div>
          </section>

          <section style={styles.section} id="flow">
            <div style={styles.container}>
              <p style={styles.eyebrow}>How it works</p>
              <h2 style={styles.sectionTitle}>
                Night planning → rest ritual → wake recovery → long-term reflection
              </h2>
              <p style={styles.sectionLead}>
                Three loops connect: plan the night, move through ritual and active rest,
                recover after wake, then revisit history on your terms.
              </p>
              <div style={styles.grid2}>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Night planning</h3>
                  <p style={styles.cardText}>
                    Clock home summarizes the plan; free users see wake framing while
                    SleepTight+ adds Ideal Bedtime Tonight, Sleep Debt, and Morning Score
                    on the same calm surface. Unified planner supports cycles and wake
                    targets; alarms confirm real sleep and nap schedules.
                  </p>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Rest ritual</h3>
                  <p style={styles.cardText}>
                    Bedtime ritual modes: prayer, affirmations, gratitude, or
                    reflection—with time-of-day personalization and separate morning or nap
                    sendoffs. Active sleep and nap states include Live Activities where
                    supported.
                  </p>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Wake recovery</h3>
                  <p style={styles.cardText}>
                    Wake confirmation, then staged check-ins. Typed dreams and reflections
                    and local voice memos. Morning Score reveal and breakdown are
                    SleepTight+; recording voice is always free.
                  </p>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Long-term reflection</h3>
                  <p style={styles.cardText}>
                    History, archive browsing, text-note search, analytics. DreamWrite
                    unlocks full typed archive beyond seven days, on-device transcription,
                    and transcript-backed search—no cloud sync of personal journal data.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section style={styles.section} id="surfaces">
            <div style={styles.container}>
              <p style={styles.eyebrow}>Key surfaces</p>
              <h2 style={styles.sectionTitle}>Where the app lives</h2>
              <div style={styles.grid3}>
                {[
                  {
                    t: "Clock Home",
                    d: "Tonight’s plan plus optional SleepTight+ intelligence cards.",
                  },
                  {
                    t: "Unified Sleep Planner",
                    d: "Cycles, wake targets, fall-asleep time, and planned duration.",
                  },
                  {
                    t: "Bedtime Ritual",
                    d: "Prayer, affirmations, gratitude, or reflection—personalized by context.",
                  },
                  {
                    t: "Active Sleep & Nap",
                    d: "In-session UI and Live Activities during rest.",
                  },
                  {
                    t: "Morning & Nap Check-In",
                    d: "Staged recovery after sleep alarms and nap timers.",
                  },
                  {
                    t: "Dream & Reflection Journaling",
                    d: "Typed entries; voice memos free. Transcription and transcript search are SleepTight+.",
                  },
                ].map((x) => (
                  <div key={x.t} style={styles.card}>
                    <h3 style={styles.cardTitle}>{x.t}</h3>
                    <p style={styles.cardText}>{x.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={styles.section} id="pillars">
            <div style={styles.container}>
              <p style={styles.eyebrow}>Product pillars</p>
              <h2 style={styles.sectionTitle}>What ships today</h2>
              <ul style={{ ...styles.list, maxWidth: "40rem" }}>
                <li>Onboarding and personalization</li>
                <li>Clock home and night planning</li>
                <li>Unified sleep planner</li>
                <li>Guided bedtime ritual</li>
                <li>Alarm scheduling and active rest</li>
                <li>Morning recovery flow</li>
                <li>Nap planning and nap recovery</li>
                <li>Dream and reflection journaling</li>
                <li>History and searchable archive</li>
                <li>Analytics and premium intelligence</li>
                <li>Profile, privacy, and billing management</li>
              </ul>
            </div>
          </section>

          <section style={styles.section} id="free-plus">
            <div style={styles.container}>
              <p style={styles.eyebrow}>Free vs SleepTight+</p>
              <h2 style={styles.sectionTitle}>Clear boundaries</h2>
              <p style={styles.sectionLead}>
                Voice recording is free. DreamWrite means on-device transcription,
                transcript-backed search, and full dream/reflection archive beyond the free
                typed window—all part of SleepTight+.
              </p>
              <div style={styles.twoCol}>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>SleepTight (no subscription)</h3>
                  <ul style={styles.list}>
                    {freeFeatures.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>SleepTight+</h3>
                  <ul style={styles.list}>
                    {plusFeatures.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section style={styles.section} id="design">
            <div style={styles.container}>
              <p style={styles.eyebrow}>Built with intention</p>
              <h2 style={styles.sectionTitle}>Calm by default</h2>
              <p style={styles.sectionLead}>
                Starfield-style atmosphere, soft cards, and reflective copy match the
                in-app design language: ritualized, not dashboard-first. The focus stays on
                sleep timing intelligence, recovery capture, and private journaling—not
                hype or infinite scroll.
              </p>
            </div>
          </section>

          <section style={styles.section} id="privacy">
            <div style={styles.container}>
              <div style={styles.callout}>
                <p style={styles.eyebrow}>Privacy-first</p>
                <h2 style={{ ...styles.sectionTitle, marginBottom: "12px" }}>
                  Local-first, on-device transcription
                </h2>
                <p style={styles.muted}>
                  Sessions, memos, and transcripts stay on device. DreamWrite transcription
                  runs on the phone. Deleting a session removes linked audio and transcript
                  locally. No cloud sync of personal sleep or journal data in the shipped
                  product. Subscriptions use StoreKit 2 and Apple’s standard purchase and
                  restore flows.
                </p>
              </div>
            </div>
          </section>

          <section style={styles.section} id="safe-claims">
            <div style={styles.container}>
              <p style={styles.eyebrow}>Straightforward claims</p>
              <h2 style={styles.sectionTitle}>Safe to say today</h2>
              <ul style={{ ...styles.list, maxWidth: "42rem" }}>
                <li>Plan bedtime and wake time</li>
                <li>Schedule alarms</li>
                <li>Run naps</li>
                <li>Complete staged morning and nap check-ins</li>
                <li>Record local dream and reflection voice memos</li>
                <li>Keep a private local rest history</li>
                <li>Search text notes</li>
                <li>
                  With SleepTight+: searchable voice-journal transcripts, weekly reports,
                  sleep debt, and ideal bedtime guidance
                </li>
              </ul>
              <p style={{ ...styles.muted, marginTop: "20px", maxWidth: "42rem" }}>
                Not claimed: dream export, recurring symbol or motif analysis, AI dream
                interpretation, guided audio libraries, wearable or health-data sync.
              </p>
            </div>
          </section>

          <hr style={styles.hr} />

          <section style={{ ...styles.section, paddingBottom: "88px" }} id="cta">
            <div style={styles.container}>
              <h2 style={styles.sectionTitle}>
                {APP_STORE_URL ? "Available on the App Store" : "App Store review"}
              </h2>
              <p style={styles.sectionLead}>
                {APP_STORE_URL
                  ? "Download SleepTight: DreamWrite when you are ready for a calmer night loop."
                  : "Submitted as SleepTight: DreamWrite. The listing link will go live after Apple approval."}
              </p>
              <div style={styles.actions}>
                {APP_STORE_URL ? (
                  <Link href={APP_STORE_URL} style={styles.btnPrimary}>
                    Open in App Store
                  </Link>
                ) : null}
                <Link href="/" style={styles.btnSecondary}>
                  Back to ET Labs
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

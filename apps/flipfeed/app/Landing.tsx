import Link from "next/link";

export default function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0d0d0f",
        color: "#e8e6e3",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 8 }}>
        FlipFeed
      </h1>
      <p style={{ color: "#9c9892", marginBottom: 32, textAlign: "center", maxWidth: 320 }}>
        Your configurable split-flap board. Weather, feeds, and more — set it once, then just the board.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/signup"
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: "#e8e6e3",
            color: "#0d0d0f",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Sign up
        </Link>
        <Link
          href="/signin"
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#e8e6e3",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

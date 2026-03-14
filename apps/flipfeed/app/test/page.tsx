export default function TestPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0f",
        color: "#e8e6e3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>FlipFeed is running</h1>
      <p style={{ color: "#9c9892", marginBottom: 24 }}>
        If you see this, the server is working.
      </p>
      <a
        href="/"
        style={{
          color: "#e8e6e3",
          textDecoration: "underline",
        }}
      >
        Go to board →
      </a>
    </div>
  );
}

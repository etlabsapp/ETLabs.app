import type { CSSProperties, ReactNode } from "react";
import type { DayRow } from "@/lib/appstore-sales";

type Props = {
  rows: DayRow[];
  err: string | null;
  lookback: number;
  filterNote: string;
  nav?: ReactNode;
};

export function AppStoreUnitsBody({ rows, err, lookback, filterNote, nav }: Props) {
  const total = rows.reduce((s, r) => s + r.units, 0);

  return (
    <main style={shell}>
      {nav}
      <h1 style={h1}>App Store units</h1>
      <p style={muted}>
        Official daily SALES summary — last {lookback} days. {filterNote}. Reports can lag a day.
      </p>
      {err && (
        <p style={{ ...muted, color: "#f87171" }} role="alert">
          {err}
        </p>
      )}
      <p style={totalStyle}>
        <strong>Sum:</strong> {total.toLocaleString()}
      </p>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Date</th>
            <th style={{ ...th, textAlign: "right" }}>Units</th>
            <th style={{ ...th, textAlign: "right" }}>Rows</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date}>
              <td style={td}>{r.date}</td>
              <td style={{ ...td, textAlign: "right" }}>{r.missing ? "—" : r.units.toLocaleString()}</td>
              <td style={{ ...td, textAlign: "right", color: "#9c9892" }}>
                {r.missing ? "n/a" : r.rows}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const shell: CSSProperties = {
  maxWidth: 560,
  margin: "2rem auto",
  padding: "0 1.5rem",
  fontFamily: "system-ui, sans-serif",
};

const h1: CSSProperties = { fontSize: "1.5rem", marginBottom: 8 };

const muted: CSSProperties = { color: "#9c9892", fontSize: "0.95rem", lineHeight: 1.5 };

const totalStyle: CSSProperties = { marginTop: "1.25rem", fontSize: "1.1rem" };

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "1rem",
};

const th: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  padding: "0.5rem 0.25rem",
  color: "#9c9892",
  fontWeight: 600,
};

const td: CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  padding: "0.45rem 0.25rem",
};

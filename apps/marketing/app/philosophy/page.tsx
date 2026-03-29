import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function PhilosophyPage() {
  return (
    <SiteShell>
      <main id="top" className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            <Link href="/" style={{ fontWeight: 600 }}>
              ← Home
            </Link>
          </p>
          <h1 className="section-title">Philosophy</h1>
          <p className="section-text">
            Stub — copy the full narrative from <code>philosophy.html</code> into this route when you retire the
            static export.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}

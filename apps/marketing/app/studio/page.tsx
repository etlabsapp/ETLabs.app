import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function StudioPage() {
  return (
    <SiteShell>
      <main id="top" className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            <Link href="/" style={{ fontWeight: 600 }}>
              ← Home
            </Link>
          </p>
          <h1 className="section-title">Studio</h1>
          <p className="section-text">
            Stub — migrate <code>studio.html</code> when you consolidate pages.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}

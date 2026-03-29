import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function ContactPage() {
  return (
    <SiteShell>
      <main id="top" className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            <Link href="/" style={{ fontWeight: 600 }}>
              ← Home
            </Link>
          </p>
          <h1 className="section-title">Contact</h1>
          <p className="section-text">
            Stub — add the form from <code>contact.html</code> (Netlify Forms, server action, or third-party).
          </p>
        </div>
      </main>
    </SiteShell>
  );
}

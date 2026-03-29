import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function ThankYouPage() {
  return (
    <SiteShell>
      <main id="top">
        <section className="section" style={{ textAlign: "center", paddingTop: 100, paddingBottom: 100 }}>
          <div className="container">
            <p className="eyebrow">Thank you</p>
            <h1 className="section-title" style={{ marginBottom: 16 }}>
              You&apos;re on the list.
            </h1>
            <p className="section-text" style={{ maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              We&apos;ll email you when SleepTight launches and keep you updated on progress. No spam—just launch news
              and product updates.
            </p>
            <div className="split-actions" style={{ marginTop: 32, justifyContent: "center" }}>
              <Link href="/apps/sleeptight/index.html" className="primary-button">
                Back to SleepTight
              </Link>
              <Link href="/" className="secondary-button">
                ET Labs home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}

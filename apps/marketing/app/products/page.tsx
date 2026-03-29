import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function ProductsPage() {
  return (
    <SiteShell>
      <main id="top" className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            <Link href="/" style={{ fontWeight: 600 }}>
              ← Home
            </Link>
          </p>
          <h1 className="section-title">Products</h1>
          <p className="section-text">
            Stub — migrate <code>products.html</code> here for the full products overview.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}

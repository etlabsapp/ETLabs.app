import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-shell">
        <div>
          <div className="footer-brand">
            <img
              src="/assets/images/etlabs-logo.svg"
              alt="ET Labs logo"
              style={{ height: 70, width: "auto", display: "block" }}
            />
          </div>
          <p className="footer-copy">Software should support life, not consume it.</p>
        </div>
        <div className="footer-links">
          <Link href="/philosophy">Philosophy</Link>
          <Link href="/products">Products</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/apps/sleeptight/index.html">SleepTight</Link>
          <a href="https://etlabsflipfeed.vercel.app/">FlipFeed</a>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

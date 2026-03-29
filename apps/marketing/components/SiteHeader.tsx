"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeProducts = useCallback(() => setProductsOpen(false), []);

  useEffect(() => {
    function onDocClick() {
      setProductsOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <header className="site-header">
      <div className="container">
        <div className="nav-shell">
          <Link href="/" className="brand-mark" aria-label="ET Labs home">
            <img
              src="/assets/images/etlabs-logo.svg"
              alt="ET Labs logo"
              style={{ height: 96, width: "auto", display: "block" }}
            />
          </Link>

          <button
            className="mobile-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
          </button>

          <nav className={`site-nav${menuOpen ? " is-open" : ""}`} id="site-menu">
            <Link href="/philosophy" onClick={() => setMenuOpen(false)}>
              Philosophy
            </Link>
            <div
              className={`nav-dropdown${productsOpen ? " is-open" : ""}`}
              ref={dropdownRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="nav-dropdown-trigger"
                aria-expanded={productsOpen}
                aria-haspopup="true"
                aria-controls="products-dropdown"
                id="products-dropdown-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setProductsOpen((o) => !o);
                }}
              >
                Products
              </button>
              <div className="nav-dropdown-menu" id="products-dropdown" role="menu">
                <Link href="/apps/sleeptight/index.html" role="menuitem" onClick={closeProducts}>
                  SleepTight: DreamWrite
                </Link>
                <a href="https://etlabsflipfeed.vercel.app/" role="menuitem" onClick={closeProducts}>
                  FlipFeed <em>(Side experiment)</em>
                </a>
              </div>
            </div>
            <Link href="/studio" onClick={() => setMenuOpen(false)}>
              Studio
            </Link>
            <Link href="/apps/sleeptight/support.html" onClick={() => setMenuOpen(false)}>
              Support
            </Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)}>
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

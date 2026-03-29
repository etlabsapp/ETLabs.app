"use client";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

/** Same background + nav + footer as the static site (fragment so `main` can stay a direct child of `body`). */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}

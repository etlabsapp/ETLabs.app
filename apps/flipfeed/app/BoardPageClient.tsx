"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SplitFlapBoard } from "@/components/SplitFlapBoard";
import { getFeedUrl } from "@/lib/settings";

function BoardContent() {
  const searchParams = useSearchParams();
  const fullscreen = searchParams.get("fullscreen") === "1";
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFeedUrl(getFeedUrl());
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = document.getElementById("root-loading");
    if (el) el.remove();
  }, []);

  return (
    <>
      <div className={fullscreen ? undefined : "pt-20 pb-12"}>
        <SplitFlapBoard
          fullscreen={fullscreen}
          baseUrl=""
          feedUrl={mounted ? feedUrl : null}
        />
      </div>
      {fullscreen ? (
        <Link
          href="/"
          className="fixed bottom-6 right-6 px-4 py-2 rounded bg-[var(--flipfeed-tile)] text-[var(--flipfeed-muted)] text-sm hover:text-[var(--flipfeed-text)] border border-white/10 z-50"
        >
          Exit fullscreen
        </Link>
      ) : (
        <div className="fixed top-6 left-6 right-6 flex justify-between items-center z-50">
          <Link
            href="/settings"
            className="text-sm text-[var(--flipfeed-muted)] hover:text-[var(--flipfeed-text)]"
          >
            Settings
          </Link>
          <Link
            href="/?fullscreen=1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--flipfeed-muted)] hover:text-[var(--flipfeed-text)]"
          >
            Fullscreen →
          </Link>
        </div>
      )}
    </>
  );
}

export default function BoardPageClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[var(--flipfeed-muted)]">Loading…</p>
        </div>
      }
    >
      <BoardContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { UserConfig } from "@/lib/types";
import { BoardWithWidgets } from "@/components/BoardWithWidgets";

export default function BoardWrapper() {
  const searchParams = useSearchParams();
  const fullscreen = searchParams.get("fullscreen") === "1";
  const [config, setConfig] = useState<UserConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : { widgets: [] }))
      .then((c) => setConfig(c))
      .catch(() => setConfig({ widgets: [] }));
  }, []);

  if (config === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0f",
          color: "#9c9892",
        }}
      >
        Loading board…
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          paddingTop: fullscreen ? 0 : 48,
          paddingBottom: 24,
          minHeight: fullscreen ? "100vh" : undefined,
          boxSizing: "border-box",
        }}
      >
        <BoardWithWidgets config={config} fullscreen={fullscreen} />
      </div>
      {fullscreen ? (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            right: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div style={{ pointerEvents: "auto", display: "flex", gap: 10 }}>
            <Link href="/settings" className="btn-physical">
              Settings
            </Link>
          </div>
          <Link href="/" className="btn-physical" style={{ pointerEvents: "auto" }}>
            Exit fullscreen
          </Link>
        </div>
      ) : (
        <Link
          href="/settings"
          className="btn-physical"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 50,
          }}
        >
          Settings
        </Link>
      )}
    </>
  );
}

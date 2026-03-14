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
      <div style={{ paddingTop: fullscreen ? 0 : 48, paddingBottom: 24 }}>
        <BoardWithWidgets config={config} fullscreen={fullscreen} />
      </div>
      {fullscreen ? (
        <Link
          href="/"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "8px 16px",
            borderRadius: 8,
            background: "#222228",
            color: "#9c9892",
            fontSize: "0.875rem",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 50,
          }}
        >
          Exit fullscreen
        </Link>
      ) : (
        <Link
          href="/settings"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            fontSize: "0.875rem",
            color: "#9c9892",
            textDecoration: "none",
            zIndex: 50,
          }}
        >
          Settings
        </Link>
      )}
    </>
  );
}

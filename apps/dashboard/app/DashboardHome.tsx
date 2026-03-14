"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TrackedApp } from "@/lib/types";

export default function DashboardHome() {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tracked-apps")
      .then((r) => (r.ok ? r.json() : []))
      .then(setApps)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--bg)" }}>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>ET Labs Dashboard</h1>
        <Link
          href="/settings"
          className="text-sm py-2 px-3 rounded-lg border border-white/10 hover:bg-white/5"
          style={{ color: "var(--text)" }}
        >
          My settings / Profile
        </Link>
      </header>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : apps.length === 0 ? (
        <div
          className="rounded-xl p-8 border border-white/10 max-w-md"
          style={{ background: "var(--card)" }}
        >
          <p className="mb-4" style={{ color: "var(--text)" }}>
            No apps tracked yet. Add SleepTight (or any app) in My settings to track downloads.
          </p>
          <Link
            href="/settings"
            className="inline-block py-2 px-4 rounded-lg font-medium bg-[var(--text)] text-[var(--bg)]"
          >
            Add app
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {apps.map((app) => (
            <li
              key={app.id}
              className="rounded-xl p-5 border border-white/10 flex justify-between items-center"
              style={{ background: "var(--card)" }}
            >
              <div>
                <span className="font-medium" style={{ color: "var(--text)" }}>{app.app_name}</span>
                {app.app_store_id && (
                  <span className="text-sm ml-2" style={{ color: "var(--muted)" }}>ID: {app.app_store_id}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                  {app.download_count.toLocaleString()}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--muted)" }}>downloads</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

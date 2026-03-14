"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { TrackedApp } from "@/lib/types";

export default function SettingsClient() {
  const router = useRouter();
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStoreId, setNewStoreId] = useState("");
  const [newDownloads, setNewDownloads] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDownloads, setEditDownloads] = useState<number>(0);

  useEffect(() => {
    fetch("/api/tracked-apps")
      .then((r) => (r.ok ? r.json() : []))
      .then(setApps)
      .finally(() => setLoading(false));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  async function addApp(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tracked-apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_name: newName.trim(),
        app_store_id: newStoreId.trim() || null,
        download_count: newDownloads,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const app = await res.json();
      setApps((prev) => [...prev, app]);
      setNewName("");
      setNewStoreId("");
      setNewDownloads(0);
    }
  }

  async function updateDownloads(id: string, download_count: number) {
    const res = await fetch("/api/tracked-apps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, download_count }),
    });
    if (res.ok) {
      const updated = await res.json();
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
    }
  }

  async function removeApp(id: string) {
    if (!confirm("Remove this app from tracking?")) return;
    const res = await fetch(`/api/tracked-apps?id=${id}`, { method: "DELETE" });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) {
    return <div className="p-6" style={{ color: "var(--muted)" }}>Loading…</div>;
  }

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-sm" style={{ color: "var(--muted)" }}>← Dashboard</Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm"
            style={{ color: "var(--muted)" }}
          >
            Sign out
          </button>
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>My settings / Profile</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
          Add, change, or remove apps you want to track. Update the download count from App Store Connect when you have new numbers.
        </p>

        <form onSubmit={addApp} className="mb-8 p-5 rounded-xl border border-white/10" style={{ background: "var(--card)" }}>
          <h2 className="font-medium mb-4" style={{ color: "var(--text)" }}>Add app</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="App name (e.g. SleepTight)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-[var(--bg)] border-white/10 text-[var(--text)] placeholder-[var(--muted)]"
            />
            <input
              type="text"
              placeholder="App Store ID (optional)"
              value={newStoreId}
              onChange={(e) => setNewStoreId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-[var(--bg)] border-white/10 text-[var(--text)] placeholder-[var(--muted)]"
            />
            <input
              type="number"
              min={0}
              placeholder="Download count"
              value={newDownloads || ""}
              onChange={(e) => setNewDownloads(Number(e.target.value) || 0)}
              className="w-full px-4 py-2 rounded-lg border bg-[var(--bg)] border-white/10 text-[var(--text)]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 py-2 px-4 rounded-lg font-medium bg-[var(--text)] text-[var(--bg)] disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add app"}
          </button>
        </form>

        <h2 className="font-medium mb-4" style={{ color: "var(--text)" }}>Tracked apps</h2>
        <ul className="space-y-3">
          {apps.map((app) => (
            <li
              key={app.id}
              className="p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3"
              style={{ background: "var(--card)" }}
            >
              <div>
                <span className="font-medium" style={{ color: "var(--text)" }}>{app.app_name}</span>
                {app.app_store_id && (
                  <span className="text-sm ml-2" style={{ color: "var(--muted)" }}>{app.app_store_id}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === app.id ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={editDownloads}
                      onChange={(e) => setEditDownloads(Number(e.target.value) || 0)}
                      className="w-28 px-2 py-1 rounded border bg-[var(--bg)] border-white/10 text-[var(--text)]"
                    />
                    <button
                      type="button"
                      onClick={() => updateDownloads(app.id, editDownloads)}
                      className="py-1 px-2 text-sm rounded bg-[var(--text)] text-[var(--bg)]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="py-1 px-2 text-sm"
                      style={{ color: "var(--muted)" }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="tabular-nums" style={{ color: "var(--text)" }}>{app.download_count.toLocaleString()} downloads</span>
                    <button
                      type="button"
                      onClick={() => { setEditingId(app.id); setEditDownloads(app.download_count); }}
                      className="text-sm"
                      style={{ color: "var(--muted)" }}
                    >
                      Change
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeApp(app.id)}
                  className="text-sm text-red-400"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UserConfig, WidgetConfig, WeatherConfig, CustomFeedConfig, EtlabsAppConfig } from "@/lib/types";

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#222228",
  color: "#e8e6e3",
  fontSize: "1rem",
} as const;

export default function SettingsClient() {
  const router = useRouter();
  const [config, setConfig] = useState<UserConfig>({ widgets: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : { widgets: [] }))
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const updateWidgets = (widgets: WidgetConfig[]) => {
    setConfig({ widgets });
  };

  const addWeather = () => {
    updateWidgets([...config.widgets, { type: "weather", location: "" }]);
  };

  const addCustomFeed = () => {
    updateWidgets([...config.widgets, { type: "custom_feed", feedUrl: "" }]);
  };

  const addEtlabsApp = () => {
    updateWidgets([...config.widgets, { type: "etlabs_app", appName: "SleepTight" }]);
  };

  const removeAt = (index: number) => {
    updateWidgets(config.widgets.filter((_, i) => i !== index));
  };

  const updateWidget = (index: number, partial: Partial<WidgetConfig>) => {
    const next = [...config.widgets];
    next[index] = { ...next[index], ...partial } as WidgetConfig;
    updateWidgets(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: config.widgets }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d0f", color: "#9c9892" }}>
        Loading…
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#0d0d0f", color: "#e8e6e3" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link href="/" style={{ color: "#9c9892", fontSize: "0.9rem" }}>
            ← Back to board
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            style={{ background: "none", border: "none", color: "#9c9892", fontSize: "0.9rem", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Settings</h1>
        <p style={{ color: "#9c9892", marginBottom: 24, fontSize: "0.95rem" }}>
          Add widgets. They appear on your board in order.
        </p>

        <form onSubmit={handleSave}>
          {config.widgets.map((w, i) => (
            <div
              key={i}
              style={{
                marginBottom: 16,
                padding: 16,
                background: "#1a1a1e",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {w.type === "etlabs_app" ? (w as EtlabsAppConfig).appName || "ET Labs app" : w.type.replace("_", " ")}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  style={{ background: "none", border: "none", color: "#9c9892", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  Remove
                </button>
              </div>
              {w.type === "weather" && (
                <input
                  type="text"
                  placeholder="City or zip (e.g. New York or 10001)"
                  value={(w as WeatherConfig).location}
                  onChange={(e) => updateWidget(i, { location: e.target.value })}
                  style={inputStyle}
                />
              )}
              {w.type === "custom_feed" && (
                <input
                  type="url"
                  placeholder="Feed or API URL (leave empty for demo)"
                  value={(w as CustomFeedConfig).feedUrl}
                  onChange={(e) => updateWidget(i, { feedUrl: e.target.value })}
                  style={inputStyle}
                />
              )}
              {w.type === "etlabs_app" && (
                <>
                  <input
                    type="text"
                    placeholder="App name (e.g. SleepTight)"
                    value={(w as EtlabsAppConfig).appName}
                    onChange={(e) => updateWidget(i, { appName: e.target.value })}
                    style={inputStyle}
                  />
                  <p style={{ marginTop: 6, fontSize: "0.8rem", color: "var(--flipfeed-muted)" }}>
                    Uses the same account as the ET Labs Dashboard. Add the app there first, then the board shows its download count.
                  </p>
                </>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={addWeather}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#e8e6e3",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              + Weather
            </button>
            <button
              type="button"
              onClick={addCustomFeed}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#e8e6e3",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              + Custom feed
            </button>
            <button
              type="button"
              onClick={addEtlabsApp}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#e8e6e3",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              + SleepTight downloads
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: "#e8e6e3",
              color: "#0d0d0f",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </form>
      </div>
    </main>
  );
}

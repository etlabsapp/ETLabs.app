"use client";

import { useState, useEffect } from "react";
import type { UserConfig, WeatherConfig, CustomFeedConfig, EtlabsAppConfig } from "@/lib/types";
import { SplitFlapBoard } from "./SplitFlapBoard";
import { EtlabsAppRow } from "./EtlabsAppRow";

type Props = { config: UserConfig; fullscreen?: boolean };

function WeatherRow({ location }: { location: string }) {
  const [data, setData] = useState<{ temp: number; conditions: string; location: string } | null>(null);
  useEffect(() => {
    fetch(`/api/weather?location=${encodeURIComponent(location)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ temp: 0, conditions: "—", location }));
  }, [location]);
  if (!data) return <div className="board-row weather-row">…</div>;
  const text = `${(data.location || location).toUpperCase().slice(0, 12).padEnd(12)} ${data.temp}°F ${data.conditions}`;
  return (
    <div
      className="board-row weather-row"
      style={{
        fontFamily: "var(--font-board), monospace",
        fontSize: "clamp(0.75rem, 2vw, 1rem)",
        padding: "8px 12px",
        background: "var(--flipfeed-tile)",
        borderRadius: 4,
        marginBottom: 4,
        color: "var(--flipfeed-text)",
      }}
    >
      {text}
    </div>
  );
}

export function BoardWithWidgets({ config, fullscreen = false }: Props) {
  const widgets = config.widgets ?? [];
  const weatherWidgets = widgets.filter((w): w is WeatherConfig => w.type === "weather");
  const etlabsAppWidgets = widgets.filter((w): w is EtlabsAppConfig => w.type === "etlabs_app");
  const feedWidgets = widgets.filter((w): w is CustomFeedConfig => w.type === "custom_feed");
  const feedUrl = feedWidgets[0]?.feedUrl?.trim() || null;
  const hasFeed = feedWidgets.length > 0;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        padding: fullscreen ? 24 : 0,
      }}
    >
      <div
        style={{
          background: "var(--flipfeed-board)",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {etlabsAppWidgets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {etlabsAppWidgets.map((w, i) => (
              <EtlabsAppRow key={i} appName={w.appName} />
            ))}
          </div>
        )}
        {weatherWidgets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {weatherWidgets.map((w, i) => (
              <WeatherRow key={i} location={w.location} />
            ))}
          </div>
        )}
        {hasFeed ? (
          <SplitFlapBoard fullscreen={false} baseUrl="" feedUrl={feedUrl || null} />
        ) : widgets.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: "var(--flipfeed-muted)",
              fontSize: "0.95rem",
            }}
          >
            No widgets yet. Open <a href="/settings" style={{ color: "var(--flipfeed-text)" }}>Settings</a> to add SleepTight downloads, weather, a feed, and more.
          </div>
        ) : null}
      </div>
    </div>
  );
}

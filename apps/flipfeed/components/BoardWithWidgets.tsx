"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { UserConfig, WeatherConfig, CustomFeedConfig, EtlabsAppConfig } from "@/lib/types";
import { SplitFlapBoard } from "./SplitFlapBoard";
import { EtlabsAppRow } from "./EtlabsAppRow";

const MAX_SCALE = 1.2; // don't scale up past this so it doesn't look blown up

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

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [triggerFlip, setTriggerFlip] = useState(0);

  const updateScale = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const contentW = content.scrollWidth;
    const contentH = content.scrollHeight;
    if (contentW <= 0 || contentH <= 0) return;
    const s = Math.min(cw / contentW, ch / contentH, MAX_SCALE);
    setScale(s);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    updateScale();
    const onResize = () => updateScale();
    const roContainer = new ResizeObserver(onResize);
    const roContent = new ResizeObserver(onResize);
    roContainer.observe(container);
    roContent.observe(content);
    return () => {
      roContainer.disconnect();
      roContent.disconnect();
    };
  }, [updateScale, widgets.length, hasFeed, etlabsAppWidgets.length, weatherWidgets.length]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: fullscreen ? "none" : 900,
        margin: "0 auto",
        padding: fullscreen ? 24 : 0,
        minHeight: fullscreen ? "100vh" : "calc(100vh - 72px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        ref={contentRef}
        style={{
          background: "var(--flipfeed-board)",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {(etlabsAppWidgets.length > 0 || hasFeed) && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setTriggerFlip(Date.now())}
              style={{
                padding: "6px 14px",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-board), monospace",
                color: "var(--flipfeed-muted)",
                background: "var(--flipfeed-tile)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--flipfeed-text)";
                e.currentTarget.style.background = "#2a2a30";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "var(--flipfeed-muted)";
                e.currentTarget.style.background = "var(--flipfeed-tile)";
              }}
            >
              Update
            </button>
          </div>
        )}
        {etlabsAppWidgets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {etlabsAppWidgets.map((w, i) => (
              <EtlabsAppRow key={i} appName={w.appName} triggerFlip={triggerFlip} />
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
          <SplitFlapBoard fullscreen={false} baseUrl="" feedUrl={feedUrl || null} triggerFlip={triggerFlip} />
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchFeed } from "@/lib/feed";
import { normalizeRow, rowToDisplayString, type FeedRow } from "@/lib/normalize";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { SplitFlapRow } from "./SplitFlapRow";
import { BoardHeader } from "./BoardHeader";

type Props = {
  fullscreen?: boolean;
  baseUrl?: string;
  /** Custom feed/API URL from settings. When set, board fetches from this URL instead of /api/feed */
  feedUrl?: string | null;
  /** When this value changes, every row does one flip animation (and sound) on all cells */
  triggerFlip?: number;
};

export function SplitFlapBoard({ fullscreen = false, baseUrl = "", feedUrl = null, triggerFlip }: Props) {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const raw = await fetchFeed(baseUrl, feedUrl);
      const normalized = raw.map(normalizeRow);
      setRows(normalized);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, feedUrl]);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadFeed]);

  const cellSize = fullscreen ? "lg" : "md";

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--flipfeed-muted)]">Loading board…</p>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 bg-[var(--flipfeed-bg)] flex flex-col items-center justify-center p-8"
          : "w-full max-w-4xl mx-auto"
      }
    >
      <div
        className="rounded-lg p-6 flex flex-col gap-4"
        style={{
          background: "var(--flipfeed-board)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <BoardHeader cellSize={cellSize} />
        <div className="flex flex-col gap-[var(--flipfeed-gap)]">
          {rows.map((row, i) => (
            <SplitFlapRow
              key={i}
              displayString={rowToDisplayString(row)}
              cellSize={cellSize}
              triggerFlip={triggerFlip}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

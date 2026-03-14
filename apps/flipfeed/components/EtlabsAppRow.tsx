"use client";

import { useState, useEffect } from "react";
import { SplitFlapRow } from "./SplitFlapRow";
import { isValidChar } from "@/lib/constants";

const DOWNLOAD_ROW_LENGTH = 32;

function formatDownloadRow(appName: string, downloadCount: number): string {
  const name = appName.toUpperCase().replace(/[^A-Z0-9 -]/g, " ").slice(0, 14).padEnd(14, " ");
  const count = String(downloadCount).slice(-6).padStart(6, " ");
  const row = `${name} ${count} DOWNLOADS`;
  return row.padEnd(DOWNLOAD_ROW_LENGTH, " ").slice(0, DOWNLOAD_ROW_LENGTH).split("").map((c) => (isValidChar(c) ? c : " ")).join("");
}

type Props = { appName: string; cellSize?: "sm" | "md" | "lg" };

export function EtlabsAppRow({ appName, cellSize = "md" }: Props) {
  const [displayString, setDisplayString] = useState(formatDownloadRow(appName, 0));

  useEffect(() => {
    let cancelled = false;
    function fetchApps() {
      fetch("/api/etlabs-apps")
        .then((r) => (r.ok ? r.json() : []))
        .then((apps: { app_name: string; download_count: number }[]) => {
          if (cancelled) return;
          const app = apps.find((a) => a.app_name.toUpperCase() === appName.toUpperCase());
          const count = app?.download_count ?? 0;
          setDisplayString(formatDownloadRow(appName, count));
        })
        .catch(() => setDisplayString(formatDownloadRow(appName, 0)));
    }
    fetchApps();
    const interval = setInterval(fetchApps, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [appName]);

  return <SplitFlapRow displayString={displayString} cellSize={cellSize} />;
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import { STORAGE_KEY } from "@/lib/logoIntro/constants";
import { runLogoIntro } from "@/lib/logoIntro/runLogoIntro";

function stripReplayIntroQueryFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("replayIntro") !== "1" && u.searchParams.get("logoIntro") !== "1") return;
    u.searchParams.delete("replayIntro");
    u.searchParams.delete("logoIntro");
    const qs = u.searchParams.toString();
    history.replaceState(null, "", u.pathname + (qs ? `?${qs}` : "") + u.hash);
  } catch {
    /* ignore */
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

type Props = {
  onComplete: (detail: { skipped: boolean; error?: boolean }) => void;
};

export default function LogoIntro({ onComplete }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labsRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleComplete = useCallback(
    (detail: { skipped: boolean; error?: boolean }) => {
      onComplete(detail);
    },
    [onComplete]
  );

  useEffect(() => {
    stripReplayIntroQueryFromUrl();

    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const labsRoot = labsRef.current;
    const skipBtn = skipRef.current;
    if (!overlay || !canvas) {
      markIntroSeen();
      handleComplete({ skipped: true, error: true });
      return;
    }

    const labsLetters = labsRoot
      ? Array.from(labsRoot.querySelectorAll<HTMLElement>(".logo-intro-labs-char"))
      : [];

    cancelRef.current = runLogoIntro({
      canvas,
      overlay,
      labsRoot,
      labsLetters,
      skipBtn,
      markIntroSeen,
      onFinish: handleComplete,
    });

    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [handleComplete]);

  return (
    <div ref={overlayRef} id="logo-intro-overlay" className="logo-intro-overlay" aria-hidden="true">
      <button type="button" ref={skipRef} id="logo-intro-skip" className="logo-intro-skip" aria-label="Skip intro">
        Skip Intro
      </button>
      <canvas ref={canvasRef} id="logo-canvas" />
      <div ref={labsRef} id="logo-intro-labs" className="logo-intro-labs" aria-hidden="true">
        <span className="logo-intro-labs-char">L</span>
        <span className="logo-intro-labs-char">a</span>
        <span className="logo-intro-labs-char">b</span>
        <span className="logo-intro-labs-char">s</span>
      </div>
    </div>
  );
}

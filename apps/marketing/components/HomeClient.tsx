"use client";

import { useState, useLayoutEffect, useCallback, useEffect } from "react";
import LogoIntro from "@/components/LogoIntro";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HomeMain from "@/components/HomeMain";
import { STORAGE_KEY } from "@/lib/logoIntro/constants";
import { useReveal } from "@/hooks/useReveal";

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

export default function HomeClient() {
  const [mode, setMode] = useState<"checking" | "intro" | "main">("checking");

  useLayoutEffect(() => {
    const u = new URL(window.location.href);
    const replay =
      u.searchParams.get("replayIntro") === "1" || u.searchParams.get("logoIntro") === "1";
    if (replay) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    stripReplayIntroQueryFromUrl();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }

    if (reduced) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setMode("main");
      return;
    }
    if (seen) {
      setMode("main");
      return;
    }
    setMode("intro");
  }, []);

  useEffect(() => {
    if (mode === "intro") {
      document.documentElement.classList.add("intro-pending");
      document.documentElement.classList.remove("intro-complete");
    } else if (mode === "main") {
      document.documentElement.classList.remove("intro-pending");
      document.documentElement.classList.add("intro-complete");
    }
  }, [mode]);

  const onIntroComplete = useCallback(() => {
    setMode("main");
  }, []);

  useReveal(mode === "main");

  if (mode === "checking") {
    return <div className="introChecking" aria-hidden="true" />;
  }

  return (
    <>
      {mode === "intro" && <LogoIntro onComplete={onIntroComplete} />}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />
      <SiteHeader />
      <HomeMain />
      <SiteFooter />
    </>
  );
}

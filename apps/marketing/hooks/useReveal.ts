"use client";

import { useEffect } from "react";

/**
 * Scroll reveals for `.reveal` elements (matches static site script.js behavior).
 */
export function useReveal(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const reveals = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !reveals.length) {
      reveals.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    reveals.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [active]);
}

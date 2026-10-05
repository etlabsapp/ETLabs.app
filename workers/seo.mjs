/**
 * Pure SEO helpers for workers/router.js (unit-tested by workers/seo.test.mjs).
 * - canonicalHostRedirect: http -> https and www -> apex as one 301 (zone settings are not available to us).
 * - legacyRedirect: stale or orphaned pages -> their current home (301).
 * - permanentRedirect: Workers static assets answer html_handling redirects (/x.html -> /x, /x/ -> /x) with 307;
 *   these are permanent moves, so they are re-issued as 301.
 * - wantsNoindex: preview deployments (workers.dev or SEO_NOINDEX=1) send X-Robots-Tag: noindex.
 */

export const CANONICAL_ORIGIN = "https://etlabs.app";
const CANONICAL_HOST = "etlabs.app";
const ALIAS_HOSTS = new Set(["www.etlabs.app"]);

/* Returns the 301 target URL string, or null when the request is already on https://etlabs.app (or another host, e.g. workers.dev/localhost). */
export function canonicalHostRedirect(urlString) {
  const url = new URL(urlString);
  const host = url.hostname.toLowerCase();
  const isAlias = ALIAS_HOSTS.has(host);
  if (!isAlias && host !== CANONICAL_HOST) return null;
  if (!isAlias && url.protocol === "https:" && (url.port === "" || url.port === "443")) return null;
  return CANONICAL_ORIGIN + url.pathname + url.search;
}

/* Stale pages that should not be indexed on their own (audit 2026-10-04). Keys are paths without a trailing ".html". */
export const LEGACY_REDIRECTS = {
  "/apps/sleeptight/about": "/apps/sleeptight/",
  "/apps/sleeptight/sleeptight": "/apps/sleeptight/",
  "/apps/sleeptight/products": "/products",
  "/apps/sleeptight/contact": "/contact",
  "/privacy": "/apps/sleeptight/privacy",
  "/apps/flipfeed": "/",
  "/apps/flipfeed/index": "/",
};

export function legacyRedirect(pathname) {
  let p = pathname.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  p = p.replace(/\.html$/i, "");
  return Object.prototype.hasOwnProperty.call(LEGACY_REDIRECTS, p) ? LEGACY_REDIRECTS[p] : null;
}

/* 307 from the asset layer -> 301 with the same Location; anything else unchanged (returns null). */
export function permanentRedirect(status, location) {
  if (status !== 307 || !location) return null;
  return { status: 301, location };
}

export function wantsNoindex(hostname, env) {
  if (env && String(env.SEO_NOINDEX || "") === "1") return true;
  return /\.workers\.dev$/i.test(String(hostname || ""));
}

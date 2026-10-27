/**
 * ETLabs MyHQ at /myhq/ (and /myhq/setup-guide/).
 *
 * The dashboard files live in apps/myhq/public (hq-template public/, sw v0.3.0-combined-5)
 * and are fetched through the ASSETS binding so this Worker, not a second host, serves them.
 * HTML uses <base href="/myhq/">. The manifest id/start_url/scope and the service worker
 * registration scope are /myhq/. Canonical URL is https://etlabs.app/myhq/.
 *
 * Cloudflare Web Analytics must not run here. Every response includes Cache-Control
 * "public" and "no-transform" so the edge does not inject beacon.min.js
 * (https://developers.cloudflare.com/analytics/web-analytics/getting-started/), an enforcing
 * CSP that does not allow static.cloudflareinsights.com or cloudflareinsights.com, and any
 * beacon tag already in the HTML is removed. Marketing pages are unchanged and may keep
 * site analytics. /cdn-cgi/rum is a same-origin beacon endpoint; blocking the script is
 * what stops those calls, because the zone still handles /cdn-cgi/ before the Worker.
 */

export const MYHQ_ASSET_ROOT = "/apps/myhq/public";

/** Enforcing CSP for the on-device app. No analytics hosts. base-uri 'self' allows <base href="/myhq/">. */
export const MYHQ_CSP = [
  "default-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "frame-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export function normalizePath(pathname) {
  let p = String(pathname || "");
  try { p = decodeURIComponent(p); } catch { return null; }
  if (p.includes("\0")) return null;
  p = p.replace(/\/{2,}/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

function withSearch(path, search) {
  const q = !search ? "" : search.startsWith("?") ? search : "?" + search;
  return path + q;
}

/** 301 target for slash, index.html, and the internal asset prefix. Null when the URL should be served. */
export function myhqRedirectTarget(pathname, search = "") {
  const p = normalizePath(pathname);
  if (p == null) return null;
  if (p.split("/").includes("..")) return null;
  if (p === "/myhq" || p === "/myhq.html" || p === "/myhq/index.html") return withSearch("/myhq/", search);
  if (p === "/apps/myhq" || p === "/apps/myhq/" || p === MYHQ_ASSET_ROOT || p === MYHQ_ASSET_ROOT + "/" || p === MYHQ_ASSET_ROOT + "/index.html") {
    return withSearch("/myhq/", search);
  }
  if (p.startsWith(MYHQ_ASSET_ROOT + "/")) {
    const publicPath = "/myhq/" + p.slice(MYHQ_ASSET_ROOT.length + 1);
    return myhqRedirectTarget(publicPath, search) || withSearch(publicPath, search);
  }
  if (!p.startsWith("/myhq/")) return null;
  const rest = p.slice("/myhq/".length);
  if (!rest) return null;
  if (rest.endsWith("/index.html")) return withSearch("/myhq/" + rest.slice(0, -"index.html".length), search);
  const last = rest.split("/").pop();
  if (rest && !rest.endsWith("/") && last && !last.includes(".")) return withSearch("/myhq/" + rest + "/", search);
  return null;
}

/** Asset-binding path for a /myhq/ URL that is not a redirect. Null when this is not the app. */
export function myhqAssetPath(pathname) {
  const p = normalizePath(pathname);
  if (p == null || p.split("/").includes("..")) return null;
  if (p !== "/myhq/" && !p.startsWith("/myhq/")) return null;
  if (myhqRedirectTarget(p, "")) return null;
  let rest = p.slice("/myhq/".length);
  if (rest === "" || rest.endsWith("/")) rest += "index.html";
  if (rest.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  return MYHQ_ASSET_ROOT + "/" + rest;
}

export function isMyhqPath(pathname) {
  const p = normalizePath(pathname);
  if (p == null) return false;
  if (p === "/myhq" || p === "/myhq.html" || p.startsWith("/myhq/")) return true;
  if (p === "/apps/myhq" || p.startsWith("/apps/myhq/")) return true;
  return false;
}

export function stripAnalyticsBeacon(html) {
  return String(html)
    .replace(/<script\b[^>]*(?:beacon\.min\.js|cloudflareinsights\.com|\/cdn-cgi\/rum|data-cf-beacon)[^>]*>\s*<\/script>/gi, "")
    .replace(/<script\b[^>]*data-cf-beacon[^>]*>[\s\S]*?<\/script>/gi, "");
}

/** Cache-Control that keeps Cloudflare from rewriting the body to inject the beacon. */
export function myhqCacheControl(existing) {
  const base = "public, no-transform";
  const extra = String(existing || "").split(",").map((s) => s.trim()).filter(Boolean)
    .filter((s) => !/^public$/i.test(s) && !/^no-transform$/i.test(s) && !/^private$/i.test(s));
  return extra.length ? base + ", " + extra.join(", ") : base;
}

export function applyMyhqHeaders(headers, contentType) {
  const h = new Headers(headers);
  h.set("cache-control", myhqCacheControl(h.get("cache-control")));
  h.set("content-security-policy", MYHQ_CSP);
  h.set("content-security-policy-report-only", MYHQ_CSP);
  h.set("referrer-policy", "no-referrer");
  h.set("x-content-type-options", "nosniff");
  if (contentType) h.set("content-type", contentType);
  return h;
}

async function fetchAsset(request, env, assetPath) {
  const url = new URL(request.url);
  url.pathname = assetPath;
  url.search = "";
  let current = url.toString();
  let res = await env.ASSETS.fetch(new Request(current, { method: request.method, headers: request.headers }));
  for (let hop = 0; hop < 3 && res.status >= 300 && res.status < 400; hop++) {
    const loc = res.headers.get("location");
    if (!loc) break;
    const next = new URL(loc, current);
    if (next.origin !== url.origin || !next.pathname.startsWith(MYHQ_ASSET_ROOT)) break;
    current = next.toString();
    res = await env.ASSETS.fetch(new Request(current, { method: request.method, headers: request.headers }));
  }
  return res;
}

export async function prepareMyhqResponse(response) {
  const ct = response.headers.get("content-type") || "";
  const headers = applyMyhqHeaders(response.headers);
  if (!ct.includes("text/html") || response.body == null) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  const html = stripAnalyticsBeacon(await response.text());
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

/** Response for a MyHQ URL, or null when the path belongs to the rest of the site. */
export async function handleMyhq(request, env, url) {
  if (!isMyhqPath(url.pathname)) return null;
  const target = myhqRedirectTarget(url.pathname, url.search);
  if (target) {
    return new Response(null, {
      status: 301,
      headers: { location: target, "cache-control": "public, max-age=3600, no-transform" },
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: applyMyhqHeaders({ "content-type": "text/plain; charset=utf-8", allow: "GET, HEAD" }),
    });
  }
  const assetPath = myhqAssetPath(url.pathname);
  if (!assetPath) {
    return new Response("Not found", { status: 404, headers: applyMyhqHeaders({ "content-type": "text/plain; charset=utf-8" }) });
  }
  const res = await fetchAsset(request, env, assetPath);
  return prepareMyhqResponse(res);
}

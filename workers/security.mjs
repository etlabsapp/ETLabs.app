/**
 * Pure security helpers for workers/router.js (unit-tested by workers/security.test.mjs).
 */

/* Rate-limit key for an address: IPv4 per address, IPv6 per /64 (one subscriber/network gets a whole /64). */
export function rateKeyForIp(ip) {
  ip = String(ip || "").trim();
  if (!ip.includes(":")) return ip || "unknown";
  const v4tail = /:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);      // ::ffff:1.2.3.4 -> treat as IPv4
  if (v4tail && /^(::ffff:|0:0:0:0:0:ffff:)/i.test(ip)) return v4tail[1];
  let [head, tail] = ip.toLowerCase().split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : null;
  const groups = t === null ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  return groups.slice(0, 4).map(g => (parseInt(g, 16) || 0).toString(16)).join(":") + "::/64";
}

/* Repo plumbing that must never be served, even if it slips into the asset upload (.assetsignore is the primary control). */
export const BLOCKED_PATH = /^\/(?:\.git|\.github|\.claude|\.wrangler|\.env|\.dev\.vars|\.gitignore|\.assetsignore|node_modules|docs|migrations|supabase|workers|tools|scripts|wrangler\.(?:jsonc?|toml)|package(?:-lock)?\.json|apps\/(?:dashboard|marketing|sleeptight-desktop)|apps\/totalcross\/worker)(?:[\/.]|$)|\.(?:md|pem|p8|key)$|\/\.env/i;

export function isBlockedPath(pathname) {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* keep raw */ }
  return BLOCKED_PATH.test(p.replace(/\/{2,}/g, "/"));
}


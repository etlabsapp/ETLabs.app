/**
 * Total Cross themes API — honors ?date=YYYY-MM-DD (player local calendar date).
 * Matches live game.js: LAUNCH_DATE 2026-05-08, device-local day index.
 */
import catalog from "../apps/totalcross/api/themes-catalog.json";

const LAUNCH = catalog.launchDate; // YYYY-MM-DD
const THEMES = catalog.themes;

function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, mo, d, utc: dt };
}

function daysBetweenUtc(a, b) {
  return Math.floor((b.utc - a.utc) / 86400000);
}

function utcTodayYmd() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}

function themesForDate(dateStr) {
  const launch = parseYmd(LAUNCH);
  const target = parseYmd(dateStr);
  if (!launch || !target) return null;
  const puzzleNumber = Math.max(1, daysBetweenUtc(launch, target) + 1);
  const theme = THEMES[(puzzleNumber - 1) % THEMES.length];
  return {
    schemaVersion: 1,
    date: dateStr,
    puzzleNumber,
    acrossTheme: theme.acrossTheme,
    downTheme: theme.downTheme,
    playUrl: "https://etlabs.app/totalcross/",
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "access-control-allow-origin": "*",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/apps/totalcross/api/themes.json") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "Content-Type",
          },
        });
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return jsonResponse({ error: "method_not_allowed" }, 405);
      }
      const dateParam = url.searchParams.get("date") || utcTodayYmd();
      const payload = themesForDate(dateParam);
      if (!payload) {
        return jsonResponse({ error: "invalid_date", hint: "Use YYYY-MM-DD" }, 400);
      }
      if (request.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300, stale-while-revalidate=3600",
            "access-control-allow-origin": "*",
          },
        });
      }
      return jsonResponse(payload);
    }

    // Static site
    return env.ASSETS.fetch(request);
  },
};

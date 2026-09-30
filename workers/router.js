/**
 * Total Cross themes API — honors ?date=YYYY-MM-DD (player local calendar date).
 * Matches live game.js: LAUNCH_DATE 2026-05-08, device-local day index.
 */
import catalog from "../apps/totalcross/api/themes-catalog.json";
import { cleanNick } from "./study-nick.mjs";

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


/* =====================================================================
 * Study leaderboard API  (/study/api/*)
 *   POST /study/api/round        {day, mode}                 -> {nonce, day, mode, questions, expiresInSec}
 *   POST /study/api/score        {nonce, day, mode, nick, score} -> {ok, rank, entry}
 *   GET  /study/api/leaderboard?day=1&mode=terms[&limit=10]  -> {day, mode, questions, entries[]}
 *   GET  /study/api/leaderboard?day=1                        -> {day, modes:{terms:[],scen:[],mixed:[]}}
 * Storage: D1 binding STUDY_DB. No PII: nickname only; IPs are never stored, only
 * SHA-256(daily random salt + IP) kept <= 10 minutes for rate limiting; salts rotate daily.
 * Add future decks by adding a key to STUDY_DECKS ("2", "all", ...).
 * Nicks starting with TEST_ (any case) are accepted and stored but hidden from boards and ranks.
 * ===================================================================== */
const STUDY_DECKS = {
  // questions = full-round length per mode; minSec = minimum plausible seconds for a full round
  "1": {
    terms: { questions: 28, minSec: 28 },   // 28 term cards   x 1.0s
    scen:  { questions: 28, minSec: 56 },   // 28 scenarios    x 2.0s
    mixed: { questions: 24, minSec: 36 },   // 12 terms x 1.0s + 12 scenarios x 2.0s
  },
  "2": {
    terms: { questions: 43, minSec: 43 },   // 43 term cards   x 1.0s
    scen:  { questions: 28, minSec: 56 },   // 28 scenarios    x 2.0s
    mixed: { questions: 24, minSec: 36 },   // 12 terms x 1.0s + 12 scenarios x 2.0s
  },
  "all": {                                  // Day 1 + Day 2 combined
    terms: { questions: 71, minSec: 71 },   // 28 + 43 term cards  x 1.0s
    scen:  { questions: 56, minSec: 112 },  // 28 + 28 scenarios   x 2.0s
    mixed: { questions: 24, minSec: 36 },   // still 12 terms + 12 scenarios (MIXED_EACH = 12)
  },
};
const STUDY_MODES = ["terms", "scen", "mixed"];
const ROUND_TTL_MS = 2 * 60 * 60 * 1000;     // nonce valid for 2h
const SCORE_LIMIT = 30, SCORE_WINDOW_MS = 10 * 60 * 1000;  // 30 score posts / 10 min / client (class shares one Wi-Fi IP)
const ROUND_LIMIT = 240;                      // 240 round starts / 10 min / client
const MAX_BODY = 1024;

let studySchemaReady = false;

function studyJson(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra },
  });
}
const studyErr = (error, status = 400, extra = {}) => studyJson({ ok: false, error, ...extra }, status);

function deckFor(day, mode) {
  const d = typeof day === "string" || typeof day === "number" ? STUDY_DECKS[String(day)] : null;
  if (!d) return null;
  if (!STUDY_MODES.includes(mode) || !d[mode]) return null;
  return d[mode];
}

async function ensureStudySchema(db) {
  if (studySchemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS study_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, mode TEXT NOT NULL,
      nick TEXT NOT NULL, score INTEGER NOT NULL, questions INTEGER NOT NULL, duration_ms INTEGER NOT NULL, created_at INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS study_scores_board ON study_scores (day, mode, score DESC, duration_ms ASC)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS study_rounds (nonce TEXT PRIMARY KEY, day TEXT NOT NULL, mode TEXT NOT NULL, issued_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS study_rate (bucket TEXT NOT NULL, kind TEXT NOT NULL, ts INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS study_rate_idx ON study_rate (bucket, kind, ts)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS study_salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL)`),
  ]);
  studySchemaReady = true;
}

async function clientBucket(db, request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  let row = await db.prepare("SELECT salt FROM study_salts WHERE day = ?").bind(today).first();
  if (!row) {
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    const salt = [...rnd].map(b => b.toString(16).padStart(2, "0")).join("");
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO study_salts (day, salt) VALUES (?, ?)").bind(today, salt),
      db.prepare("DELETE FROM study_salts WHERE day <> ?").bind(today),
    ]);
    row = await db.prepare("SELECT salt FROM study_salts WHERE day = ?").bind(today).first();
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(row.salt + "|" + ip));
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* counts this attempt; returns true if over the limit */
async function rateLimited(db, bucket, kind, limit) {
  const now = Date.now(), since = now - SCORE_WINDOW_MS;
  const res = await db.batch([
    db.prepare("DELETE FROM study_rate WHERE ts < ?").bind(since),
    db.prepare("SELECT COUNT(*) AS n FROM study_rate WHERE bucket = ? AND kind = ? AND ts >= ?").bind(bucket, kind, since),
  ]);
  const n = res[1].results[0].n;
  if (n >= limit) return true;
  await db.prepare("INSERT INTO study_rate (bucket, kind, ts) VALUES (?, ?, ?)").bind(bucket, kind, now).run();
  return false;
}

async function readJsonBody(request) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BODY) return { error: "payload_too_large" };
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: "payload_too_large" };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "bad_json" };
    return { body };
  } catch {
    return { error: "bad_json" };
  }
}

async function topScores(db, day, mode, limit) {
  const { results } = await db.prepare(
    `SELECT nick, score, questions, duration_ms, created_at FROM (
       SELECT nick, score, questions, duration_ms, created_at,
              ROW_NUMBER() OVER (PARTITION BY lower(nick) ORDER BY score DESC, duration_ms ASC, created_at ASC) AS rn
       FROM study_scores WHERE day = ? AND mode = ? AND nick NOT LIKE 'TEST!_%' ESCAPE '!')
     WHERE rn = 1 ORDER BY score DESC, duration_ms ASC, created_at ASC LIMIT ?`
  ).bind(day, mode, limit).all();
  return results.map((r, i) => ({
    rank: i + 1, nick: r.nick, score: r.score, questions: r.questions,
    durationSec: Math.round(r.duration_ms / 1000), date: new Date(r.created_at).toISOString().slice(0, 10),
  }));
}

async function handleStudyApi(request, env, url) {
  const db = env.STUDY_DB;
  const path = url.pathname.replace(/\/+$/, "");
  const known = ["/study/api/leaderboard", "/study/api/round", "/study/api/score"];
  if (!known.includes(path)) return studyErr("not_found", 404);
  if (!db) return studyErr("storage_unavailable", 503);
  try {
    await ensureStudySchema(db);

    if (path === "/study/api/leaderboard") {
      if (request.method !== "GET" && request.method !== "HEAD") return studyErr("method_not_allowed", 405);
      const day = url.searchParams.get("day") || "1";
      const mode = url.searchParams.get("mode");
      const limit = Math.min(25, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10));
      if (!STUDY_DECKS[day]) return studyErr("bad_day");
      const cache = {};   // no-store (default) so a fresh submit shows up immediately
      if (!mode) {
        const modes = {};
        for (const m of STUDY_MODES) if (STUDY_DECKS[day][m]) modes[m] = await topScores(db, day, m, limit);
        return studyJson({ ok: true, day, modes }, 200, cache);
      }
      const deck = deckFor(day, mode);
      if (!deck) return studyErr("bad_mode");
      return studyJson({ ok: true, day, mode, questions: deck.questions, entries: await topScores(db, day, mode, limit) }, 200, cache);
    }

    if (request.method !== "POST") return studyErr("method_not_allowed", 405);
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return studyErr("json_required", 415);
    const { body, error } = await readJsonBody(request);
    if (error) return studyErr(error, error === "payload_too_large" ? 413 : 400);
    const day = String(body.day ?? "");
    const mode = body.mode;
    const deck = deckFor(day, mode);
    if (!deck) return studyErr("bad_day_or_mode");
    const bucket = await clientBucket(db, request);
    const now = Date.now();

    if (path === "/study/api/round") {
      if (await rateLimited(db, bucket, "round", ROUND_LIMIT)) return studyErr("rate_limited", 429, { retryAfterSec: 600 });
      const nonce = crypto.randomUUID();
      await db.batch([
        db.prepare("DELETE FROM study_rounds WHERE issued_at < ?").bind(now - ROUND_TTL_MS),
        db.prepare("INSERT INTO study_rounds (nonce, day, mode, issued_at) VALUES (?, ?, ?, ?)").bind(nonce, day, mode, now),
      ]);
      return studyJson({ ok: true, nonce, day, mode, questions: deck.questions, expiresInSec: ROUND_TTL_MS / 1000 });
    }

    // POST /study/api/score
    if (await rateLimited(db, bucket, "score", SCORE_LIMIT)) return studyErr("rate_limited", 429, { retryAfterSec: 600 });
    const n = cleanNick(body.nick);
    if (n.error) return studyErr(n.error);
    const score = body.score;
    if (!Number.isInteger(score) || score < 0 || score > deck.questions) return studyErr("bad_score");
    if (typeof body.nonce !== "string" || !/^[0-9a-f-]{36}$/.test(body.nonce)) return studyErr("bad_nonce");
    const round = await db.prepare("SELECT day, mode, issued_at, used FROM study_rounds WHERE nonce = ?").bind(body.nonce).first();
    if (!round || round.day !== day || round.mode !== mode) return studyErr("bad_nonce");
    if (round.used) return studyErr("nonce_used", 409);
    const duration = now - round.issued_at;
    if (duration > ROUND_TTL_MS) return studyErr("round_expired");
    if (duration < deck.minSec * 1000) return studyErr("too_fast");
    const claim = await db.prepare("UPDATE study_rounds SET used = 1 WHERE nonce = ? AND used = 0").bind(body.nonce).run();
    if (!claim.meta || claim.meta.changes !== 1) return studyErr("nonce_used", 409);
    await db.prepare("INSERT INTO study_scores (day, mode, nick, score, questions, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(day, mode, n.nick, score, deck.questions, duration, now).run();
    const better = await db.prepare(
      `SELECT COUNT(*) AS n FROM (SELECT lower(nick) AS k, MAX(score) AS s FROM study_scores WHERE day = ? AND mode = ? AND nick NOT LIKE 'TEST!_%' ESCAPE '!' GROUP BY k) WHERE s > ?`
    ).bind(day, mode, score).first();
    // TEST_ nicks are stored (so submits can be verified) but never shown or counted in ranks
    return studyJson({ ok: true, hidden: !!n.test, rank: (better ? better.n : 0) + 1,
      entry: { nick: n.nick, score, questions: deck.questions, durationSec: Math.round(duration / 1000) } });
  } catch (e) {
    console.error("study api error", e && e.message);
    return studyErr("server_error", 500);
  }
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

    if (url.pathname === "/study/api" || url.pathname.startsWith("/study/api/")) {
      return handleStudyApi(request, env, url);
    }

    // Old per-day quiz URLs (shared in Discord) -> the single /study/ picker, keeping any extra params (e.g. mode)
    const studyDay = /^\/study\/(day1|day2|all)\/?$/.exec(url.pathname);
    if (studyDay) {
      const params = new URLSearchParams({ day: studyDay[1] });
      url.searchParams.forEach((v, k) => { if (k !== "day") params.append(k, v); });
      return new Response(null, { status: 302, headers: { location: "/study/?" + params.toString(), "cache-control": "no-store" } });
    }

    // Static site
    return env.ASSETS.fetch(request);
  },
};

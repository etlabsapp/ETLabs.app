-- Study leaderboard schema (D1 binding STUDY_DB, database "etlabs-study").
-- workers/router.js also creates these lazily with CREATE ... IF NOT EXISTS,
-- so applying this migration is optional. No PII is stored: nickname only.
CREATE TABLE IF NOT EXISTS study_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,            -- "1", later "2", "all"
  mode TEXT NOT NULL,           -- "terms" | "scen" | "mixed"
  nick TEXT NOT NULL,           -- 2-16 chars, allowlisted, profanity-filtered
  score INTEGER NOT NULL,       -- correct answers, 0..questions
  questions INTEGER NOT NULL,   -- full-round length for that day/mode
  duration_ms INTEGER NOT NULL, -- server-measured (round nonce issue -> score submit)
  created_at INTEGER NOT NULL   -- epoch ms
);
CREATE INDEX IF NOT EXISTS study_scores_board ON study_scores (day, mode, score DESC, duration_ms ASC);

-- single-use per-round nonces, pruned after 2h
CREATE TABLE IF NOT EXISTS study_rounds (
  nonce TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  mode TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

-- transient rate-limit log: bucket = SHA-256(daily random salt | IP), rows pruned after 10 min
CREATE TABLE IF NOT EXISTS study_rate (
  bucket TEXT NOT NULL,
  kind TEXT NOT NULL,           -- "round" | "score"
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS study_rate_idx ON study_rate (bucket, kind, ts);

-- one random salt per UTC day; older salts are deleted when a new day starts
CREATE TABLE IF NOT EXISTS study_salts (
  day TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);

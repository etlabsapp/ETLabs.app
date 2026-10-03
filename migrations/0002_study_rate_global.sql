-- Site-wide rate cap lookups (COUNT by kind over the 10-minute window).
-- workers/router.js also creates this lazily with CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS study_rate_kind_idx ON study_rate (kind, ts);

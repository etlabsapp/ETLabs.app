CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_id   INTEGER NOT NULL,
  difficulty  TEXT    NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
  username    TEXT    NOT NULL,
  time_sec    INTEGER NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_puzzle ON scores(puzzle_id, difficulty, time_sec);

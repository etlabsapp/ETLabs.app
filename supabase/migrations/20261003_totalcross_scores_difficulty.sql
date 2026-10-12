-- Total Cross: save difficulty with each leaderboard score.
-- Target: the Supabase (Postgres) project used by apps/totalcross/game.js (public.scores).
-- Status: LOCAL DRAFT, NOT APPLIED. Run once in the Supabase SQL editor (or `supabase db push`)
-- BEFORE deploying the game.js that sends `difficulty` (r4, 2026-10-03).
--
-- Old rows: every score saved before this migration gets difficulty = 'normal' (column default),
-- so they appear under the Normal tab. Normal is the default difficulty in game.js, and the
-- leaderboard is per day, so this only affects the deploy day and earlier days.
--
-- Safe to re-run. The client also tolerates the column being absent (it retries the insert
-- without difficulty and shows "Showing all difficulties for now."), so the order of
-- migration vs. deploy can't lose scores, but run this first to get the tabs working.

alter table public.scores
  add column if not exists difficulty text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scores_difficulty_check' and conrelid = 'public.scores'::regclass
  ) then
    alter table public.scores
      add constraint scores_difficulty_check check (difficulty in ('easy', 'normal', 'hard'));
  end if;
end $$;

-- Leaderboard query: where puzzle_date = ? and difficulty = ? order by time_seconds limit 10
create index if not exists scores_date_difficulty_time_idx
  on public.scores (puzzle_date, difficulty, time_seconds);

-- Row Level Security: no policy change should be needed. Existing insert/select policies
-- are row-based. If an insert policy lists allowed columns in its WITH CHECK, or column-level
-- grants are used for the anon role, add `difficulty` there:
--   grant insert (difficulty) on public.scores to anon;
--   grant select (difficulty) on public.scores to anon;

-- Rollback (drops the column and the per-difficulty boards):
--   drop index if exists scores_date_difficulty_time_idx;
--   alter table public.scores drop constraint if exists scores_difficulty_check;
--   alter table public.scores drop column if exists difficulty;

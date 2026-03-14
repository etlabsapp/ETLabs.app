-- Run this in your Supabase SQL Editor (same project as FlipFeed is fine).
-- Creates table for tracking App Store apps (e.g. SleepTight downloads).

create table if not exists public.tracked_apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  app_name text not null,
  app_store_id text,
  download_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tracked_apps enable row level security;

create policy "Users can read own tracked apps"
  on public.tracked_apps for select
  using (auth.uid() = user_id);

create policy "Users can insert own tracked apps"
  on public.tracked_apps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tracked apps"
  on public.tracked_apps for update
  using (auth.uid() = user_id);

create policy "Users can delete own tracked apps"
  on public.tracked_apps for delete
  using (auth.uid() = user_id);

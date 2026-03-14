-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) after creating your project.

create table if not exists public.user_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  config jsonb not null default '{"widgets":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_config enable row level security;

create policy "Users can read own config"
  on public.user_config for select
  using (auth.uid() = user_id);

create policy "Users can insert own config"
  on public.user_config for insert
  with check (auth.uid() = user_id);

create policy "Users can update own config"
  on public.user_config for update
  using (auth.uid() = user_id);

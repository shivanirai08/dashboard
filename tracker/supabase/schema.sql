-- Run once in Supabase Dashboard → SQL Editor.
-- Single-user setup: one row, no auth, RLS off (the anon key can read/write it).
create table if not exists public.tracker_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.tracker_state disable row level security;
grant select, insert, update on public.tracker_state to anon;

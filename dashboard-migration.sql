-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

-- Body measurements (waist/chest/hips/arms) for the before/after log
create table if not exists measurement_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  waist numeric,
  chest numeric,
  hips numeric,
  arms numeric,
  created_at timestamptz default now(),
  unique (user_id, entry_date)
);
alter table measurement_log enable row level security;
create policy "own measurement log" on measurement_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily habit checklist (workout-done is derived from gym_checkins, not stored here)
create table if not exists habit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  steps_hit boolean not null default false,
  slept_well boolean not null default false,
  water_hit boolean not null default false,
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);
alter table habit_log enable row level security;
create policy "own habit log" on habit_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tracks the lowest weight-loss milestone already celebrated, so the toast fires once
alter table profile add column if not exists last_weight_milestone numeric;

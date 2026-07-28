-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- Adds: streak freeze balance (on profile), and streak_freeze_uses table.
-- (XP/Levels and the PR feed are computed from data you already store —
--  weight_log, exercise_log, gym_checkins — so no new tables needed for those.)

alter table profile add column if not exists freezes_earned int not null default 0;
alter table profile add column if not exists last_freeze_milestone int not null default 0;

create table if not exists streak_freeze_uses (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  created_at timestamptz default now(),
  unique (user_id, entry_date)
);

alter table streak_freeze_uses enable row level security;

create policy "own streak freezes" on streak_freeze_uses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run

-- Profile (age, sex, height, weight, activity level)
create table profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age int,
  sex text,
  current_weight numeric,
  height numeric,
  activity numeric default 1.375,
  updated_at timestamptz default now()
);

-- Weight log entries
create table weight_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  weight numeric not null,
  created_at timestamptz default now(),
  unique (user_id, entry_date)
);

-- Calorie log entries
create table calorie_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  calories int not null,
  created_at timestamptz default now(),
  unique (user_id, entry_date)
);

-- Enable Row Level Security
alter table profile enable row level security;
alter table weight_log enable row level security;
alter table calorie_log enable row level security;

-- Policies: a user can only read/write their own rows
create policy "own profile" on profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own weight log" on weight_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own calorie log" on calorie_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable anonymous sign-ins for this project:
-- Dashboard → Authentication → Providers → Anonymous Sign-Ins → toggle ON

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

-- Exercise performance log (for progressive overload tracking)
create table exercise_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  exercise_name text not null,
  entry_date date not null,
  weight numeric,
  reps int,
  created_at timestamptz default now(),
  unique (user_id, exercise_name, entry_date)
);

alter table exercise_log enable row level security;

create policy "own exercise log" on exercise_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Gym check-in / check-out with photo proof (streak feature)
create table gym_checkins (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  check_in_time timestamptz,
  check_in_photo_path text,
  check_out_time timestamptz,
  check_out_photo_path text,
  is_rest_day boolean not null default false,
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);

alter table gym_checkins enable row level security;

create policy "own gym checkins" on gym_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private storage bucket for check-in/check-out photos.
-- If this insert fails (some Supabase projects restrict SQL access to storage.buckets),
-- create it manually instead: Dashboard → Storage → New bucket → name "gym-photos" → Private.
insert into storage.buckets (id, name, public)
values ('gym-photos', 'gym-photos', false)
on conflict (id) do nothing;

-- Photos are stored at path "{user_id}/...", so this restricts each user to their own folder.
create policy "own gym photos read" on storage.objects
  for select using (bucket_id = 'gym-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own gym photos write" on storage.objects
  for insert with check (bucket_id = 'gym-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own gym photos delete" on storage.objects
  for delete using (bucket_id = 'gym-photos' and auth.uid()::text = (storage.foldername(name))[1]);

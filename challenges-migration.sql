-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create table if not exists user_challenges (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  challenge_id text not null,
  start_date date not null,
  status text not null default 'active', -- active | completed | failed | abandoned
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_challenges enable row level security;

create policy "own challenges" on user_challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enforce only one active challenge per user at the database level too
create unique index if not exists one_active_challenge_per_user
  on user_challenges (user_id)
  where status = 'active';

-- Challenge Points wallet + tracking whether a rest day was purchased
alter table profile add column if not exists challenge_points int not null default 0;
alter table gym_checkins add column if not exists purchased_rest boolean not null default false;

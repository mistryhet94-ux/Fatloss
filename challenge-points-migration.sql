-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- (Only run this if you already ran challenges-migration.sql earlier —
--  this just adds the Challenge Points wallet on top of it.)

alter table profile add column if not exists challenge_points int not null default 0;
alter table gym_checkins add column if not exists purchased_rest boolean not null default false;

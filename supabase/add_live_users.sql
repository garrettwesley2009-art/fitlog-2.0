-- Live users page (admin only).
-- Run once in the Supabase SQL editor BEFORE the new code goes live. Safe to run more than once.
--
-- 1) user_activity: one row per person, updated about once a minute while the app is open
--    in a visible tab. "Online now" means seen in the last 5 minutes.
-- 2) app_admins: the emails allowed to open the admin page.
-- 3) admin_live_stats(): returns the numbers to admins only. Everyone else gets "not allowed",
--    so people's activity is never readable from the app by regular users.

create table if not exists public.user_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.user_activity enable row level security;

drop policy if exists "Users manage their own activity" on public.user_activity;
create policy "Users manage their own activity"
  on public.user_activity
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.app_admins (
  email text primary key
);

-- No policies on purpose: nobody can read this table from the app, only the function below.
alter table public.app_admins enable row level security;

insert into public.app_admins (email)
values ('garrettwesley2009@gmail.com')
on conflict do nothing;

-- Add Markus (replace with his login email), then run just this line:
-- insert into public.app_admins (email) values ('markus-email-here@example.com') on conflict do nothing;

create or replace function public.admin_live_stats()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  -- "Today" runs on Eastern time.
  day_start timestamptz := (date_trunc('day', now() at time zone 'America/New_York')) at time zone 'America/New_York';
begin
  if not exists (
    select 1 from public.app_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return json_build_object(
    'online_now',        (select count(*) from public.user_activity where last_seen_at > now() - interval '5 minutes'),
    'active_today',      (select count(*) from public.user_activity where last_seen_at >= day_start),
    'new_signups_today', (select count(*) from auth.users where created_at >= day_start),
    'workouts_today',    (select count(*) from public.workouts where created_at >= day_start),
    'total_users',       (select count(*) from auth.users)
  );
end;
$$;

revoke all on function public.admin_live_stats() from public, anon;
grant execute on function public.admin_live_stats() to authenticated;

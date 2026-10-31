-- Extra setup-profile answers so the Coach can build programs for each person.
-- All optional. Safe to run more than once.
alter table public.profiles add column if not exists train_days text[] not null default '{}';   -- e.g. {Mon,Tue,Thu,Fri}
alter table public.profiles add column if not exists session_minutes int;                      -- 30 to 120
alter table public.profiles add column if not exists focus_muscles text[] not null default '{}'; -- up to 3, e.g. {Shoulders,Arms}
alter table public.profiles add column if not exists avoid_moves text[] not null default '{}';  -- movements that hurt, e.g. {Overhead pressing}
alter table public.profiles add column if not exists likes text;                                -- exercises they love
alter table public.profiles add column if not exists dislikes text;                             -- exercises they hate
alter table public.profiles add column if not exists sport text;                                -- e.g. Baseball, Powerlifting meet
alter table public.profiles add column if not exists sport_season text;                         -- off, pre, in
alter table public.profiles add column if not exists event_date date;                           -- next season start, game or meet

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_session_minutes_check') then
    alter table public.profiles add constraint profiles_session_minutes_check
      check (session_minutes between 15 and 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_sport_season_check') then
    alter table public.profiles add constraint profiles_sport_season_check
      check (sport_season in ('off', 'pre', 'in'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_likes_check') then
    alter table public.profiles add constraint profiles_likes_check
      check (char_length(likes) <= 300 and char_length(dislikes) <= 300 and char_length(sport) <= 60);
  end if;
end $$;

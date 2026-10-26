-- Welcome slides + "about you" setup.
-- Adds goal fields to profiles. Safe to run once (it checks before changing anything).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarded_at'
  ) then
    alter table public.profiles
      add column goals text[] not null default '{}',
      add column days_per_week int,
      add column onboarded_at timestamptz,
      add column onboarding_optional boolean not null default false;

    -- Everyone who already has an account may skip the setup screen the first time.
    -- New accounts after this must give a name and at least one goal.
    update public.profiles set onboarding_optional = true;
  end if;
end $$;

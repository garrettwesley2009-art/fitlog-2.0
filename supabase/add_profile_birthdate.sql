-- Date of birth (calendar) instead of birth year, and Male/Female only.
-- Safe to run more than once. Run after add_profile_fields.sql.

alter table public.profiles add column if not exists birth_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_birth_date_check') then
    alter table public.profiles add constraint profiles_birth_date_check
      check (birth_date >= date '1920-01-01' and birth_date <= current_date);
  end if;
end $$;

-- Gender is now Male or Female only. Clear anything else, then tighten the rule.
update public.profiles set gender = null where gender is not null and gender not in ('male', 'female');
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender in ('male', 'female'));

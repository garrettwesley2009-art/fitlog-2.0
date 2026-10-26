-- Extra profile fields: experience, birth year, gender, height, weight, equipment, limits.
-- Safe to run more than once. Only the member can see their own row (existing profile policies).

alter table public.profiles add column if not exists experience text;
alter table public.profiles add column if not exists birth_year int;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists height_in numeric(4,1);
alter table public.profiles add column if not exists weight_lb numeric(5,1);
alter table public.profiles add column if not exists equipment text[] not null default '{}';
alter table public.profiles add column if not exists limits text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_experience_check') then
    alter table public.profiles add constraint profiles_experience_check
      check (experience in ('new', 'some', 'experienced'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_birth_year_check') then
    alter table public.profiles add constraint profiles_birth_year_check
      check (birth_year between 1920 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_gender_check') then
    alter table public.profiles add constraint profiles_gender_check
      check (gender in ('male', 'female', 'nonbinary', 'prefer_not'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_height_in_check') then
    alter table public.profiles add constraint profiles_height_in_check
      check (height_in between 36 and 96);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_weight_lb_check') then
    alter table public.profiles add constraint profiles_weight_lb_check
      check (weight_lb between 50 and 700);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_limits_check') then
    alter table public.profiles add constraint profiles_limits_check
      check (char_length(limits) <= 500);
  end if;
end $$;

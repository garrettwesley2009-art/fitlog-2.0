-- FitLog v1 schema
-- Run this once in the Supabase SQL editor for your project.
-- Designed to be forward-compatible with the fuller multi-sport version planned later:
-- exercises/workouts/sets here are the same shape that version's prescription engine will read.

create extension if not exists "pgcrypto";

-- ---------- Profiles ----------
-- Mirrors auth.users with app-specific fields. One row per signed-up user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Exercises ----------
-- Shared exercise library. Seeded exercises + anything a user creates on the fly.
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  is_custom boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Anyone signed in can read exercises"
  on public.exercises for select
  using (auth.role() = 'authenticated');

create policy "Users can add custom exercises"
  on public.exercises for insert
  with check (auth.uid() = created_by);

-- ---------- Templates (admin-seeded starter programs) ----------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  day_label text not null,
  order_index int not null default 0
);

create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references public.template_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index int not null default 0,
  target_sets int,
  target_reps text,
  notes text
);

alter table public.templates enable row level security;
alter table public.template_days enable row level security;
alter table public.template_exercises enable row level security;

create policy "Anyone signed in can read templates"
  on public.templates for select using (auth.role() = 'authenticated');
create policy "Anyone signed in can read template days"
  on public.template_days for select using (auth.role() = 'authenticated');
create policy "Anyone signed in can read template exercises"
  on public.template_exercises for select using (auth.role() = 'authenticated');

-- ---------- User programs ----------
-- A user's own active program -- copied from a template, built manually, or AI-customized.
create table if not exists public.user_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text not null check (source in ('template', 'manual', 'ai_customized')),
  source_template_id uuid references public.templates(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_program_days (
  id uuid primary key default gen_random_uuid(),
  user_program_id uuid not null references public.user_programs(id) on delete cascade,
  day_label text not null,
  order_index int not null default 0
);

create table if not exists public.user_program_exercises (
  id uuid primary key default gen_random_uuid(),
  user_program_day_id uuid not null references public.user_program_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index int not null default 0,
  target_sets int,
  target_reps text,
  notes text
);

alter table public.user_programs enable row level security;
alter table public.user_program_days enable row level security;
alter table public.user_program_exercises enable row level security;

create policy "Users manage their own programs"
  on public.user_programs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own program days"
  on public.user_program_days for all
  using (
    auth.uid() = (select user_id from public.user_programs where id = user_program_id)
  )
  with check (
    auth.uid() = (select user_id from public.user_programs where id = user_program_id)
  );

create policy "Users manage their own program exercises"
  on public.user_program_exercises for all
  using (
    auth.uid() = (
      select up.user_id from public.user_program_days upd
      join public.user_programs up on up.id = upd.user_program_id
      where upd.id = user_program_day_id
    )
  )
  with check (
    auth.uid() = (
      select up.user_id from public.user_program_days upd
      join public.user_programs up on up.id = upd.user_program_id
      where upd.id = user_program_day_id
    )
  );

-- ---------- Workouts & sets (the permanent log) ----------
-- This is the "constant log" -- every set, forever. The later, fuller version's
-- prescription engine and records screen read straight from this shape.
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_program_day_id uuid references public.user_program_days(id),
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_index int not null default 1,
  weight numeric,
  reps int,
  rpe numeric,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;
alter table public.sets enable row level security;

create policy "Users manage their own workouts"
  on public.workouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own sets"
  on public.sets for all
  using (
    auth.uid() = (select user_id from public.workouts where id = workout_id)
  )
  with check (
    auth.uid() = (select user_id from public.workouts where id = workout_id)
  );

-- ---------- AI assistant chat log ----------
-- Persisted so a conversation survives a refresh and so later versions can learn from it.
create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_program_id uuid references public.user_programs(id),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.assistant_messages enable row level security;

create policy "Users manage their own assistant messages"
  on public.assistant_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Helpful indexes ----------
create index if not exists idx_sets_workout on public.sets(workout_id);
create index if not exists idx_workouts_user_date on public.workouts(user_id, date desc);
create index if not exists idx_assistant_messages_user on public.assistant_messages(user_id, created_at);

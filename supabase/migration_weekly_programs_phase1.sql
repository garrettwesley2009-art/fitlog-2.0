-- Weekly programs, phase 1: program length, per-day progress, workout week tracking.

alter table public.templates
  add column if not exists total_weeks int not null default 8
  check (total_weeks between 4 and 12);

alter table public.user_programs
  add column if not exists total_weeks int not null default 8
  check (total_weeks between 4 and 12);

alter table public.workouts
  add column if not exists user_program_id uuid references public.user_programs(id) on delete set null,
  add column if not exists week_number int;

create table if not exists public.program_day_progress (
  id uuid primary key default gen_random_uuid(),
  user_program_id uuid not null references public.user_programs(id) on delete cascade,
  user_program_day_id uuid not null references public.user_program_days(id) on delete cascade,
  week_number int not null check (week_number >= 1),
  status text not null check (status in ('done', 'skipped')),
  workout_id uuid references public.workouts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_program_id, user_program_day_id, week_number)
);

alter table public.program_day_progress enable row level security;

create policy "Users manage their own day progress"
  on public.program_day_progress for all
  using (
    auth.uid() = (select user_id from public.user_programs where id = user_program_id)
  )
  with check (
    auth.uid() = (select user_id from public.user_programs where id = user_program_id)
  );

create index if not exists idx_progress_program
  on public.program_day_progress(user_program_id, week_number);
create index if not exists idx_workouts_program_position
  on public.workouts(user_program_id, week_number, user_program_day_id);
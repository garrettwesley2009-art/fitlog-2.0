-- Log page v2: per-exercise feedback (for the people who train and for analysis).
-- Run once in the Supabase SQL editor BEFORE the new Log page code goes live.
-- Safe to run more than once.

-- 1) One row per exercise per workout: how it felt (1-5), an optional note, and a
--    snapshot of what was planned vs what was done. Written by the Log page.
create table if not exists public.exercise_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  status text not null default 'done' check (status in ('done', 'skipped', 'swapped')),
  effort smallint check (effort between 1 and 5),   -- 1 very easy ... 5 max effort
  note text,
  swapped_to_name text,                              -- set when status = 'swapped'
  -- what the program asked for
  sets_planned int,
  reps_planned text,
  -- what actually got logged (recalculated every time the feedback is saved)
  sets_done int not null default 0,
  top_weight numeric,
  total_reps int,
  total_volume numeric,
  -- where in the program this happened
  user_program_id uuid references public.user_programs(id) on delete set null,
  user_program_day_id uuid references public.user_program_days(id) on delete set null,
  week_number int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id, exercise_id)
);

create index if not exists exercise_feedback_user_exercise_idx
  on public.exercise_feedback (user_id, exercise_id, created_at desc);

alter table public.exercise_feedback enable row level security;

drop policy if exists "Users manage their own exercise feedback" on public.exercise_feedback;
create policy "Users manage their own exercise feedback"
  on public.exercise_feedback
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2) A flat view for analysis: one row per exercise per workout with the date,
--    program, day, effort and numbers side by side. In the Supabase table editor
--    open this view and use Export to CSV, or query it in the SQL editor.
--    security_invoker keeps it private for app users (they only ever see their
--    own rows); the SQL editor and dashboard see everyone.
create or replace view public.exercise_log_summary
with (security_invoker = true) as
select
  f.id,
  f.user_id,
  w.date as workout_date,
  f.created_at,
  p.name as program_name,
  f.week_number,
  d.day_label,
  f.exercise_name,
  f.status,
  f.effort,
  f.note,
  f.swapped_to_name,
  f.sets_planned,
  f.reps_planned,
  f.sets_done,
  f.top_weight,
  f.total_reps,
  f.total_volume
from public.exercise_feedback f
join public.workouts w on w.id = f.workout_id
left join public.user_programs p on p.id = f.user_program_id
left join public.user_program_days d on d.id = f.user_program_day_id;

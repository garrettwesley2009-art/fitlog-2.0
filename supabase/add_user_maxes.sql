-- Saved one-rep maxes, used by the Log page to work out weights from percents.
-- Run once in the Supabase SQL editor BEFORE the new Log page code goes live.
-- Safe to run more than once.

create table if not exists public.user_maxes (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  one_rm numeric not null check (one_rm > 0 and one_rm <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.user_maxes enable row level security;

drop policy if exists "Users manage their own maxes" on public.user_maxes;
create policy "Users manage their own maxes"
  on public.user_maxes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

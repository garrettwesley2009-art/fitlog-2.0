-- Goals: a lift target ("Squat 275 lb") or a weekly habit ("Train 3 days a week").
-- Run once in the Supabase SQL editor BEFORE the new Goals page goes live.
-- Safe to run more than once.

create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('lift', 'weekly')),
  exercise_name text,                       -- only for kind = 'lift'
  target numeric not null check (target > 0 and target <= 2000),
  start_value numeric not null default 0,   -- best weight (lift) when the goal was made
  created_at timestamptz not null default now()
);

alter table public.user_goals enable row level security;

drop policy if exists "Users manage their own goals" on public.user_goals;
create policy "Users manage their own goals"
  on public.user_goals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

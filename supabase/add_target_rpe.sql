-- Coach's RPE system: every program exercise can carry a prescribed RPE as text,
-- for example "9-10" (hypertrophy), "7-8" (strength) or "10" (a 1-rep max day).
-- The RPE each set was actually done at is already saved in sets.rpe.
-- Safe to run more than once.
alter table public.user_program_exercises add column if not exists target_rpe text;
alter table public.template_exercises add column if not exists target_rpe text;

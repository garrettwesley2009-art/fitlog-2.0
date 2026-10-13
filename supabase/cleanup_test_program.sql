delete from public.exercise_feedback
where workout_id in (
  select w.id from public.workouts w
  join public.user_programs p on p.id = w.user_program_id
  where p.name = 'Test');

delete from public.sets
where workout_id in (
  select w.id from public.workouts w
  join public.user_programs p on p.id = w.user_program_id
  where p.name = 'Test');

delete from public.workouts
where user_program_id in (
  select id from public.user_programs where name = 'Test');
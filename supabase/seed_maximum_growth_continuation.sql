-- Maximum Growth Continuation template (workouts #2-#9 of the paper program).
-- Run once in the Supabase SQL editor. Safe to re-run: it skips if the template exists.
--
-- How it maps to FitLog: FitLog loops through the days of a template as one 'week'.
-- The paper program alternates two training weeks (A and B), so this template has
-- 8 days = A then B, and total_weeks = 4 (4 passes x 2 training weeks = 8 weeks).
-- Workouts #10-#29 repeat #2-#9 exactly. Week 8 (#30-#33) is the same B week with
-- about 2 more reps per set and is NOT included yet (needs per-week overrides).
-- Reps are written per set, e.g. 8/8/6/6F means 8, 8, 6, then 6 to failure.
--
-- Contents:
--   Workout 2 - Chest, Shoulders, Arms [Super sets]
--     Bench Press: 4 sets, reps 8/8/6/6F
--     Incline Dumbbell Press: 4 sets, reps 10/8/8/8F
--     Seated Barbell Press: 4 sets, reps 12/10/10/10F
--     Dumbbell Side Raise: 3 sets, reps 12/10/10
--     Triceps Pushdown: 4 sets, reps 15/12/12/12
--     Incline Dumbbell Curl: 4 sets, reps 15/12/12/12
--   Workout 3 - Back, Shoulders, Arms [Triple drop sets]
--     Single-Arm Dumbbell Row: 4 sets, reps 10/8/8/8F
--     Wide-Grip Lat Pulldown: 4 sets, reps 8/8/6/6F
--     Reverse Dumbbell Flye: 3 sets, reps 12
--     Lying Triceps Extension: 6 sets, reps 8
--     Single-Arm Dumbbell Curl: 6 sets, reps 8
--   Workout 4 - Chest, Shoulders, Heavy Arms [Heavy arm day]
--     Incline Dumbbell Press: 4 sets, reps 10/8/8/8F
--     Flat Dumbbell Flye: 4 sets, reps 10/8/8/8F
--     Dumbbell Side Raise: 3 sets, reps 12/10/10
--     Close-Grip Bench Press: 4 sets, reps 8/6/6/6
--     Barbell Curl: 4 sets, reps 8/6/6/6
--   Workout 5 - Legs, Calves [Triple drop sets]
--     Barbell Squat: 5 sets, reps 15/12/10/10/10F
--     Standing Calf Raise: 3 sets, reps 10
--     Leg Extension: 6 sets, reps 10/10/8/8/8/8
--     Leg Curl: 6 sets, reps 10/10/8/8/8/8
--   Workout 6 - Back, Shoulders, Arms [Super sets]
--     Wide-Grip Lat Pulldown: 4 sets, reps 8/8/6/6F
--     Close-Grip Seated Cable Row: 4 sets, reps 10/8/8/8F
--     Reverse Dumbbell Flye: 3 sets, reps 12
--     Triceps Pushdown: 4 sets, reps 15/12/12/12
--     Incline Dumbbell Curl: 4 sets, reps 15/12/12/12
--   Workout 7 - Chest, Shoulders, Arms [Triple drop sets]
--     Bench Press: 4 sets, reps 8/8/6/6F
--     Flat Dumbbell Flye: 4 sets, reps 10/8/8/8F
--     Dumbbell Side Raise: 3 sets, reps 10
--     Lying Triceps Extension: 6 sets, reps 8
--     Single-Arm Dumbbell Curl: 6 sets, reps 8
--   Workout 8 - Back, Shoulders, Heavy Arms [Heavy arm day]
--     Single-Arm Dumbbell Row: 4 sets, reps 10/8/8/8F
--     Close-Grip Seated Cable Row: 4 sets, reps 10/8/8/8F
--     Reverse Dumbbell Flye: 3 sets, reps 12
--     Close-Grip Bench Press: 4 sets, reps 8/6/6/6
--     Barbell Curl: 4 sets, reps 8/6/6/6
--   Workout 9 - Legs, Calves [Super sets]
--     Leg Extension: 4 sets, reps 12
--     Leg Press: 4 sets, reps 8/8/8/8F
--     Barbell Squat: 4 sets, reps 12/10/10/10
--     Straight-Leg Dumbbell Deadlift: 4 sets, reps 12
--     Standing Calf Raise: 3 sets, reps 8/8/8F

do $$
declare
  t_id uuid;
  d_id uuid;
begin
  if exists (select 1 from public.templates where name = 'Maximum Growth Continuation') then
    raise notice 'Template already exists - nothing changed.';
    return;
  end if;

  -- Add any exercises that are not in the exercise list yet (matched by name, any case).
  insert into public.exercises (name, is_custom)
  select v.name, false
  from (values
    ('Bench Press'),
    ('Incline Dumbbell Press'),
    ('Seated Barbell Press'),
    ('Dumbbell Side Raise'),
    ('Triceps Pushdown'),
    ('Incline Dumbbell Curl'),
    ('Single-Arm Dumbbell Row'),
    ('Wide-Grip Lat Pulldown'),
    ('Reverse Dumbbell Flye'),
    ('Lying Triceps Extension'),
    ('Single-Arm Dumbbell Curl'),
    ('Flat Dumbbell Flye'),
    ('Close-Grip Bench Press'),
    ('Barbell Curl'),
    ('Barbell Squat'),
    ('Standing Calf Raise'),
    ('Leg Extension'),
    ('Leg Curl'),
    ('Close-Grip Seated Cable Row'),
    ('Leg Press'),
    ('Straight-Leg Dumbbell Deadlift')
  ) as v(name)
  where not exists (select 1 from public.exercises e where lower(e.name) = lower(v.name));

  insert into public.templates (name, description, total_weeks)
  values ('Maximum Growth Continuation', '8-week continuation program, 4 training days per week (chest, back, chest, legs; back, chest, back, legs on alternate weeks). Each pass through the 8 days below covers two training weeks, so 4 passes = 8 weeks. Shoulders, triceps and biceps are trained on every chest and back day.', 4)
  returning id into t_id;

  -- Workout 2 - Chest, Shoulders, Arms [Super sets]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 2 - Chest, Shoulders, Arms', 0)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Bench Press', 4, '8/8/6/6F', 'Barbell. Rest 75/120/150/150 sec. Last set to failure.'),
    (1, 'Incline Dumbbell Press', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (2, 'Seated Barbell Press', 4, '12/10/10/10F', 'Or standing barbell press. Rest 75/90/90/90 sec. Last set to failure.'),
    (3, 'Dumbbell Side Raise', 3, '12/10/10', 'Rest 45/60/60 sec.'),
    (4, 'Triceps Pushdown', 4, '15/12/12/12', 'Superset with Incline Dumbbell Curl: one pushdown set, straight into one curl set. Pushdown has no rest. Machine.'),
    (5, 'Incline Dumbbell Curl', 4, '15/12/12/12', 'Superset with Triceps Pushdown. Rest 45/60/60 sec after each curl set (none after the last).')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 3 - Back, Shoulders, Arms [Triple drop sets]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 3 - Back, Shoulders, Arms', 1)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Single-Arm Dumbbell Row', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (1, 'Wide-Grip Lat Pulldown', 4, '8/8/6/6F', 'Machine. Rest 75/120/150/150 sec. Last set to failure.'),
    (2, 'Reverse Dumbbell Flye', 3, '12', 'Rear delts. Rest 60 sec.'),
    (3, 'Lying Triceps Extension', 6, '8', 'E-Z curl bar or barbell. Triple drop sets (sets 1-3, then sets 4-6): after each of the first two sets in a round, cut the weight and keep going with no rest. Rest 90 sec after sets 3 and 6.'),
    (4, 'Single-Arm Dumbbell Curl', 6, '8', 'Triple drop sets (sets 1-3, then sets 4-6): after each of the first two sets in a round, cut the weight and keep going with no rest. Rest 90 sec after sets 3 and 6.')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 4 - Chest, Shoulders, Heavy Arms [Heavy arm day]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 4 - Chest, Shoulders, Heavy Arms', 2)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Incline Dumbbell Press', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (1, 'Flat Dumbbell Flye', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (2, 'Dumbbell Side Raise', 3, '12/10/10', 'Rest 60 sec.'),
    (3, 'Close-Grip Bench Press', 4, '8/6/6/6', 'Barbell. Heavy. Rest 150 sec.'),
    (4, 'Barbell Curl', 4, '8/6/6/6', 'Heavy. Rest 150 sec between sets.')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 5 - Legs, Calves [Triple drop sets]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 5 - Legs, Calves', 3)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Barbell Squat', 5, '15/12/10/10/10F', 'Rest 60/90/120/120/120 sec. Last set to failure.'),
    (1, 'Standing Calf Raise', 3, '10', 'Machine. Rest 90 sec.'),
    (2, 'Leg Extension', 6, '10/10/8/8/8/8', 'Machine. Triple drop sets (sets 1-3, then sets 4-6): after each of the first two sets in a round, cut the weight and keep going with no rest. Rest 90 sec after sets 3 and 6.'),
    (3, 'Leg Curl', 6, '10/10/8/8/8/8', 'Machine. Triple drop sets (sets 1-3, then sets 4-6): after each of the first two sets in a round, cut the weight and keep going with no rest. Rest 90 sec after sets 3 and 6.')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 6 - Back, Shoulders, Arms [Super sets]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 6 - Back, Shoulders, Arms', 4)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Wide-Grip Lat Pulldown', 4, '8/8/6/6F', 'Machine. Rest 75/120/150/150 sec. Last set to failure.'),
    (1, 'Close-Grip Seated Cable Row', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (2, 'Reverse Dumbbell Flye', 3, '12', 'Rear delts. Rest 60 sec.'),
    (3, 'Triceps Pushdown', 4, '15/12/12/12', 'Superset with Incline Dumbbell Curl: one pushdown set, straight into one curl set. Pushdown has no rest. Machine.'),
    (4, 'Incline Dumbbell Curl', 4, '15/12/12/12', 'Superset with Triceps Pushdown. Rest 45/60/60 sec after each curl set (none after the last).')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 7 - Chest, Shoulders, Arms [Triple drop sets]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 7 - Chest, Shoulders, Arms', 5)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Bench Press', 4, '8/8/6/6F', 'Barbell. Rest 75/120/150/150 sec. Last set to failure.'),
    (1, 'Flat Dumbbell Flye', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (2, 'Dumbbell Side Raise', 3, '10', 'Rest 75 sec.'),
    (3, 'Lying Triceps Extension', 6, '8', 'E-Z curl bar or barbell. Triple drop sets (sets 1-3, then sets 4-6): after each of the first two sets in a round, cut the weight and keep going with no rest. Rest 90 sec after sets 3 and 6.'),
    (4, 'Single-Arm Dumbbell Curl', 6, '8', 'Triple drop sets (sets 1-3, then sets 4-6): after each of the first two sets in a round, cut the weight and keep going with no rest. Rest 90 sec after sets 3 and 6.')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 8 - Back, Shoulders, Heavy Arms [Heavy arm day]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 8 - Back, Shoulders, Heavy Arms', 6)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Single-Arm Dumbbell Row', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (1, 'Close-Grip Seated Cable Row', 4, '10/8/8/8F', 'Rest 60/90/120/120 sec. Last set to failure.'),
    (2, 'Reverse Dumbbell Flye', 3, '12', 'Rear delts. Rest 60 sec.'),
    (3, 'Close-Grip Bench Press', 4, '8/6/6/6', 'Barbell. Heavy. Rest 150 sec.'),
    (4, 'Barbell Curl', 4, '8/6/6/6', 'Heavy. Rest 150 sec between sets.')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;

  -- Workout 9 - Legs, Calves [Super sets]
  insert into public.template_days (template_id, day_label, order_index)
  values (t_id, 'Workout 9 - Legs, Calves', 7)
  returning id into d_id;
  insert into public.template_exercises
    (template_day_id, exercise_id, order_index, target_sets, target_reps, notes)
  select d_id, e.id, v.ord, v.sets, v.reps, v.note
  from (values
    (0, 'Leg Extension', 4, '12', 'Machine. Superset with Leg Press: one extension set, straight into one press set. Extension has no rest.'),
    (1, 'Leg Press', 4, '8/8/8/8F', 'Superset with Leg Extension. Rest 120/150/150/150 sec after each press set. Last set to failure.'),
    (2, 'Barbell Squat', 4, '12/10/10/10', 'Rest 90/120/120/120 sec.'),
    (3, 'Straight-Leg Dumbbell Deadlift', 4, '12', 'Rest 90/105/120/120 sec.'),
    (4, 'Standing Calf Raise', 3, '8/8/8F', 'Machine. Rest 90/90 sec. Last set to failure.')
  ) as v(ord, name, sets, reps, note)
  join lateral (
    select id from public.exercises x where lower(x.name) = lower(v.name) limit 1
  ) e on true;
end $$;

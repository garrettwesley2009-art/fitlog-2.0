-- Placeholder starter template so the app has something to show immediately.
-- Replace/extend this once you send over your own programs -- the shape is
-- simple: a template has days, each day has exercises with target sets/reps.

insert into public.exercises (name, category) values
  ('Back Squat', 'legs'),
  ('Bench Press', 'push'),
  ('Barbell Row', 'pull'),
  ('Overhead Press', 'push'),
  ('Deadlift', 'legs'),
  ('Pull-Up', 'pull')
on conflict (name) do nothing;

with t as (
  insert into public.templates (name, description)
  values ('Starter Full Body', 'A basic 3-day full body template -- placeholder until real programs are added.')
  returning id
),
d1 as (
  insert into public.template_days (template_id, day_label, order_index)
  select id, 'Day 1', 0 from t returning id
),
d2 as (
  insert into public.template_days (template_id, day_label, order_index)
  select id, 'Day 2', 1 from t returning id
),
d3 as (
  insert into public.template_days (template_id, day_label, order_index)
  select id, 'Day 3', 2 from t returning id
)
insert into public.template_exercises (template_day_id, exercise_id, order_index, target_sets, target_reps)
select d1.id, e.id, 0, 4, '6-8' from d1, public.exercises e where e.name = 'Back Squat'
union all
select d1.id, e.id, 1, 3, '8-10' from d1, public.exercises e where e.name = 'Bench Press'
union all
select d2.id, e.id, 0, 3, '8-10' from d2, public.exercises e where e.name = 'Barbell Row'
union all
select d2.id, e.id, 1, 3, '6-8' from d2, public.exercises e where e.name = 'Overhead Press'
union all
select d3.id, e.id, 0, 4, '5' from d3, public.exercises e where e.name = 'Deadlift'
union all
select d3.id, e.id, 1, 3, '8-10' from d3, public.exercises e where e.name = 'Pull-Up';

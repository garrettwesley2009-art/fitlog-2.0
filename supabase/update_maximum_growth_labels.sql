-- Relabel the Maximum Growth Continuation days as Week A / Week B and explain
-- the 2-weeks-per-pass layout in the description. Safe to run more than once.

update public.template_days d
set day_label = case d.order_index
  when 0 then 'Week A, Day 1 - Chest, Shoulders, Arms (Workout 2)'
  when 1 then 'Week A, Day 2 - Back, Shoulders, Arms (Workout 3)'
  when 2 then 'Week A, Day 3 - Chest, Shoulders, Heavy Arms (Workout 4)'
  when 3 then 'Week A, Day 4 - Legs, Calves (Workout 5)'
  when 4 then 'Week B, Day 1 - Back, Shoulders, Arms (Workout 6)'
  when 5 then 'Week B, Day 2 - Chest, Shoulders, Arms (Workout 7)'
  when 6 then 'Week B, Day 3 - Back, Shoulders, Heavy Arms (Workout 8)'
  when 7 then 'Week B, Day 4 - Legs, Calves (Workout 9)'
end
from public.templates t
where t.id = d.template_id
  and t.name = 'Maximum Growth Continuation';

update public.templates
set description = '8-week program, 4 training days a week. Week A is chest, back, chest, legs. Week B is back, chest, back, legs. The days below cover Week A then Week B, so each pass through them is 2 weeks and 4 passes finish the program. The app counts each pass as one week. Shoulders, triceps and biceps are trained on every chest and back day.'
where name = 'Maximum Growth Continuation';

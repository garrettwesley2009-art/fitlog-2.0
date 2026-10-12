@AGENTS.md
How the app works (key files)
Navigation is URL-driven by src/lib/nav.ts (sections with prefixes, subs, hideHeader); src/components/nav-bar.tsx renders the header, sub tabs and the bottom bar: Workout | Schedule | Home | Coach | You.
Programs run 4-12 weeks (total_weeks, default 8). A template's days loop as one "week".
Current day is derived, not stored: getProgramPosition in src/lib/data.ts finds the first (week, day) with no row in program_day_progress (status done or skipped).
Server actions in src/app/actions/workouts.ts: skipCurrentDay, startWorkoutForCurrentDay (workout is created lazily on the first saved set), finishWorkout (needs at least one set).
Home page: src/app/(main)/dashboard/page.tsx + src/lib/home.ts (streak = consecutive calendar weeks Mon-Sun with a workout that has sets; chart = last 7 workouts). Not-built cards live in src/components/home-placeholders.tsx and get swapped for real ones when the feature ships.
Log page: src/app/(main)/log/page.tsx + src/components/workout-logger.tsx. Check-off rows prefilled from last time and the plan; target_reps is a text like 8/8/6/6F (per set, F = to failure), parsed by src/lib/log-plan.ts. Per-exercise 1-5 effort rating + note go to exercise_feedback (see supabase/migration_exercise_feedback.sql); the view exercise_log_summary is for analysis/CSV export. Timers only on exercises with target_seconds.
"Last time" = sets from the most recent other workout containing that exercise (by exercise id, so exercise names must be consistent across templates).
/api/workouts POST is unused and can be deleted.
Done and live

Weekly programs (phase 1), last-time sets (phase 2), new navigation, new Home page, Maximum Growth Continuation template (workouts #2-9, 8 days = Week A then Week B, 4 passes).

In progress

New Log page (check-off rows + effort feedback). Needs migration_exercise_feedback.sql run first.

Next (rough order)

Redesign remaining pages one by one (My Program, Discover, Build, Coach, You). Then: Step A profile + onboarding (name + at least one goal required, rest skippable; adults only for the beta), Step B goals + visual tracker, Step C badges + mascot, calendar (Schedule tab), week overrides (phase 3, SQL-filled), template header fix ("8 weeks, 4 days a week" for the Maximum Growth template), week 8 high-rep variant of that template, use logged effort data to adjust workouts.

Known limits

Home chart and streak read only the latest 120 workouts. Volume ignores sets without weight/reps. Existing programs start at Week 1 Day 1; old workouts do not count toward progress. Mascot art, badges, goals are placeholders.
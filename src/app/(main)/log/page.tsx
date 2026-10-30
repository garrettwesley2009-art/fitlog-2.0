import { getUserCached } from '@/lib/supabase/get-user'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'
import { WorkoutLogger } from '@/components/workout-logger'
import type {
  LoggedSet,
  LastTime,
  LastTimeSet,
  FeedbackEntry,
} from '@/components/workout-logger'

// "2026-10-03" -> "Oct 3". Done here on the server with a fixed locale so the
// text is identical on the server and in the browser.
function formatDay(date: string | null): string {
  if (!date) return ''
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function LogPage() {
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)
  const position = program ? await getProgramPosition(supabase, program) : null

  if (program && position?.finished) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-[34px] font-extrabold text-ink">Log a workout</h1>
        <p className="text-sm text-muted">
          You&apos;ve finished {program.name}.{' '}
          <Link href="/dashboard" className="text-ink underline">
            Back to the dashboard
          </Link>{' '}
          to pick what&apos;s next.
        </p>
      </div>
    )
  }

  // If a workout for today's day was already started, resume it.
  let initialWorkoutId: string | null = null
  let initialSets: LoggedSet[] = []

  if (program && position && !position.finished) {
    const { data: existing } = await supabase
      .from('workouts')
      .select('id, sets(id, set_index, weight, reps, rpe, exercises(name))')
      .eq('user_id', user.id)
      .eq('user_program_id', program.id)
      .eq('week_number', position.week)
      .eq('user_program_day_id', position.day.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      initialWorkoutId = existing.id as string
      initialSets = (existing.sets ?? []).map((s) => ({
        id: s.id as string,
        set_index: s.set_index as number,
        weight: s.weight as number | null,
        reps: s.reps as number | null,
        rpe: s.rpe as number | null,
        exercise_name:
          (s as unknown as { exercises: { name: string } | null }).exercises?.name ?? '',
      }))
    }
  }

  // Feedback already given on this workout (so a refresh keeps it). If the
  // exercise_feedback table has not been created yet this just comes back empty.
  let initialFeedback: FeedbackEntry[] = []
  if (initialWorkoutId) {
    const { data: fbRows } = await supabase
      .from('exercise_feedback')
      .select('exercise_name, status, effort, note, swapped_to_name')
      .eq('workout_id', initialWorkoutId)
    initialFeedback = (fbRows ?? []) as FeedbackEntry[]
  }

  // Last time: for each of today's exercises, the sets from the most recent
  // OTHER workout where that exercise was logged. It doesn't matter which
  // week or day that was, so it still works after skipped days.
  const lastTime: Record<string, LastTime> = {}
  const history: Record<string, LastTime[]> = {}
  // Heaviest weight logged per exercise in those earlier workouts, so the logger can spot a new PR.
  const bests: Record<string, number> = {}

  if (program && position && !position.finished) {
    const exerciseNameById = new Map<string, string>()
    for (const e of position.day.exercises) {
      if (e.exercise_id) exerciseNameById.set(e.exercise_id, e.exercise_name)
    }

    if (exerciseNameById.size > 0) {
      const { data: pastWorkouts } = await supabase
        .from('workouts')
        .select('id, date, sets(set_index, weight, reps, rpe, exercise_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60)

      for (const w of pastWorkouts ?? []) {
        if (w.id === initialWorkoutId) continue

        const setsByExercise = new Map<string, LastTimeSet[]>()
        for (const s of w.sets ?? []) {
          const exerciseId = s.exercise_id as string | null
          if (!exerciseId || !exerciseNameById.has(exerciseId)) continue
          const list = setsByExercise.get(exerciseId) ?? []
          list.push({
            set_index: s.set_index as number,
            weight: s.weight as number | null,
            reps: s.reps as number | null,
            rpe: s.rpe as number | null,
          })
          setsByExercise.set(exerciseId, list)
        }

        for (const [exerciseId, sets] of setsByExercise) {
          const name = exerciseNameById.get(exerciseId)!
          for (const s of sets) {
            const w = Number(s.weight) || 0
            if (w > (bests[name] ?? 0)) bests[name] = w
          }
          const entry: LastTime = {
            date: formatDay(w.date as string | null),
            sets: sets.sort((a, b) => a.set_index - b.set_index),
          }
          if (!lastTime[name]) lastTime[name] = entry // most recent other workout
          const list = history[name] ?? []
          if (list.length < 3) {
            list.push(entry)
            history[name] = list
          }
        }
      }
    }
  }

  const day =
    program && position && !position.finished
      ? {
          id: position.day.id,
          day_label: position.day.day_label,
          exercises: position.day.exercises.map((e) => ({
            exercise_name: e.exercise_name,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            notes: e.notes,
          })),
        }
      : null

  const workoutLabel =
    program && position && !position.finished
      ? `Week ${position.week} of ${position.totalWeeks} \u00b7 ${position.day.day_label}`
      : 'Workout'

  // Saved one-rep maxes (lb), keyed by lowercase exercise name. If the user_maxes table has not
  // been created yet this comes back empty and the Log page just shows percents without weights.
  const maxes: Record<string, number> = {}
  {
    const { data: maxRows } = await supabase
      .from('user_maxes')
      .select('one_rm, exercises(name)')
      .eq('user_id', user.id)
    for (const row of (maxRows ?? []) as unknown as {
      one_rm: number | string
      exercises: { name: string } | null
    }[]) {
      const name = row.exercises?.name
      if (name && Number(row.one_rm) > 0) maxes[name.toLowerCase()] = Number(row.one_rm)
    }
  }

  // The whole program (read-only) for the "Program" viewer on the Log screen.
  const programLite =
    program && position && !position.finished
      ? {
          name: program.name,
          week: position.week,
          totalWeeks: position.totalWeeks,
          currentDayId: position.day.id,
          days: program.days.map((d) => ({
            id: d.id,
            day_label: d.day_label,
            exercises: d.exercises.map((e) => ({
              exercise_name: e.exercise_name,
              target_sets: e.target_sets,
              target_reps: e.target_reps,
              notes: e.notes,
            })),
          })),
        }
      : null

  return (
    <WorkoutLogger
      program={programLite}
      maxes={maxes}
      bests={bests}
      day={day}
      workoutLabel={workoutLabel}
      initialWorkoutId={initialWorkoutId}
      initialSets={initialSets}
      lastTime={lastTime}
      history={history}
      initialFeedback={initialFeedback}
    />
  )
}

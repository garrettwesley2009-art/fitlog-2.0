import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'
import { WorkoutLogger } from '@/components/workout-logger'
import type { LoggedSet } from '@/components/workout-logger'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)
  const position = program ? await getProgramPosition(supabase, program) : null

  if (program && position?.finished) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-ink">Log a workout</h1>
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

  const day =
    program && position && !position.finished
      ? {
          id: position.day.id,
          day_label: position.day.day_label,
          exercises: position.day.exercises.map((e) => ({
            exercise_name: e.exercise_name,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
          })),
        }
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Log a workout</h1>
        {program && position && !position.finished ? (
          <>
            <p className="mt-1 text-sm text-muted">Following: {program.name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-accent">
              Week {position.week} of {position.totalWeeks} &middot; {position.day.day_label}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">
            No program set -- logging freeform.{' '}
            <Link href="/templates" className="text-ink underline">
              pick a template
            </Link>
          </p>
        )}
      </div>

      <WorkoutLogger
        day={day}
        initialWorkoutId={initialWorkoutId}
        initialSets={initialSets}
      />
    </div>
  )
}

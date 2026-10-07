import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'
import { skipCurrentDay } from '@/app/actions/workouts'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)
  const position = program ? await getProgramPosition(supabase, program) : null

  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('id, date, sets(id)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Everything you log here saves straight to the cloud as you go.
        </p>
      </div>

      {program && position && !position.finished ? (
        <div className="glass-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Week {position.week} of {position.totalWeeks}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{position.day.day_label}</h2>
          <p className="mt-1 text-sm text-muted">
            {program.name} &middot; Day {position.dayIndex + 1} of {program.days.length}
          </p>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round((position.doneCount / position.totalDays) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {position.doneCount} of {position.totalDays} days finished
          </p>

          <div className="inset-card mt-4 divide-y divide-line px-4">
            {position.day.exercises.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">{ex.exercise_name}</span>
                <span className="text-muted">
                  {ex.target_sets && ex.target_reps ? `${ex.target_sets} x ${ex.target_reps}` : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/log" className="btn-accent">
              Start workout
            </Link>
            <form action={skipCurrentDay}>
              <button type="submit" className="btn-ghost">
                Skip day
              </button>
            </form>
          </div>
        </div>
      ) : program && position?.finished ? (
        <div className="glass-card p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Program complete
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{program.name}</h2>
          <p className="mt-1 text-sm text-muted">
            You finished all {position.totalWeeks} weeks. Pick what&apos;s next.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/templates" className="btn-accent">
              Choose a template
            </Link>
            <Link href="/programs/new" className="btn-ghost">
              Build your own
            </Link>
            <Link href="/assistant" className="btn-ghost">
              Ask the AI assistant
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 text-center">
          <p className="text-ink">You don&apos;t have a program yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/templates" className="btn-accent">
              Choose a template
            </Link>
            <Link href="/programs/new" className="btn-ghost">
              Build your own
            </Link>
            <Link href="/assistant" className="btn-ghost">
              Ask the AI assistant
            </Link>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
        {recentWorkouts && recentWorkouts.length > 0 ? (
          <ul className="glass-card mt-2 divide-y divide-line overflow-hidden">
            {recentWorkouts.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-glass-hover"
              >
                <span className="text-ink">{w.date}</span>
                <span className="text-muted">{w.sets?.length ?? 0} sets logged</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No workouts logged yet.</p>
        )}
      </div>
    </div>
  )
}

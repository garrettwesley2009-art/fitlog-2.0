import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram } from '@/lib/data'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)

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

      {program ? (
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Current program
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{program.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {program.days.length} day{program.days.length === 1 ? '' : 's'} &middot; source:{' '}
                {program.source}
              </p>
            </div>
            <Link href="/log" className="btn-accent">
              Start a workout
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {program.days.map((day) => (
              <div key={day.id} className="inset-card p-3 hover:border-accent/40">
                <p className="text-sm font-medium text-ink">{day.day_label}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-muted">
                  {day.exercises.map((ex) => (
                    <li key={ex.id}>
                      {ex.exercise_name}
                      {ex.target_sets && ex.target_reps
                        ? ` — ${ex.target_sets}x${ex.target_reps}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
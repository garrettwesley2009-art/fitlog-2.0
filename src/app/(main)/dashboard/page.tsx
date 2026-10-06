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
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Everything you log here saves straight to the cloud as you go.
        </p>
      </div>

      {program ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400">Current program</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">{program.name}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {program.days.length} day{program.days.length === 1 ? '' : 's'} &middot; source: {program.source}
              </p>
            </div>
            <Link
              href="/log"
              className="rounded-md border border-blue-800 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start a workout
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {program.days.map((day) => (
              <div
                key={day.id}
                className="rounded-lg border border-neutral-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
              >
                <p className="text-sm font-medium text-neutral-900">{day.day_label}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-neutral-500">
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
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center shadow-sm">
          <p className="text-neutral-700">You don&apos;t have a program yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/templates"
              className="rounded-md border border-blue-800 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Choose a template
            </Link>
            <Link
              href="/programs/new"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Build your own
            </Link>
            <Link
              href="/assistant"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Ask the AI assistant
            </Link>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Recent activity</h2>
        {recentWorkouts && recentWorkouts.length > 0 ? (
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white shadow-sm">
            {recentWorkouts.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-neutral-50"
              >
                <span className="text-neutral-700">{w.date}</span>
                <span className="text-neutral-500">{w.sets?.length ?? 0} sets logged</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No workouts logged yet.</p>
        )}
      </div>
    </div>
  )
}
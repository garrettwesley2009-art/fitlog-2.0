import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'

export default async function MyProgramPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)

  if (!program) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">My program</h1>
        <div className="glass-card p-6 text-center">
          <p className="text-ink">You don&apos;t have a program yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/templates" className="btn-accent">
              Discover workouts
            </Link>
            <Link href="/programs/new" className="btn-ghost">
              Build your own
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const position = await getProgramPosition(supabase, program)
  const week = position.finished ? position.totalWeeks : position.week

  const { data: rows } = await supabase
    .from('program_day_progress')
    .select('user_program_day_id, status')
    .eq('user_program_id', program.id)
    .eq('week_number', week)

  const statusByDay = new Map<string, string>(
    (rows ?? []).map((r: { user_program_day_id: string; status: string }) => [
      r.user_program_day_id,
      r.status,
    ])
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {position.finished
            ? 'Program complete'
            : `Week ${position.week} of ${position.totalWeeks}`}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{program.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {position.doneCount} of {position.totalDays} days finished
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {program.days.map((day) => {
          const isToday = !position.finished && position.day.id === day.id
          const status = statusByDay.get(day.id)
          const label = isToday
            ? 'Today'
            : status === 'done'
              ? 'Done'
              : status === 'skipped'
                ? 'Skipped'
                : 'Upcoming'

          return (
            <div key={day.id} className="glass-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-ink">{day.day_label}</p>
                <p
                  className={`text-xs font-medium uppercase tracking-wide ${
                    isToday ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {label}
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {day.exercises.map((ex) => (
                  <li key={ex.id}>
                    {ex.exercise_name}
                    {ex.target_sets && ex.target_reps
                      ? ` - ${ex.target_sets}x${ex.target_reps}`
                      : ''}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="btn-accent">
          Go to today
        </Link>
        <Link href="/programs/new" className="btn-ghost">
          Build a new program
        </Link>
      </div>
    </div>
  )
}

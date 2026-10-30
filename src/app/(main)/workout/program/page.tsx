import { getUserCached } from '@/lib/supabase/get-user'
import { HelpTip } from '@/components/help-tip'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'

export default async function MyProgramPage() {
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)

  if (!program) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-[34px] font-extrabold text-ink">My program</h1>
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

  const percent = position.totalDays > 0 ? Math.round((position.doneCount / position.totalDays) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-accent-text">
          {position.finished
            ? 'Program complete'
            : `Week ${position.week} of ${position.totalWeeks}`}
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 break-words font-display text-[34px] font-extrabold leading-none text-ink">{program.name}</h1>
          <Link href="/workout/program/edit" className="btn-ghost-sm flex-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
            </svg>
            Edit
          </Link>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-inset">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-muted tabular">
          {position.doneCount} of {position.totalDays} days finished{' '}<HelpTip title="How programs work"><p>A program is a set number of weeks. Each week you do every day in order, then the program moves to the next week.</p><p>Days are not tied to the calendar. Do them whenever suits you. Tap Skip on Home if you have to miss one.</p></HelpTip>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {program.days.map((day, i) => {
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
            <section key={day.id} className={`rounded-card border bg-surface p-4 ${isToday ? 'border-accent' : 'border-line'}`}>
              <div className="flex items-center gap-3">
                {status === 'done' ? (
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-success text-on-success">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                ) : (
                  <span
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full font-display font-bold ${
                      isToday ? 'border-2 border-accent text-ink' : 'border border-line-strong text-muted'
                    }`}
                  >
                    {status === 'skipped' ? '–' : i + 1}
                  </span>
                )}
                <h2 className="min-w-0 flex-1 font-display text-xl font-bold leading-tight text-ink">{day.day_label}</h2>
                <p className={`flex-none text-xs font-semibold uppercase tracking-[0.08em] ${isToday ? 'text-accent-text' : 'text-muted'}`}>
                  {label}
                </p>
              </div>
              <ul className={`mt-2.5 ${isToday ? '' : 'text-muted'}`}>
                {day.exercises.map((ex) => (
                  <li key={ex.id} className="flex justify-between gap-3 border-t border-line py-2 text-[15px]">
                    <span className="min-w-0">{ex.exercise_name}</span>
                    {ex.target_sets && ex.target_reps && (
                      <span className="flex-none font-display text-lg font-bold tabular text-ink">
                        {ex.target_sets} × {ex.target_reps}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {isToday && (
                <Link href="/log" className="btn-accent mt-2 w-full">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 4.5v15l13-7.5z" />
                  </svg>
                  Start {day.day_label}
                </Link>
              )}
            </section>
          )
        })}
      </div>

      <Link href="/programs/new" className="flex min-h-11 items-center justify-center text-[15px] font-semibold text-accent-text">
        Build a new program
      </Link>
    </div>
  )
}

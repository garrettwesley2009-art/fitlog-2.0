import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'
import { getHomeStats } from '@/lib/home'
import { skipCurrentDay } from '@/app/actions/workouts'
import { HomeGreeting } from '@/components/home-greeting'
import { VolumeBars } from '@/components/volume-bars'
import {
  BadgesPlaceholder,
  GoalPlaceholder,
  QuestPlaceholder,
} from '@/components/home-placeholders'

function firstName(displayName: string | undefined, email: string | undefined) {
  const raw = displayName?.trim() || email?.split('@')[0] || 'there'
  const first = raw.split(/\s+/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const name = firstName(
    user.user_metadata?.display_name as string | undefined,
    user.email
  )

  const program = await getCurrentProgram(supabase, user.id)
  const position = program ? await getProgramPosition(supabase, program) : null
  const stats = await getHomeStats(supabase, user.id)

  // This week's day-by-day status, and whether a workout was left half-done.
  const statusByDay = new Map<string, string>()
  let setsLogged = 0

  if (program && position) {
    const week = position.finished ? position.totalWeeks : position.week

    const { data: rows } = await supabase
      .from('program_day_progress')
      .select('user_program_day_id, status')
      .eq('user_program_id', program.id)
      .eq('week_number', week)

    for (const r of (rows ?? []) as { user_program_day_id: string; status: string }[]) {
      statusByDay.set(r.user_program_day_id, r.status)
    }

    if (!position.finished) {
      const { data: current } = await supabase
        .from('workouts')
        .select('id, sets(count)')
        .eq('user_id', user.id)
        .eq('user_program_id', program.id)
        .eq('week_number', position.week)
        .eq('user_program_day_id', position.day.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setsLogged = (current?.sets as { count: number }[] | undefined)?.[0]?.count ?? 0
    }
  }

  const inProgress = setsLogged > 0
  const percent =
    position && position.totalDays > 0
      ? Math.round((position.doneCount / position.totalDays) * 100)
      : 0

  return (
    <div className="space-y-5">
      <HomeGreeting name={name} />

      {/* Workout card */}
      {program && position && !position.finished ? (
        <section className="relative overflow-hidden rounded-card border border-accent/60 bg-linear-to-br from-accent/90 via-accent/40 to-surface p-6">
          {/* Mascot or exercise art goes in this circle later */}
          <div className="absolute right-5 top-5 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-ink/40 text-center text-[9px] leading-tight text-ink/60">
            mascot
            <br />
            art
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-ink/80">
            {inProgress
              ? 'Workout in progress'
              : `Week ${position.week} of ${position.totalWeeks} · Day ${position.dayIndex + 1} of ${program.days.length}`}
          </p>
          <h2 className="mt-1 max-w-[60%] text-3xl font-bold leading-tight text-ink">
            {position.day.day_label}
          </h2>
          <p className="mt-1 text-sm text-ink/80">
            {inProgress
              ? `${setsLogged} ${setsLogged === 1 ? 'set' : 'sets'} logged so far`
              : `${position.day.exercises.length} exercises · ${position.day.exercises.reduce(
                  (sum, e) => sum + (e.target_sets ?? 0),
                  0
                )} sets`}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/log"
              className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90"
            >
              {inProgress ? 'Resume workout' : 'Start workout'}
            </Link>
            <form action={skipCurrentDay}>
              <button type="submit" className="btn-ghost">
                Skip day
              </button>
            </form>
          </div>
        </section>
      ) : program && position?.finished ? (
        <section className="glass-card p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Program complete
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{program.name}</h2>
          <p className="mt-1 text-sm text-muted">
            You finished all {position.totalWeeks} weeks. Pick what&apos;s next.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/templates" className="btn-accent">
              Discover workouts
            </Link>
            <Link href="/programs/new" className="btn-ghost">
              Build your own
            </Link>
            <Link href="/assistant" className="btn-ghost">
              Ask the coach
            </Link>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-card border border-accent/60 bg-linear-to-br from-accent/90 via-accent/40 to-surface p-6">
          {/* Same art circle as the workout card, so Home looks the same either way */}
          <div className="absolute right-5 top-5 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-ink/40 text-center text-[9px] leading-tight text-ink/60">
            mascot
            <br />
            art
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-ink/80">
            Get started
          </p>
          <h2 className="mt-1 max-w-[60%] text-3xl font-bold leading-tight text-ink">
            Pick your program
          </h2>
          <p className="mt-1 max-w-[75%] text-sm text-ink/80">
            Choose a workout plan and your first day will show up right here.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/templates"
              className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90"
            >
              Choose a program
            </Link>
            <Link href="/programs/new" className="btn-ghost">
              Build your own
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink/70">
            Not sure where to start?{' '}
            <Link href="/assistant" className="underline hover:text-ink">
              Ask the coach
            </Link>
          </p>
        </section>
      )}

      {/* This week: dots, with the program progress bar underneath */}
      {program && position && !position.finished && (
        <section className="glass-card p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">This week</p>
            <p className="text-xs text-muted">
              Week {position.week} of {position.totalWeeks}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-y-3">
            {program.days.map((day, i) => {
              const isToday = position.day.id === day.id
              const status = statusByDay.get(day.id)
              const circle =
                status === 'done'
                  ? 'border-accent bg-accent text-ink'
                  : status === 'skipped'
                    ? 'border-muted text-muted'
                    : isToday
                      ? 'border-ink ring-4 ring-ink/10'
                      : 'border-line'
              return (
                <div
                  key={day.id}
                  title={day.day_label}
                  className="flex flex-col items-center gap-1.5 text-[10px] text-muted"
                >
                  Day {i + 1}
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs ${circle}`}
                  >
                    {status === 'done' ? '✓' : status === 'skipped' ? '–' : ''}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {position.doneCount} of {position.totalDays} days finished &middot; {program.name}
          </p>
        </section>
      )}

      {/* Streak */}
      <section className="glass-card flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Streak</p>
          {stats.streakWeeks > 0 ? (
            <>
              <p className="mt-1 text-4xl font-extrabold leading-none text-accent">
                {stats.streakWeeks}
                <span className="ml-2 text-base font-semibold text-ink">
                  {stats.streakWeeks === 1 ? 'week' : 'weeks'} in a row
                </span>
              </p>
              <p className="mt-2 text-xs text-muted">
                {stats.trainedThisWeek
                  ? 'You have trained this week. Keep it going.'
                  : 'Train this week to keep your streak alive.'}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-lg font-semibold text-ink">No streak yet</p>
              <p className="mt-1 text-xs text-muted">
                Log a workout to start one. Every week with a workout adds to it.
              </p>
            </>
          )}
        </div>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`h-12 w-12 flex-none ${stats.streakWeeks > 0 ? 'fill-accent' : 'fill-line'}`}
        >
          <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 1-10z" />
        </svg>
      </section>

      {/* Weight lifted per workout */}
      <section className="glass-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Weight lifted per workout
        </p>
        <VolumeBars points={stats.volumes} />
      </section>

      {/* Not built yet: shown dimmed so the layout is complete */}
      <BadgesPlaceholder />
      <GoalPlaceholder />
      <QuestPlaceholder />
    </div>
  )
}

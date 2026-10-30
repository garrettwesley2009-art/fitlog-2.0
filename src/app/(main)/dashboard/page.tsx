import { getUserCached } from '@/lib/supabase/get-user'
import { HelpTip } from '@/components/help-tip'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'
import { getHomeStats } from '@/lib/home'
import { skipCurrentDay } from '@/app/actions/workouts'
import { HomeGreeting } from '@/components/home-greeting'
import {
  KeyLiftsCard,
  LastSessionCard,
  WeeklyVolumeCard,
  RecordsCard,
  MusclesCard,
  CoachNoteCard,
  TrophyIcon,
  CheckIcon,
  FlameIcon,
} from '@/components/home-cards'
import {
  BadgesPlaceholder,
  GoalPlaceholder,
  } from '@/components/home-placeholders'

function firstName(displayName: string | undefined, email: string | undefined) {
  const raw = displayName?.trim() || email?.split('@')[0] || 'there'
  const first = raw.split(/\s+/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
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

  const totalSets = position && !position.finished
    ? position.day.exercises.reduce((sum, e) => sum + (e.target_sets ?? 0), 0)
    : 0
  const daysLeft = position ? Math.max(0, position.totalDays - position.doneCount) : 0
  const bigNumber = position && !position.finished ? String(position.dayIndex + 1).padStart(2, '0') : null

  return (
    <div className="space-y-3">
      <HomeGreeting name={name} />

      {/* Today: the one thing that matters, as a big red block */}
      {program && position && !position.finished ? (
        <section className="relative overflow-hidden rounded-[22px] bg-accent p-5 text-white">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-1.5 -top-9 select-none font-display text-[190px] font-extrabold leading-none text-white/[0.12]"
          >
            {bigNumber}
          </span>
          <p className="relative text-[13px] font-semibold uppercase tracking-[0.1em]">
            {inProgress ? 'Workout in progress' : `Today · Week ${position.week} · Day ${position.dayIndex + 1}`}
          </p>
          <h1 className="relative mt-1.5 max-w-[85%] break-words font-display text-[44px] font-extrabold uppercase leading-[0.95] sm:text-[54px]">
            {position.day.day_label}
          </h1>
          <div className="relative mt-4 flex gap-6">
            {(inProgress
              ? [
                  { n: String(setsLogged), label: setsLogged === 1 ? 'set logged' : 'sets logged' },
                  { n: String(Math.max(0, totalSets - setsLogged)), label: 'sets to go' },
                ]
              : [
                  { n: String(position.day.exercises.length), label: 'exercises' },
                  { n: String(totalSets), label: 'sets' },
                  { n: String(daysLeft), label: daysLeft === 1 ? 'day left' : 'days left' },
                ]
            ).map((s) => (
              <div key={s.label}>
                <p className="font-display text-[30px] font-bold leading-none tabular">{s.n}</p>
                <p className="mt-0.5 text-[13px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <Link
            href="/log"
            className="relative mt-5 flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white text-lg font-bold text-canvas transition-transform active:scale-[0.97]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
            {inProgress ? 'Resume workout' : 'Start workout'}
          </Link>
          <form action={skipCurrentDay} className="relative mt-1 flex justify-center">
            <button type="submit" className="min-h-11 px-3 text-[15px] font-medium text-white underline underline-offset-[3px]">
              Skip today
            </button>
          </form>
        </section>
      ) : program && position?.finished ? (
        <section className="relative overflow-hidden rounded-[22px] bg-accent p-5 text-white">
          <span aria-hidden="true" className="absolute right-4 top-4 text-white/30">
            <TrophyIcon size={72} strokeWidth={1.6} />
          </span>
          <p className="relative text-[13px] font-semibold uppercase tracking-[0.1em]">Program complete</p>
          <h1 className="relative mt-1.5 max-w-[80%] break-words font-display text-[44px] font-extrabold uppercase leading-[0.95]">
            {program.name}
          </h1>
          <p className="relative mt-2 text-[15px]">You finished all {position.totalWeeks} weeks. Pick what&apos;s next.</p>
          <Link
            href="/templates"
            className="relative mt-5 flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-canvas"
          >
            Discover workouts
          </Link>
          <div className="relative mt-2 grid grid-cols-2 gap-2">
            <Link href="/programs/new" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/70 font-semibold">
              Build your own
            </Link>
            <Link href="/assistant" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/70 font-semibold">
              Ask the coach
            </Link>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[22px] bg-accent p-5 text-white">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em]">Get started</p>
          <h1 className="mt-1.5 font-display text-[48px] font-extrabold uppercase leading-[0.95]">
            Pick your
            <br />
            program
          </h1>
          <p className="mt-2 max-w-[85%] text-[15px]">Choose a workout plan and your first day shows up right here.</p>
          <Link
            href="/templates"
            className="mt-5 flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-canvas"
          >
            Choose a program
          </Link>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/programs/new" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/70 font-semibold">
              Build your own
            </Link>
            <Link href="/assistant" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/70 font-semibold">
              Ask the coach
            </Link>
          </div>
        </section>
      )}

      {/* This week + streak, one slim strip */}
      <section className="card flex items-center gap-3.5 px-4 py-3.5">
        {program && position && !position.finished ? (
          <div className="min-w-0 flex-1">
            <p className="label-caps">
              This week{' '}
              <HelpTip title="This week">
                <p>Each circle is one workout day in your program. Green with a check is done, a dash is skipped, and the red ring is today.</p>
                <p>Your program is a set number of weeks. Finish every day (or skip it) to move on to the next week.</p>
              </HelpTip>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {program.days.map((day, i) => {
                const isToday = position.day.id === day.id
                const status = statusByDay.get(day.id)
                if (status === 'done') {
                  return (
                    <span key={day.id} title={day.day_label} aria-label={`Day ${i + 1}, done`} className="flex h-11 w-11 items-center justify-center rounded-full bg-success text-on-success">
                      <CheckIcon />
                    </span>
                  )
                }
                return (
                  <span
                    key={day.id}
                    title={day.day_label}
                    aria-label={`Day ${i + 1}${isToday ? ', today' : status === 'skipped' ? ', skipped' : ''}`}
                    className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-lg ${
                      isToday
                        ? 'border-[3px] border-accent font-bold text-ink'
                        : 'border border-line-strong font-semibold text-muted'
                    }`}
                  >
                    {status === 'skipped' ? '–' : i + 1}
                  </span>
                )
              })}
            </div>
            <p className="mt-2 text-[13px] text-muted tabular">
              Week {position.week} of {position.totalWeeks} · {position.doneCount} of {position.totalDays} days ({percent}%)
            </p>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="label-caps">Streak</p>
            <p className="mt-1 text-[15px] text-muted">
              {stats.streakWeeks > 0
                ? stats.trainedThisWeek
                  ? 'You have trained this week. Keep it going.'
                  : 'Train this week to keep your streak alive.'
                : 'Log a workout to start one. Every week with a workout adds to it.'}
            </p>
          </div>
        )}
        <div className="w-px self-stretch bg-line" aria-hidden="true" />
        <div className="w-[76px] flex-none text-center">
          <p className={`flex items-center justify-center gap-0.5 font-display text-[40px] font-extrabold leading-none tabular ${stats.streakWeeks > 0 ? 'text-streak' : 'text-muted'}`}>
            <FlameIcon />
            {stats.streakWeeks}
          </p>
          <p className="mt-0.5 text-[13px] leading-tight text-muted">
            week
            <br />
            streak{' '}
            <HelpTip title="Streak">
              <p>How many weeks in a row you trained at least once, Monday to Sunday. Miss a whole week and it starts over.</p>
            </HelpTip>
          </p>
        </div>
      </section>

      <KeyLiftsCard lifts={stats.keyLifts} />
      {stats.lastSession && <LastSessionCard session={stats.lastSession} />}
      <WeeklyVolumeCard weeks={stats.weeks} />
      {stats.lastSession && <RecordsCard records={stats.monthRecords} />}
      <MusclesCard muscles={stats.muscles} />
      {stats.coachNote && <CoachNoteCard note={stats.coachNote} />}

      {/* Not built yet: slots for the badges and goals features */}
      <BadgesPlaceholder />
      <GoalPlaceholder />
    </div>
  )
}

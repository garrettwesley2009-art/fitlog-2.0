import Link from 'next/link'
import { getUserCached } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { DAY_MS, fmt, getSessions, isoDay, todayStr, weekStart, type Session } from '@/lib/training'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dayParts(date: string) {
  const d = new Date(`${date}T12:00:00Z`)
  return {
    day: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
  }
}

function SessionCard({ s }: { s: Session }) {
  const { day, weekday } = dayParts(s.date)
  const prNames = s.prs.map((p) => p.exercise)
  return (
    <li className="card p-3.5">
      <div className="flex items-center gap-3.5">
        <span className="w-[52px] flex-none text-center" aria-label={s.date}>
          <span className="block font-display text-[30px] font-extrabold leading-none text-ink">{day}</span>
          <span className="block text-xs font-semibold tracking-[0.06em] text-muted">{weekday}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold uppercase leading-tight text-ink">{s.label ?? 'Workout'}</h2>
          <p className="text-sm text-muted tabular">
            {s.sets.length} sets · {fmt(s.volume)} lb
          </p>
        </div>
        {prNames.length > 0 && (
          <span className="flex-none rounded-full bg-record px-2.5 py-1 text-xs font-bold text-on-record">
            PR · {prNames[0]}
            {prNames.length > 1 ? ` +${prNames.length - 1}` : ''}
          </span>
        )}
      </div>
    </li>
  )
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const user = userData.user!
  const sessions = await getSessions(supabase, user.id)

  const today = todayStr()
  const thisWeek = weekStart(today)
  const trained = new Set(sessions.map((s) => s.date))
  const thisWeekCount = sessions.filter((s) => weekStart(s.date) === thisWeek).length

  const earlier = sessions.filter((s) => weekStart(s.date) < thisWeek)
  const current = sessions.filter((s) => weekStart(s.date) === thisWeek)
  const lastWeekStart = thisWeek - 7 * DAY_MS
  const lastWeek = earlier.filter((s) => weekStart(s.date) === lastWeekStart)
  const older = earlier.filter((s) => weekStart(s.date) < lastWeekStart)

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">History</h1>

      <section className="card p-3.5" aria-label="This week">
        <div className="flex items-baseline justify-between">
          <p className="label-caps">This week</p>
          <p className="text-sm text-muted tabular">
            {thisWeekCount} {thisWeekCount === 1 ? 'workout' : 'workouts'}
          </p>
        </div>
        <ol className="mt-3 flex justify-between">
          {DAY_LETTERS.map((letter, i) => {
            const date = isoDay(thisWeek + i * DAY_MS)
            const done = trained.has(date)
            const isToday = date === today
            return (
              <li key={date} className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    done
                      ? 'bg-success text-on-success'
                      : isToday
                        ? 'border-2 border-accent text-ink'
                        : 'bg-inset text-muted'
                  }`}
                >
                  {done ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    letter
                  )}
                </span>
                <span className="sr-only">
                  {letter} {date}: {done ? 'trained' : isToday ? 'today' : 'rest'}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {sessions.length === 0 ? (
        <div className="card p-5 text-center">
          <p className="font-display text-2xl font-bold uppercase text-ink">No workouts yet</p>
          <p className="mt-1 text-sm text-muted">Your first one will show up here.</p>
          <Link href="/log" className="btn-accent mt-4 inline-flex w-full">Start a workout</Link>
        </div>
      ) : (
        <>
          {current.length > 0 && (
            <section>
              <p className="label-caps mb-2">Workouts this week</p>
              <ul className="space-y-2.5">{current.map((s) => <SessionCard key={s.id} s={s} />)}</ul>
            </section>
          )}
          {lastWeek.length > 0 && (
            <section>
              <p className="label-caps mb-2">Last week</p>
              <ul className="space-y-2.5">{lastWeek.map((s) => <SessionCard key={s.id} s={s} />)}</ul>
            </section>
          )}
          {older.length > 0 && (
            <section>
              <p className="label-caps mb-2">Older</p>
              <ul className="space-y-2.5">{older.slice(0, 30).map((s) => <SessionCard key={s.id} s={s} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

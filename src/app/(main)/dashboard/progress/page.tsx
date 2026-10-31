import Link from 'next/link'
import { getUserCached } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import {
  DAY_MS, fmt, getSessions, isoDay, liftSeries, shortDate, todayStr, trainedLifts, weekStart,
} from '@/lib/training'

// Line chart of the top weight in each workout. Numbers are also written in the table below.
function LiftChart({ points }: { points: { date: string; weight: number }[] }) {
  const W = 320
  const H = 120
  const pad = 10
  const ws = points.map((p) => p.weight)
  const lo = Math.min(...ws)
  const hi = Math.max(...ws)
  const span = hi - lo || 1
  const x = (i: number) => (points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1))
  const y = (w: number) => H - pad - ((w - lo) / span) * (H - pad * 2)
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.weight).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-[120px] w-full" role="img" aria-label="Top weight in each workout, oldest to newest. The same numbers are in the table below.">
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="stroke-line" strokeWidth="1" />
      {points.length > 1 && <polyline points={line} fill="none" className="stroke-insight" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.weight)} r={i === points.length - 1 ? 5 : 3.5} className="fill-canvas stroke-insight" strokeWidth="2.5" />
      ))}
    </svg>
  )
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ lift?: string }> }) {
  const { lift } = await searchParams
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const user = userData.user!
  const sessions = await getSessions(supabase, user.id)
  const lifts = trainedLifts(sessions)

  if (sessions.length === 0 || lifts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">Progress</h1>
        <div className="card p-5 text-center">
          <p className="font-display text-2xl font-bold uppercase text-ink">Nothing to chart yet</p>
          <p className="mt-1 text-sm text-muted">Log a workout and your lifts will show up here.</p>
          <Link href="/log" className="btn-accent mt-4 inline-flex w-full">Start a workout</Link>
        </div>
      </div>
    )
  }

  const chips = lifts.slice(0, 8)
  const picked = lifts.find((l) => l.name === lift)?.name ?? chips[0].name
  const series = liftSeries(sessions, picked)
  const recent = series.slice(-8)
  const latest = series[series.length - 1]
  const first = series[0]
  const change = latest.weight - first.weight

  // Last 5 weeks, oldest first
  const thisWeek = weekStart(todayStr())
  const weeks = [4, 3, 2, 1, 0].map((k) => {
    const start = thisWeek - k * 7 * DAY_MS
    const volume = sessions.filter((s) => weekStart(s.date) === start).reduce((n, s) => n + s.volume, 0)
    return { label: shortDate(isoDay(start)), volume, current: k === 0 }
  })
  const maxVol = Math.max(...weeks.map((w) => w.volume), 1)

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">Progress</h1>

      <nav aria-label="Pick a lift" className="flex flex-wrap gap-2">
        {chips.map((l) => (
          <Link
            key={l.name}
            href={`/dashboard/progress?lift=${encodeURIComponent(l.name)}`}
            aria-current={l.name === picked ? 'true' : undefined}
            className={`flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold ${
              l.name === picked ? 'border-accent bg-accent text-white' : 'border-line-strong text-ink'
            }`}
          >
            {l.name}
          </Link>
        ))}
      </nav>

      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[56px] font-extrabold leading-none text-ink tabular">
            {fmt(latest.weight)}<span className="ml-1 text-xl font-bold text-muted">LB</span>
          </p>
          {series.length > 1 && (
            <p className="mt-1 rounded-full bg-inset px-2.5 py-1 text-xs font-semibold text-insight tabular">
              {change >= 0 ? '+' : ''}{fmt(change)} lb since {shortDate(first.date)}
            </p>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">Latest top weight for {picked}</p>
        {series.length > 1 ? (
          <LiftChart points={recent} />
        ) : (
          <p className="mt-3 text-sm text-muted">Log this lift once more and a line will appear.</p>
        )}

        <table className="mt-3 w-full text-[15px] tabular">
          <caption className="sr-only">Top weight in each workout</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-1 font-medium">Workout</th>
              <th className="pb-1 text-right font-medium">Top set</th>
            </tr>
          </thead>
          <tbody>
            {[...recent].reverse().slice(0, 4).map((p, i) => (
              <tr key={`${p.date}-${i}`} className="border-t border-line">
                <td className="py-1.5 text-ink">{shortDate(p.date)}</td>
                <td className={`py-1.5 text-right ${i === 0 ? 'font-bold text-ink' : 'text-muted'}`}>{fmt(p.weight)} × {p.reps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4" aria-label="Weekly volume">
        <div className="flex items-baseline justify-between">
          <p className="label-caps">Weekly volume</p>
          <p className="text-xs text-muted">lb lifted</p>
        </div>
        <ul className="mt-3 flex h-28 items-end gap-2 border-b border-line">
          {weeks.map((w) => (
            <li key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] text-muted tabular">{w.volume > 0 ? `${Math.round(w.volume / 1000)}k` : '0'}</span>
              <span
                style={{ height: `${Math.max(3, Math.round((w.volume / maxVol) * 70))}%` }}
                className={`w-full max-w-10 rounded-t-[4px] ${w.current ? 'bg-accent' : 'bg-insight'}`}
              />
            </li>
          ))}
        </ul>
        <ul className="mt-1.5 flex gap-2 text-[11px] text-muted">
          {weeks.map((w) => (
            <li key={w.label} className="flex-1 text-center">{w.current ? 'So far' : w.label}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

import Link from 'next/link'
import { HelpTip } from '@/components/help-tip'
import type { KeyLift, LastSession, MuscleCount, RecordEntry, WeekVolume } from '@/lib/home'

// The detail cards under the red Today block on Home. Colors each have one job:
// gold = a record, blue = trends and the Coach, orange = streak (see globals.css).

const fmt = (n: number) => n.toLocaleString('en-US')

// "2026-10-27" -> "Oct 27" (fixed locale and UTC so server and browser agree)
export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// "Tue" for dates in the last 6 days, otherwise "Oct 27"
function sessionDay(date: string) {
  const days = Math.round((Date.now() - new Date(`${date}T12:00:00Z`).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days < 7) return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  return shortDate(date)
}

function kilo(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function TrophyIcon({ size = 16, strokeWidth = 2.4 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
    </svg>
  )
}

export function CheckIcon({ size = 20, strokeWidth = 3 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function FlameIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Key lifts: best weight, a small 5-week trend line, and the change written out
// ---------------------------------------------------------------------------
function Sparkline({ trend, label }: { trend: (number | null)[]; label: string }) {
  const pts = trend
    .map((v, i) => (v === null ? null : { i, v }))
    .filter((p): p is { i: number; v: number } => p !== null)
  if (pts.length < 2) {
    return <div className="mt-2 h-[26px] border-b-2 border-dashed border-line" role="img" aria-label={`${label}: not enough weeks yet for a trend`} />
  }
  const min = Math.min(...pts.map((p) => p.v))
  const max = Math.max(...pts.map((p) => p.v))
  const span = max - min || 1
  const path = pts
    .map((p, k) => {
      const x = 2 + (p.i / (trend.length - 1)) * 86
      const y = max === min ? 13 : 22 - ((p.v - min) / span) * 18
      return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" height="26" viewBox="0 0 90 26" preserveAspectRatio="none" role="img" aria-label={label} className="mt-2 block">
      <path d={path} fill="none" stroke="var(--color-insight)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function KeyLiftsCard({ lifts }: { lifts: KeyLift[] }) {
  if (lifts.length === 0) return null
  return (
    <section aria-label="Key lifts" className={`grid gap-2 ${lifts.length === 3 ? 'grid-cols-3' : lifts.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {lifts.map((l) => {
        const changeText =
          l.change > 0 ? `+${l.change} lb · 5 wk` : l.change < 0 ? `${l.change} lb · 5 wk` : 'No change · 5 wk'
        return (
          <div key={l.name} className="card min-w-0 p-3">
            <p className="flex items-center justify-between gap-1 text-[13px] text-muted">
              <span className="truncate" title={l.name}>{l.name}</span>
              {l.recentPr && (
                <span className="flex-none rounded-md bg-record px-1.5 text-[11px] font-bold text-on-record">PR</span>
              )}
            </p>
            <p className="mt-0.5 font-display text-[32px] font-extrabold leading-none tabular text-ink">
              {l.best}
              <span className="font-sans text-xs font-medium text-muted"> lb</span>
            </p>
            <Sparkline trend={l.trend} label={`${l.name} top weight over 5 weeks, ${changeText}`} />
            <p className={`mt-1 text-xs font-semibold ${l.change > 0 ? 'text-insight' : 'text-muted'}`}>{changeText}</p>
          </div>
        )
      })}
    </section>
  )
}

// ---------------------------------------------------------------------------
export function LastSessionCard({ session }: { session: LastSession }) {
  return (
    <Link href="/history" className="card block px-4 py-3.5">
      <span className="flex items-center justify-between">
        <span className="label-caps">Last session · {sessionDay(session.date)}</span>
        <Chevron />
      </span>
      <span className="mt-0.5 block font-display text-2xl font-bold leading-tight text-ink">{session.label ?? 'Workout'}</span>
      <span className="mt-2 flex flex-wrap items-center gap-2.5">
        <span className="tabular text-sm text-muted">
          {session.sets} sets · {fmt(session.volume)} lb{session.minutes ? ` · ${session.minutes} min` : ''}
        </span>
        {session.pr && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-record px-2.5 py-0.5 text-[13px] font-bold text-on-record">
            <TrophyIcon size={14} />
            PR · {session.pr.exercise} {session.pr.weight} × {session.pr.reps}
          </span>
        )}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Weekly volume: 6 weeks of total pounds, this week dashed while in progress
// ---------------------------------------------------------------------------
export function WeeklyVolumeCard({ weeks }: { weeks: WeekVolume[] }) {
  if (weeks.every((w) => w.volume === 0)) return null
  const last = weeks[weeks.length - 2]
  const before = weeks[weeks.length - 3]
  const pct = before && before.volume > 0 ? Math.round(((last.volume - before.volume) / before.volume) * 100) : null
  const max = Math.max(...weeks.map((w) => w.volume), 1)
  const summary = weeks.map((w, i) => `${i === weeks.length - 1 ? 'this week so far' : `week of ${shortDate(w.start)}`}: ${fmt(w.volume)} lb`).join(', ')
  return (
    <section className="card px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps">
            Lifted last week{' '}
            <HelpTip title="Weight lifted">
              <p>Your weekly total: weight x reps added up over every set, Monday to Sunday.</p>
              <p>The dashed bar is this week so far.</p>
            </HelpTip>
          </p>
          <p className="mt-0.5 font-display text-4xl font-extrabold leading-none tabular text-ink">
            {fmt(last.volume)} <span className="font-sans text-sm font-medium text-muted">lb</span>
          </p>
        </div>
        {pct !== null && (
          <span className="inline-flex flex-none items-center gap-1 rounded-full bg-insight/15 px-2.5 py-1 text-[13px] font-semibold text-insight">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={pct < 0 ? 'rotate-180' : ''}>
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
            {Math.abs(pct)}% vs week before
          </span>
        )}
      </div>
      <div role="img" aria-label={`Pounds lifted per week. ${summary}`} className="mt-3.5 grid h-[124px] grid-cols-6 items-end gap-2.5">
        {weeks.map((w, i) => {
          const h = Math.max(4, Math.round((w.volume / max) * 96))
          const isLast = i === weeks.length - 2
          return (
            <div key={w.start} className="flex h-full flex-col items-center justify-end gap-1">
              {w.volume > 0 && <span className={`text-[11px] ${isLast ? 'font-semibold text-ink' : 'text-muted'}`}>{kilo(w.volume)}</span>}
              {w.current ? (
                <span className="w-full rounded-md border-2 border-dashed border-insight" style={{ height: h }} />
              ) : w.volume === 0 ? (
                <span className="h-1 w-full rounded bg-line" />
              ) : (
                <span className={`w-full rounded-md bg-insight ${isLast ? '' : 'opacity-60'}`} style={{ height: h }} />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-6 gap-2.5 text-center text-xs text-muted" aria-hidden="true">
        {weeks.map((w, i) => (
          <span key={w.start} className={i === weeks.length - 2 ? 'font-semibold text-ink' : ''}>
            {i === weeks.length - 1 ? 'So far' : i === weeks.length - 2 ? 'Last' : shortDate(w.start)}
          </span>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
export function RecordsCard({ records }: { records: RecordEntry[] }) {
  return (
    <section className="card px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="label-caps">
          Records this month{' '}
          <HelpTip title="Records">
            <p>A record (PR) is any time you lift more weight on an exercise than you ever have before in the app.</p>
          </HelpTip>
        </p>
        <p className="flex items-center gap-1.5 font-display text-[28px] font-extrabold leading-none text-record">
          <TrophyIcon size={20} strokeWidth={2.2} />
          {records.length}
        </p>
      </div>
      {records.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">None yet this month. Beat your best weight on any lift to get one.</p>
      ) : (
        <ul className="mt-2.5">
          {records.slice(0, 3).map((r, i) => (
            <li key={`${r.exercise}-${r.date}-${i}`} className="flex items-center gap-3 border-t border-line py-2.5">
              <span className="h-2 w-2 flex-none rounded-full bg-record" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{r.exercise}</span>
              <span className="font-display text-xl font-bold tabular">{r.weight} × {r.reps}</span>
              <span className="w-12 text-right text-[13px] text-muted">{shortDate(r.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
const CHART = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4']

export function MusclesCard({ muscles }: { muscles: MuscleCount[] }) {
  if (muscles.length === 0) return null
  const total = muscles.reduce((s, m) => s + m.sets, 0)
  const max = Math.max(...muscles.map((m) => m.sets))
  return (
    <section className="card px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <p className="label-caps">
          Sets by muscle · last 7 days{' '}
          <HelpTip title="Sets by muscle">
            <p>How many sets you did for each part of the body this past week, sorted by the exercise names.</p>
            <p>Exercises the app can&apos;t sort yet are left out.</p>
          </HelpTip>
        </p>
        <p className="text-[13px] text-muted tabular">{total} sets</p>
      </div>
      <div className="mt-3 space-y-2.5">
        {muscles.map((m, i) => (
          <div key={m.group}>
            <p className="flex justify-between text-sm">
              <span>{m.group}</span>
              <span className="font-semibold tabular">{m.sets}</span>
            </p>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-inset">
              <div className={`h-2.5 rounded-full ${CHART[i % CHART.length]}`} style={{ width: `${Math.round((m.sets / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
export function CoachNoteCard({ note }: { note: string }) {
  return (
    <section className="card px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-insight/15 text-insight">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-insight">Coach note</p>
      </div>
      <p className="mt-2.5 text-[15px]">{note}</p>
      <Link href="/assistant" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-insight">
        Ask the coach
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </section>
  )
}

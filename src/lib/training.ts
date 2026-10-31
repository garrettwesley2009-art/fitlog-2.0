import { SupabaseClient } from '@supabase/supabase-js'

// Past training, worked out from logged sets only (workouts + sets). Used by History,
// Progress, Badges and Goals. Looks at the 200 most recent workouts.

export type SessionSet = { exercise: string; weight: number; reps: number; index: number }

export type Session = {
  id: string
  date: string // "YYYY-MM-DD"
  label: string | null
  sets: SessionSet[]
  volume: number
  // Exercises where this session beat the earlier best weight
  prs: { exercise: string; weight: number }[]
}

type Row = {
  id: string
  date: string
  user_program_days: { day_label: string } | null
  sets: { weight: number | null; reps: number | null; set_index: number | null; exercises: { name: string } | null }[]
}

export const DAY_MS = 86_400_000

export function weekStart(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS
}

export function isoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// Newest first. A workout only counts once at least one set was logged in it.
export async function getSessions(supabase: SupabaseClient, userId: string): Promise<Session[]> {
  const { data } = await supabase
    .from('workouts')
    .select('id, date, user_program_days(day_label), sets(weight, reps, set_index, exercises(name))')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = ((data ?? []) as unknown as Row[]).filter((w) => (w.sets?.length ?? 0) > 0)

  const sessions: Session[] = rows.map((w) => {
    const sets = w.sets
      .map((s, i) => ({
        exercise: s.exercises?.name ?? 'Unknown',
        weight: Number(s.weight) || 0,
        reps: s.reps ?? 0,
        index: s.set_index ?? i + 1,
      }))
      .sort((a, b) => a.index - b.index)
    return {
      id: w.id,
      date: w.date,
      label: w.user_program_days?.day_label ?? null,
      sets,
      volume: Math.round(sets.reduce((sum, s) => sum + s.weight * s.reps, 0)),
      prs: [],
    }
  })

  // Records: oldest to newest, note each time an exercise's heaviest weight goes up.
  // The very first time an exercise is logged is not a record.
  const best = new Map<string, number>()
  for (const s of [...sessions].reverse()) {
    const top = new Map<string, number>()
    for (const set of s.sets) top.set(set.exercise, Math.max(top.get(set.exercise) ?? 0, set.weight))
    for (const [exercise, weight] of top) {
      const prior = best.get(exercise)
      if (prior !== undefined && weight > prior) s.prs.push({ exercise, weight })
      if (prior === undefined || weight > prior) best.set(exercise, weight)
    }
  }
  return sessions
}

// Weeks in a row (Monday to Sunday) with at least `min` workouts. If this week is not
// finished yet it does not break the count.
export function weeksInARow(sessions: Session[], min = 1): number {
  const counts = new Map<number, number>()
  for (const s of sessions) counts.set(weekStart(s.date), (counts.get(weekStart(s.date)) ?? 0) + 1)
  const thisWeek = weekStart(todayStr())
  let cursor = (counts.get(thisWeek) ?? 0) >= min ? thisWeek : thisWeek - 7 * DAY_MS
  let n = 0
  while ((counts.get(cursor) ?? 0) >= min) {
    n++
    cursor -= 7 * DAY_MS
  }
  return n
}

export type LiftPoint = { date: string; weight: number; reps: number }

// Top set of each session for one exercise, oldest first.
export function liftSeries(sessions: Session[], exercise: string): LiftPoint[] {
  const points: LiftPoint[] = []
  for (const s of [...sessions].reverse()) {
    let top: SessionSet | null = null
    for (const set of s.sets) {
      if (set.exercise !== exercise || set.weight <= 0) continue
      if (!top || set.weight > top.weight || (set.weight === top.weight && set.reps > top.reps)) top = set
    }
    if (top) points.push({ date: s.date, weight: top.weight, reps: top.reps })
  }
  return points
}

// Exercises ordered by how many workouts they appear in, most trained first.
export function trainedLifts(sessions: Session[]): { name: string; sessions: number }[] {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    for (const name of new Set(s.sets.filter((x) => x.weight > 0).map((x) => x.exercise))) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, n]) => ({ name, sessions: n }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
}

export function bestWeight(sessions: Session[], exercise: string): number {
  let best = 0
  for (const s of sessions) for (const set of s.sets) if (set.exercise === exercise) best = Math.max(best, set.weight)
  return best
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ---------- Badges (worked out from the log, no extra table) ----------

export type Badge = {
  id: string
  title: string
  how: string // short line under the badge
  glyph: string // 1-3 characters shown in the circle
  tone: 'success' | 'record' | 'streak' | 'insight'
  have: number
  need: number
}

export function getBadges(sessions: Session[]): Badge[] {
  const workouts = sessions.length
  const prs = sessions.reduce((n, s) => n + s.prs.length, 0)
  const streak = weeksInARow(sessions)
  const byWeek = new Map<number, number>()
  for (const s of sessions) byWeek.set(weekStart(s.date), (byWeek.get(weekStart(s.date)) ?? 0) + 1)
  const busiestWeek = Math.max(0, ...byWeek.values())
  const lifts = trainedLifts(sessions).length

  return [
    { id: 'first', title: 'First workout', how: 'Log 1 workout', glyph: '1', tone: 'success', have: workouts, need: 1 },
    { id: 'week3', title: 'Three in a week', how: 'Train 3 times in one week', glyph: '3x', tone: 'success', have: busiestWeek, need: 3 },
    { id: 'pr', title: 'First PR', how: 'Beat your best weight', glyph: 'PR', tone: 'record', have: prs, need: 1 },
    { id: 'streak3', title: '3-week streak', how: '3 weeks in a row', glyph: '3', tone: 'streak', have: streak, need: 3 },
    { id: 'w10', title: '10 workouts', how: 'Log 10 workouts', glyph: '10', tone: 'success', have: workouts, need: 10 },
    { id: 'lifts5', title: 'Five lifts', how: 'Track 5 different lifts', glyph: '5', tone: 'insight', have: lifts, need: 5 },
    { id: 'streak5', title: '5-week streak', how: '5 weeks in a row', glyph: '5', tone: 'streak', have: streak, need: 5 },
    { id: 'pr5', title: '5 PRs', how: 'Set 5 records', glyph: 'PR', tone: 'record', have: prs, need: 5 },
    { id: 'w25', title: '25 workouts', how: 'Log 25 workouts', glyph: '25', tone: 'success', have: workouts, need: 25 },
    { id: 'w50', title: '50 workouts', how: 'Log 50 workouts', glyph: '50', tone: 'success', have: workouts, need: 50 },
  ]
}

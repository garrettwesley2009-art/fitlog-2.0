import { SupabaseClient } from '@supabase/supabase-js'

// Everything the Home page shows about past training, worked out from logged sets only.
// No extra tables: every number here comes from `workouts` and `sets`.

export type VolumePoint = { date: string; volume: number }

export type WeekVolume = {
  // Monday of that week, "YYYY-MM-DD"
  start: string
  volume: number
  // This week, still in progress
  current: boolean
}

export type KeyLift = {
  name: string
  // Heaviest weight ever logged (lb)
  best: number
  // Top weight per week for the last 5 weeks, oldest first (null = not trained that week)
  trend: (number | null)[]
  // Change in top weight across those weeks (lb)
  change: number
  // The best was set within the last 4 weeks and beat an earlier best
  recentPr: boolean
}

export type RecordEntry = { exercise: string; weight: number; reps: number; date: string }

export type LastSession = {
  date: string
  label: string | null
  sets: number
  volume: number
  minutes: number | null
  pr: RecordEntry | null
}

export type MuscleCount = { group: string; sets: number }

export type HomeStats = {
  // Calendar weeks in a row (Monday to Sunday) with at least one workout.
  streakWeeks: number
  trainedThisWeek: boolean
  // Total weight lifted (weight x reps) for the most recent workouts, oldest first.
  volumes: VolumePoint[]
  // Last 6 calendar weeks, oldest first; the last one is this week so far.
  weeks: WeekVolume[]
  keyLifts: KeyLift[]
  // Personal records set this calendar month, newest first
  monthRecords: RecordEntry[]
  lastSession: LastSession | null
  // Sets per muscle group over the last 7 days, biggest first
  muscles: MuscleCount[]
  coachNote: string | null
}

const DAY_MS = 86_400_000

// Monday of the week a "YYYY-MM-DD" date falls in, as a timestamp (UTC).
function weekStart(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const daysSinceMonday = (d.getUTCDay() + 6) % 7
  return d.getTime() - daysSinceMonday * DAY_MS
}

function isoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

// Rough muscle group from the exercise name. Names are free text (users add their own),
// so this matches common words. Anything unknown is left out of the chart.
const GROUPS: [string, RegExp][] = [
  ['Legs', /squat|lunge|leg|deadlift|rdl|hamstring|glute|hip thrust|calf|step[- ]?up|split|quad|sled|box jump|jump/i],
  ['Back', /row|pull|chin|lat|shrug|back|face pull/i],
  ['Chest', /bench|chest|fly|flye|push[- ]?up|dip|pec/i],
  ['Shoulders and arms', /press|shoulder|lateral|raise|curl|tricep|bicep|skull|extension|arm|delt/i],
  ['Core', /plank|crunch|ab |abs|core|sit[- ]?up|carry|pallof|hollow/i],
]

function muscleGroup(name: string): string | null {
  for (const [group, re] of GROUPS) if (re.test(name)) return group
  return null
}

type SetRow = { weight: number | null; reps: number | null; created_at: string | null; exercises: { name: string } | null }
type WorkoutRow = {
  id: string
  date: string
  created_at: string
  user_program_days: { day_label: string } | null
  sets: SetRow[]
}

// Looks at the 120 most recent workouts, which is plenty for the beta.
export async function getHomeStats(
  supabase: SupabaseClient,
  userId: string
): Promise<HomeStats> {
  const { data } = await supabase
    .from('workouts')
    .select('id, date, created_at, user_program_days(day_label), sets(weight, reps, created_at, exercises(name))')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(120)

  // A workout only counts once at least one set was logged in it. Newest first.
  const workouts = ((data ?? []) as unknown as WorkoutRow[]).filter((w) => (w.sets?.length ?? 0) > 0)

  const today = new Date().toISOString().slice(0, 10)
  const thisWeek = weekStart(today)

  // ---- Streak: consecutive weeks with a workout. If you haven't trained yet this
  // week, the streak is still alive and counts from last week.
  const weeksWithWorkouts = new Set(workouts.map((w) => weekStart(w.date)))
  const trainedThisWeek = weeksWithWorkouts.has(thisWeek)
  let cursor = trainedThisWeek ? thisWeek : thisWeek - 7 * DAY_MS
  let streakWeeks = 0
  while (weeksWithWorkouts.has(cursor)) {
    streakWeeks++
    cursor -= 7 * DAY_MS
  }

  const volumeOf = (w: WorkoutRow) =>
    Math.round(w.sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (s.reps ?? 0), 0))

  const volumes = workouts
    .slice(0, 7)
    .map((w) => ({ date: w.date, volume: volumeOf(w) }))
    .reverse()

  // ---- Weekly volume, last 6 calendar weeks
  const weeks: WeekVolume[] = []
  for (let k = 5; k >= 0; k--) {
    const start = thisWeek - k * 7 * DAY_MS
    const volume = workouts.filter((w) => weekStart(w.date) === start).reduce((sum, w) => sum + volumeOf(w), 0)
    weeks.push({ start: isoDay(start), volume, current: k === 0 })
  }

  // ---- Records: walk every set oldest to newest and note each time an exercise's
  // heaviest weight goes up. The very first time an exercise is logged is not a record.
  const chronological = [...workouts].reverse()
  const bestSoFar = new Map<string, number>()
  const records: (RecordEntry & { workoutId: string })[] = []
  const allTimeBest = new Map<string, { weight: number; date: string; beatEarlier: boolean }>()
  for (const w of chronological) {
    const topToday = new Map<string, { weight: number; reps: number }>()
    for (const s of w.sets) {
      const name = s.exercises?.name
      const weight = Number(s.weight) || 0
      if (!name || weight <= 0) continue
      const prev = topToday.get(name)
      if (!prev || weight > prev.weight) topToday.set(name, { weight, reps: s.reps ?? 0 })
    }
    for (const [name, top] of topToday) {
      const before = bestSoFar.get(name)
      if (before !== undefined && top.weight > before) {
        records.push({ exercise: name, weight: top.weight, reps: top.reps, date: w.date, workoutId: w.id })
      }
      if (before === undefined || top.weight > before) {
        bestSoFar.set(name, top.weight)
        allTimeBest.set(name, { weight: top.weight, date: w.date, beatEarlier: before !== undefined })
      }
    }
  }
  const month = today.slice(0, 7)
  const monthRecords = records
    .filter((r) => r.date.slice(0, 7) === month)
    .reverse()
    .map((r) => ({ exercise: r.exercise, weight: r.weight, reps: r.reps, date: r.date }))

  // ---- Key lifts: the 3 weighted exercises logged most often in the last 8 weeks
  const eightWeeksAgo = thisWeek - 7 * 7 * DAY_MS
  const frequency = new Map<string, number>()
  for (const w of workouts) {
    if (weekStart(w.date) < eightWeeksAgo) continue
    const seen = new Set<string>()
    for (const s of w.sets) {
      const name = s.exercises?.name
      if (!name || !(Number(s.weight) > 0) || seen.has(name)) continue
      seen.add(name)
      frequency.set(name, (frequency.get(name) ?? 0) + 1)
    }
  }
  const fourWeeksAgo = isoDay(thisWeek - 3 * 7 * DAY_MS)
  const keyLifts: KeyLift[] = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => {
      const trend: (number | null)[] = []
      for (let k = 4; k >= 0; k--) {
        const start = thisWeek - k * 7 * DAY_MS
        let top: number | null = null
        for (const w of workouts) {
          if (weekStart(w.date) !== start) continue
          for (const s of w.sets) {
            const weight = Number(s.weight) || 0
            if (s.exercises?.name === name && weight > 0 && (top === null || weight > top)) top = weight
          }
        }
        trend.push(top)
      }
      const known = trend.filter((t): t is number => t !== null)
      const best = allTimeBest.get(name)
      return {
        name,
        best: best?.weight ?? 0,
        trend,
        change: known.length >= 2 ? known[known.length - 1] - known[0] : 0,
        recentPr: Boolean(best && best.beatEarlier && best.date >= fourWeeksAgo),
      }
    })

  // ---- Last session
  let lastSession: LastSession | null = null
  const latest = workouts[0]
  if (latest) {
    const times = latest.sets
      .map((s) => (s.created_at ? new Date(s.created_at).getTime() : NaN))
      .filter((t) => !Number.isNaN(t))
    const minutes = times.length >= 2 ? Math.round((Math.max(...times) - Math.min(...times)) / 60000) : null
    const pr = [...records].reverse().find((r) => r.workoutId === latest.id)
    lastSession = {
      date: latest.date,
      label: latest.user_program_days?.day_label ?? null,
      sets: latest.sets.length,
      volume: volumeOf(latest),
      minutes: minutes && minutes > 0 ? minutes : null,
      pr: pr ? { exercise: pr.exercise, weight: pr.weight, reps: pr.reps, date: pr.date } : null,
    }
  }

  // ---- Sets per muscle group, last 7 days
  const weekAgo = isoDay(new Date(`${today}T00:00:00Z`).getTime() - 6 * DAY_MS)
  const byGroup = new Map<string, number>()
  for (const w of workouts) {
    if (w.date < weekAgo) continue
    for (const s of w.sets) {
      const group = s.exercises?.name ? muscleGroup(s.exercises.name) : null
      if (group) byGroup.set(group, (byGroup.get(group) ?? 0) + 1)
    }
  }
  const muscles = [...byGroup.entries()]
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 4)

  // ---- Coach note: one plain tip worked out from the numbers above (no AI call)
  let coachNote: string | null = null
  const climbing = keyLifts.find((l) => {
    const known = l.trend.filter((t): t is number => t !== null)
    if (known.length < 3) return false
    const lastThree = known.slice(-3)
    return lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2]
  })
  const stalled = keyLifts.find((l) => l.trend.filter((t) => t !== null).length >= 4 && l.change === 0)
  if (climbing) {
    coachNote = `Your ${climbing.name.toLowerCase()} has gone up three weeks in a row. Keep the same plan and add a little weight when the reps feel fast.`
  } else if (stalled) {
    coachNote = `Your ${stalled.name.toLowerCase()} has held at ${stalled.best} lb for a while. Ask the coach about a small change, like a rep range or a variation.`
  } else if (streakWeeks >= 3) {
    coachNote = `${streakWeeks} weeks in a row. Consistency is what builds strength, so keep showing up.`
  } else if (workouts.length > 0 && !trainedThisWeek) {
    coachNote = 'No workout yet this week. Even a short session keeps your streak alive.'
  }

  return { streakWeeks, trainedThisWeek, volumes, weeks, keyLifts, monthRecords, lastSession, muscles, coachNote }
}

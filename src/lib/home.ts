import { SupabaseClient } from '@supabase/supabase-js'

export type VolumePoint = { date: string; volume: number }

export type HomeStats = {
  // Calendar weeks in a row (Monday to Sunday) with at least one workout.
  streakWeeks: number
  trainedThisWeek: boolean
  // Total weight lifted (weight x reps) for the most recent workouts, oldest first.
  volumes: VolumePoint[]
}

const DAY_MS = 86_400_000

// Monday of the week a "YYYY-MM-DD" date falls in, as a timestamp (UTC).
function weekStart(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const daysSinceMonday = (d.getUTCDay() + 6) % 7
  return d.getTime() - daysSinceMonday * DAY_MS
}

// Everything the Home page needs about past training, from one query.
// Looks at the 120 most recent workouts, which is plenty for the beta.
export async function getHomeStats(
  supabase: SupabaseClient,
  userId: string
): Promise<HomeStats> {
  const { data } = await supabase
    .from('workouts')
    .select('id, date, sets(weight, reps)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(120)

  type Row = { id: string; date: string; sets: { weight: number | null; reps: number | null }[] }

  // A workout only counts once at least one set was logged in it.
  const workouts = ((data ?? []) as Row[]).filter((w) => (w.sets?.length ?? 0) > 0)

  // Streak: consecutive weeks with a workout. If you haven't trained yet this
  // week, the streak is still alive and counts from last week.
  const weeksWithWorkouts = new Set(workouts.map((w) => weekStart(w.date)))
  const thisWeek = weekStart(new Date().toISOString().slice(0, 10))
  const trainedThisWeek = weeksWithWorkouts.has(thisWeek)

  let cursor = trainedThisWeek ? thisWeek : thisWeek - 7 * DAY_MS
  let streakWeeks = 0
  while (weeksWithWorkouts.has(cursor)) {
    streakWeeks++
    cursor -= 7 * DAY_MS
  }

  const volumes = workouts
    .slice(0, 7)
    .map((w) => ({
      date: w.date,
      volume: Math.round(
        w.sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0)
      ),
    }))
    .reverse()

  return { streakWeeks, trainedThisWeek, volumes }
}

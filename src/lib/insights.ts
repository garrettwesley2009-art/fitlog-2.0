// What the app learns from a member's own log. No AI call: plain rules over logged sets,
// feedback and RPE. Used by the Log page, the Home coach note and the AI Coach's context.
//
// Head coach rules this follows:
//   - "If someone's progress stalls and they have been training hard, recommend a deload week."
//   - Muscle work should be RPE 9-10; sets far below that are leaving growth on the table.

import { estimateMax } from '@/lib/log-plan'

export type InsightSet = { weight: number | null; reps: number | null; rpe: number | null }
// One workout's sets for one exercise.
export type InsightSession = { date: string; sets: InsightSet[] }

export type InsightKind = 'deload' | 'stalled-easy' | 'stalled-no-rpe' | 'too-easy'
export type Insight = { kind: InsightKind; exercise: string; text: string }

export const DELOAD_HOW =
  'For one week, keep the same exercises but do about half the sets, about 10% lighter, stopping with 3 reps left (RPE 7). Then go back to your plan.'

const STALL_SESSIONS = 3

// Best effort of a session: the highest estimated max of any set (or most reps, for bodyweight work).
function performance(s: InsightSession): number {
  let best = 0
  for (const set of s.sets) {
    const w = Number(set.weight) || 0
    const r = Number(set.reps) || 0
    if (r <= 0) continue
    best = Math.max(best, w > 0 ? estimateMax(w, r) : r)
  }
  return best
}

function avgRpe(sessions: InsightSession[]): number | null {
  const all = sessions.flatMap((s) => s.sets.map((x) => x.rpe)).filter((r): r is number => r != null && r > 0)
  return all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : null
}

function avgReps(sessions: InsightSession[]): number {
  const all = sessions.flatMap((s) => s.sets.map((x) => Number(x.reps) || 0)).filter((r) => r > 0)
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0
}

// sessions: newest first. Returns at most one insight for the exercise.
export function exerciseInsight(exercise: string, sessions: InsightSession[]): Insight | null {
  const usable = sessions.filter((s) => performance(s) > 0)

  // Stalled: the best of the last 3 sessions is no better than the session before them.
  if (usable.length >= STALL_SESSIONS + 1) {
    const recent = usable.slice(0, STALL_SESSIONS)
    const before = usable[STALL_SESSIONS]
    if (Math.max(...recent.map(performance)) <= performance(before)) {
      const rpe = avgRpe(recent)
      if (rpe == null) {
        return {
          kind: 'stalled-no-rpe',
          exercise,
          text: `${exercise} has not gone up in your last ${STALL_SESSIONS} sessions. Log the RPE of each set so the app can tell whether you need a deload or a harder push.`,
        }
      }
      if (rpe >= 8.5) {
        return {
          kind: 'deload',
          exercise,
          text: `${exercise} has not gone up in your last ${STALL_SESSIONS} sessions, and they were hard (about RPE ${rpe}). Time for a deload week.`,
        }
      }
      return {
        kind: 'stalled-easy',
        exercise,
        text: `${exercise} has not gone up in your last ${STALL_SESSIONS} sessions, but the sets were only about RPE ${rpe}. Push closer to your target RPE before changing anything.`,
      }
    }
  }

  // Too easy: muscle work (more than 5 reps) logged at RPE 7.5 or less in the last 2 sessions.
  const lastTwo = usable.slice(0, 2)
  if (lastTwo.length === 2) {
    const rpe = avgRpe(lastTwo)
    if (rpe != null && rpe <= 7.5 && avgReps(lastTwo) > 5) {
      return {
        kind: 'too-easy',
        exercise,
        text: `Your last two ${exercise} sessions were about RPE ${rpe}. For muscle growth the coach wants RPE 9-10: one rep or none left in the tank.`,
      }
    }
  }
  return null
}

export type WorkoutLike = {
  date: string
  sets: { weight: number | null; reps: number | null; rpe?: number | null; exercise: string }[]
}

// Groups workouts (newest first) into per-exercise sessions (newest first).
export function sessionsByExercise(workouts: WorkoutLike[]): Map<string, InsightSession[]> {
  const out = new Map<string, InsightSession[]>()
  for (const w of workouts) {
    const byEx = new Map<string, InsightSet[]>()
    for (const s of w.sets) {
      if (!s.exercise) continue
      const list = byEx.get(s.exercise) ?? []
      list.push({ weight: s.weight, reps: s.reps, rpe: s.rpe ?? null })
      byEx.set(s.exercise, list)
    }
    for (const [ex, sets] of byEx) {
      const list = out.get(ex) ?? []
      list.push({ date: w.date, sets })
      out.set(ex, list)
    }
  }
  return out
}

export function allInsights(workouts: WorkoutLike[]): Insight[] {
  const out: Insight[] = []
  for (const [ex, sessions] of sessionsByExercise(workouts)) {
    const i = exerciseInsight(ex, sessions)
    if (i) out.push(i)
  }
  return out
}

// Exercises skipped or swapped out at least twice, most first.
export type AvoidedExercise = { exercise: string; skipped: number; swapped: number }

export function avoidedExercises(rows: { exercise_name: string; status: string }[]): AvoidedExercise[] {
  const counts = new Map<string, AvoidedExercise>()
  for (const r of rows) {
    if (r.status !== 'skipped' && r.status !== 'swapped') continue
    const c = counts.get(r.exercise_name) ?? { exercise: r.exercise_name, skipped: 0, swapped: 0 }
    if (r.status === 'skipped') c.skipped++
    else c.swapped++
    counts.set(r.exercise_name, c)
  }
  return [...counts.values()]
    .filter((c) => c.skipped + c.swapped >= 2)
    .sort((a, b) => b.skipped + b.swapped - (a.skipped + a.swapped))
}

// A short plain-text history for the AI Coach: the most-trained lifts with their best set,
// direction and average RPE, plus anything the rules above noticed.
export function trainingSummary(workouts: WorkoutLike[], avoided: AvoidedExercise[], limit = 8): string {
  const byEx = sessionsByExercise(workouts)
  const lines: string[] = []
  const lifts = [...byEx.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, limit)
  for (const [ex, sessions] of lifts) {
    let bestSet: InsightSet | null = null
    let bestEst = 0
    for (const s of sessions) {
      for (const set of s.sets) {
        const est = estimateMax(Number(set.weight) || 0, Number(set.reps) || 0)
        if (est > bestEst) {
          bestEst = est
          bestSet = set
        }
      }
    }
    const recent = sessions.slice(0, 4).map(performance).filter((p) => p > 0)
    const dir =
      recent.length >= 2
        ? recent[0] > recent[recent.length - 1]
          ? 'going up'
          : recent[0] < recent[recent.length - 1]
            ? 'going down'
            : 'flat'
        : 'too new to tell'
    const rpe = avgRpe(sessions.slice(0, 3))
    const best = bestSet ? `best set ${bestSet.weight} x ${bestSet.reps} (estimated max ${bestEst} lb)` : 'bodyweight'
    lines.push(`- ${ex}: ${sessions.length} sessions, ${best}, last 4 sessions ${dir}${rpe != null ? `, recent RPE about ${rpe}` : ', no RPE logged'}`)
  }
  const notes = allInsights(workouts).map((i) => `- ${i.text}`)
  const avoidedLines = avoided
    .slice(0, 6)
    .map((a) => `- ${a.exercise}: skipped ${a.skipped} and swapped out ${a.swapped} times lately (replace it in new programs)`)
  const parts = []
  if (lines.length) parts.push(`Most-trained lifts (from their log):\n${lines.join('\n')}`)
  if (notes.length) parts.push(`What the app noticed:\n${notes.join('\n')}`)
  if (avoidedLines.length) parts.push(`Exercises they keep skipping or swapping:\n${avoidedLines.join('\n')}`)
  return parts.join('\n\n')
}

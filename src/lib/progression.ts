// The coach's progression rules (from the coach's training guidelines doc), as plain code.
// No AI call: it is free, predictable, and works offline.
//
// Two kinds of work, told apart by the prescribed RPE:
//   - Strength      (RPE 7-8, usually 3-5 reps): add weight week to week while RPE stays in range.
//                    If RPE goes above the range, hold the weight until it is back in range.
//   - Hypertrophy   (RPE 9-10, a rep range like 10-15): add 1 rep per set each week at the same RPE.
//                    When every set hits the top of the range, add 5 lb and go back to the bottom.
//                    If reps fall below the range, the weight is too heavy: take 5 lb off.
//
// RPE 10 = 0 reps left, RPE 9 = 1 rep left, and so on.

export type Kind = 'strength' | 'hypertrophy'

export type Prescription = {
  sets: number
  repMin: number
  repMax: number
  rpeLow: number
  rpeHigh: number
  kind: Kind
  increment: number // lb added when it is time to go up
}

export type DoneSet = { weight: number | null; reps: number | null; rpe: number | null }

export type NextReason =
  | 'first-time' // nothing logged yet for this exercise
  | 'add-rep' // hypertrophy: same weight, +1 rep
  | 'add-weight' // top of range (hypertrophy) or RPE in range (strength)
  | 'too-heavy' // hypertrophy: fell below the range
  | 'hold' // strength: RPE above range, or reps missed
  | 'need-rpe' // strength: no RPE logged, so the app cannot tell if it is safe to add weight

export type NextTarget = {
  reason: NextReason
  weight: number | null
  reps: number[] // one per set
  headline: string // short tag for the Log page, e.g. "+1 rep from last week"
  detail: string // one plain sentence
  tip: string | null // optional nudge, e.g. "You had reps left: go to RPE 9-10"
}

export const DEFAULT_INCREMENT = 5

// "RPE 9-10" / "@9" / "rpe 8" in a text, or a bare "9-10" when the text is just the RPE column.
export function parseRpe(text: string | null | undefined): { low: number; high: number } | null {
  if (!text) return null
  const m =
    text.match(/rpe\s*@?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/i) ??
    text.trim().match(/^@?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?$/)
  if (!m) return null
  const low = Number(m[1])
  const high = m[2] !== undefined ? Number(m[2]) : low
  if (!(low >= 1 && high <= 10 && low <= high)) return null
  return { low, high }
}

// Builds the prescription from what a program already stores (target_sets, target_reps, notes),
// plus an optional target_rpe text. Programs written before RPE existed still work: the kind and
// RPE are inferred from the reps (5 or fewer at the top = strength 7-8, otherwise hypertrophy 9-10).
export function toPrescription(
  targetSets: number | null,
  targetReps: string | null,
  targetRpe: string | null,
  notes: string | null
): Prescription | null {
  if (!targetReps || /[@/]/.test(targetReps)) return null // per-set lists and percent work are not handled here
  const m = targetReps.match(/^\s*(\d+)(?:\s*-\s*(\d+))?\s*F?\s*$/i)
  if (!m) return null
  const repMin = Number(m[1])
  const repMax = m[2] !== undefined ? Number(m[2]) : repMin
  const rpe = parseRpe(targetRpe) ?? parseRpe(notes)
  // RPE 7-8 is strength work. RPE 10 on 1-3 reps is a max attempt, also strength.
  const kind: Kind = rpe
    ? rpe.high <= 8 || (rpe.low === 10 && repMax <= 3)
      ? 'strength'
      : 'hypertrophy'
    : repMax <= 5
      ? 'strength'
      : 'hypertrophy'
  const fallback = kind === 'strength' ? { low: 7, high: 8 } : { low: 9, high: 10 }
  return {
    sets: Math.max(1, targetSets ?? 1),
    repMin,
    repMax,
    rpeLow: (rpe ?? fallback).low,
    rpeHigh: (rpe ?? fallback).high,
    kind,
    increment: DEFAULT_INCREMENT,
  }
}

const range = (a: number, b: number) => (a === b ? `${a}` : `${a}-${b}`)

// The working weight from last time: the weight used on the most sets (ties: the heavier one).
function workingWeight(sets: DoneSet[]): number | null {
  const counts = new Map<number, number>()
  for (const s of sets) if (s.weight && s.weight > 0) counts.set(s.weight, (counts.get(s.weight) ?? 0) + 1)
  let best: number | null = null
  for (const [w, n] of counts) if (best === null || n > counts.get(best)! || (n === counts.get(best)! && w > best)) best = w
  return best
}

export function nextTarget(p: Prescription, last: DoneSet[] | null | undefined): NextTarget {
  const logged = (last ?? []).filter((s) => (s.reps ?? 0) > 0)
  const weight = workingWeight(logged)
  const rpeText = `RPE ${range(p.rpeLow, p.rpeHigh)}`

  if (logged.length === 0 || weight === null) {
    return {
      reason: 'first-time',
      weight: null,
      reps: Array(p.sets).fill(p.repMin),
      headline: 'First time',
      detail: `Pick a weight you can do for ${range(p.repMin, p.repMax)} reps at ${rpeText}.`,
      tip: null,
    }
  }

  const atWeight = logged.filter((s) => s.weight === weight)
  const repsAt = (i: number) => (logged[i] ?? logged[logged.length - 1]).reps ?? 0
  const rpes = logged.map((s) => s.rpe).filter((r): r is number => r != null)
  const topRpe = rpes.length ? Math.max(...rpes) : null
  const lowRpe = rpes.length ? Math.min(...rpes) : null

  if (p.kind === 'hypertrophy') {
    const allAtTop = atWeight.length >= p.sets && atWeight.every((s) => (s.reps ?? 0) >= p.repMax)
    if (allAtTop) {
      return {
        reason: 'add-weight',
        weight: weight + p.increment,
        reps: Array(p.sets).fill(p.repMin),
        headline: `+${p.increment} lb`,
        detail: `You hit ${p.repMax} on every set. Add ${p.increment} lb and start back at ${p.repMin} reps.`,
        tip: null,
      }
    }
    if (logged.some((s) => (s.reps ?? 0) < p.repMin && (s.rpe == null || s.rpe >= p.rpeLow))) {
      return {
        reason: 'too-heavy',
        weight: Math.max(0, weight - p.increment),
        reps: Array(p.sets).fill(p.repMin),
        headline: `-${p.increment} lb`,
        detail: `Some sets fell under ${p.repMin} reps. Drop ${p.increment} lb so every set lands in ${range(p.repMin, p.repMax)}.`,
        tip: null,
      }
    }
    const reps = Array.from({ length: p.sets }, (_, i) => Math.min(p.repMax, Math.max(p.repMin, repsAt(i) + 1)))
    return {
      reason: 'add-rep',
      weight,
      reps,
      headline: '+1 rep from last week',
      detail: `Same weight, one more rep on each set, still at ${rpeText}.`,
      tip:
        lowRpe != null && lowRpe < p.rpeLow
          ? `Last time some sets were RPE ${lowRpe}, so you had reps left. Take every set to ${rpeText}.`
          : rpes.length === 0
            ? 'Log the RPE of each set so the app can tell how hard it was.'
            : null,
    }
  }

  // Strength
  const missed = logged.some((s) => (s.reps ?? 0) < p.repMin)
  const repsAsLast = Array.from({ length: p.sets }, (_, i) => Math.max(p.repMin, Math.min(p.repMax, repsAt(i))))
  if (topRpe === null) {
    return {
      reason: 'need-rpe',
      weight,
      reps: repsAsLast,
      headline: 'Same weight',
      detail: 'No RPE was logged last time, so the app is holding the weight.',
      tip: `Log the RPE of each set. When it stays at ${rpeText}, the weight goes up.`,
    }
  }
  if (missed || topRpe > p.rpeHigh) {
    return {
      reason: 'hold',
      weight,
      reps: repsAsLast,
      headline: 'Hold the weight',
      detail: missed
        ? `Some sets came up short. Stay at ${weight} lb until every set is clean.`
        : `Last time hit RPE ${topRpe}. Stay at ${weight} lb until it is back to ${rpeText}.`,
      tip: null,
    }
  }
  return {
    reason: 'add-weight',
    weight: weight + p.increment,
    reps: repsAsLast,
    headline: `+${p.increment} lb`,
    detail: `RPE stayed at ${range(lowRpe ?? topRpe, topRpe)}. Add ${p.increment} lb.`,
    tip: null,
  }
}

// RPE chip labels for the Log page: "9" with "1 left" underneath.
export const RPE_CHOICES = [6, 7, 8, 9, 10].map((r) => ({ rpe: r, left: 10 - r }))

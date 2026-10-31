// The head coach's programming rules as quick checks, shown as gentle warnings on the Build page.
// They never block saving: "everything in strength and hypertrophy is a spectrum, not hard rules."
// The same rules are given to the AI Coach in coach-guidelines.ts.

import { parseRpe } from '@/lib/progression'

type Ex = { target_sets: number | null; target_reps: string | null; target_rpe?: string | null; notes?: string | null }

function range(text: string | null | undefined): { lo: number; hi: number } | null {
  const m = String(text ?? '').match(/^\s*(\d+)(?:\s*-\s*(\d+))?\s*F?\s*$/i)
  return m ? { lo: Number(m[1]), hi: m[2] !== undefined ? Number(m[2]) : Number(m[1]) } : null
}

export function isStrength(ex: Ex): boolean {
  const rpe = parseRpe(ex.target_rpe ?? null)
  if (rpe) return rpe.high <= 8 || (rpe.low === 10 && (range(ex.target_reps)?.hi ?? 99) <= 3)
  const reps = range(ex.target_reps)
  return reps ? reps.hi <= 5 : false
}

// Plain-language problems with one exercise, or an empty list.
export function exerciseIssues(ex: Ex): string[] {
  const reps = ex.target_reps ?? ''
  // Per-set lists ("8/8/6/6F") and percent work ("3@80") are written by hand on purpose.
  if (/[/@]/.test(reps)) return []
  const out: string[] = []
  const r = range(reps)
  const rpe = parseRpe(ex.target_rpe ?? null)
  const sets = ex.target_sets ?? 0
  if (!rpe) out.push('Add a target RPE (strength 7-8, muscle 9-10).')
  if (isStrength(ex)) {
    if (sets && (sets < 3 || sets > 5)) out.push('Strength work: 3-5 sets.')
    if (r && (r.lo < 3 || r.hi > 5) && !(rpe && rpe.low === 10)) out.push('Strength work: 3-5 reps.')
  } else {
    if (sets > 4) out.push('Muscle work: 1-4 sets per exercise.')
    if (r && (r.lo < 5 || r.hi > 30)) out.push('Muscle work: 5-30 reps.')
    if (r && r.hi - r.lo < 2) out.push('Use a wider range, like 6-10, so there is room to land near failure.')
    if (rpe && rpe.low < 9 && !/injur|pain|sore|protect/i.test(ex.notes ?? '')) out.push('Muscle work: RPE 9-10 unless there is an injury.')
  }
  return out
}

// How the Log page will move this exercise forward, in one line.
export function progressionHint(ex: Ex): string | null {
  const r = range(ex.target_reps)
  if (!r || /[/@]/.test(ex.target_reps ?? '')) return null
  return isStrength(ex)
    ? '+5 lb a week while RPE stays in range'
    : r.lo === r.hi
      ? null
      : `+1 rep a week up to ${r.hi}, then +5 lb and back to ${r.lo}`
}

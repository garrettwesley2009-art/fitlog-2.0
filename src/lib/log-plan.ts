// Helpers that turn a program exercise (target_reps text + notes text) into
// something the Log page can step through one set at a time.

// ---------------------------------------------------------------------------
// Reps per set
//
//   "8/8/6/6F"  with 4 sets -> 8, 8, 6, 6 (last one to failure)
//   "12"        with 3 sets -> 12, 12, 12
//   "8-10"      with 3 sets -> 8, 8, 8 (the low end of a range)
//   null                    -> empty sets
// ---------------------------------------------------------------------------
export type SetGoal = { reps: number | null; toFailure: boolean }

function parsePart(part: string): SetGoal {
  const text = part.trim()
  const match = text.match(/\d+/)
  return {
    reps: match ? Number(match[0]) : null,
    toFailure: /f$/i.test(text),
  }
}

export function parseSetGoals(targetReps: string | null, targetSets: number | null): SetGoal[] {
  const parts = (targetReps ?? '')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map(parsePart)

  const count = Math.max(1, targetSets ?? parts.length)

  if (parts.length === 0) {
    return Array.from({ length: count }, () => ({ reps: null, toFailure: false }))
  }

  // One number for every set ("12") or a per-set list ("8/8/6/6F").
  return Array.from({ length: count }, (_, i) =>
    parts.length === 1 ? parts[0] : (parts[i] ?? parts[parts.length - 1])
  )
}

// ---------------------------------------------------------------------------
// Rest after each set, in seconds, read from the plan's notes text.
//
//   "Rest 75/120/150/150 sec"            -> 75, 120, 150, 150
//   "Rest 90 sec after sets 3 and 6"     -> 0, 0, 90, 0, 0, 90 (drop sets)
//   "Rest 150 sec between sets"          -> 150 after every set
//   "Pushdown has no rest"               -> 0 everywhere (superset)
//   no rest information at all           -> DEFAULT_REST after every set
//
// The last set never rests (the exercise is over).
// ---------------------------------------------------------------------------
export const DEFAULT_REST = 90

export function parseRests(notes: string | null, setCount: number): number[] {
  const rests = Array.from({ length: setCount }, () => 0)
  const text = notes ?? ''

  const after = text.match(
    /rest\s+(\d+)\s*sec\w*\s+after\s+sets?\s+(\d+(?:\s*(?:,|and|&)\s*\d+)*)/i
  )
  const list = text.match(/rest\s+(\d+(?:\s*\/\s*\d+)+)\s*sec/i)
  const single = text.match(/rest\s+(\d+)\s*sec/i)

  if (after) {
    const secs = Number(after[1])
    for (const n of after[2].match(/\d+/g) ?? []) {
      const i = Number(n) - 1
      if (i >= 0 && i < setCount) rests[i] = secs
    }
  } else if (list) {
    const values = list[1].split('/').map((v) => Number(v.trim()))
    for (let i = 0; i < setCount; i++) rests[i] = values[i] ?? 0
  } else if (single) {
    rests.fill(Number(single[1]))
  } else if (!/no rest/i.test(text)) {
    rests.fill(DEFAULT_REST)
  }

  if (setCount > 0) rests[setCount - 1] = 0
  return rests
}

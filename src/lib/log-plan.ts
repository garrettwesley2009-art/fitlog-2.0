// Helpers that turn a program exercise (target_reps text + notes text) into
// something the Log page can step through one set at a time.

// ---------------------------------------------------------------------------
// Reps per set
//
//   "8/8/6/6F"  with 4 sets -> 8, 8, 6, 6 (last one to failure)
//   "12"        with 3 sets -> 12, 12, 12
//   "8-10"      with 3 sets -> 8, 8, 8 (the low end of a range)
//   null                    -> empty sets
//
// A set can also carry a percent of the person's max after an @:
//   "2@85/2@85/1@90/1@90/1@95"  -> 2 reps at 85%, 2 at 85%, 1 at 90%, ...
//   "3-6@75-80"  with 4 sets    -> 3 reps at 75-80% for every set
//   "1/1/3@70"                  -> percent only where it is written
// ---------------------------------------------------------------------------
export type SetGoal = {
  reps: number | null
  toFailure: boolean
  // Reps as written ("3-6"), for display. The number above is the low end.
  repsText: string
  // Percent of max as written ("85" or "75-80"), or null.
  percent: string | null
}

function parsePart(part: string): SetGoal {
  const text = part.trim()
  const toFailure = /f$/i.test(text)
  const body = toFailure ? text.slice(0, -1).trim() : text
  const at = body.indexOf('@')
  const repsPart = (at >= 0 ? body.slice(0, at) : body).trim()
  const pctPart = at >= 0 ? body.slice(at + 1) : ''
  const match = repsPart.match(/\d+/)
  const pct = pctPart.match(/\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?/)
  return {
    reps: match ? Number(match[0]) : null,
    toFailure,
    repsText: repsPart,
    percent: pct ? pct[0].replace(/\s+/g, '') : null,
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
    return Array.from({ length: count }, () => ({ reps: null, toFailure: false, repsText: '', percent: null }))
  }

  // One number for every set ("12") or a per-set list ("8/8/6/6F").
  return Array.from({ length: count }, (_, i) =>
    parts.length === 1 ? parts[0] : (parts[i] ?? parts[parts.length - 1])
  )
}

// ---------------------------------------------------------------------------
// Percent summary, for exercises whose plan has percents.
//
//   2@85/2@85/1@90/1@90/1@95  ->  [{sets 2, reps "2", @85}, {sets 2, reps "1", @90}, {sets 1, reps "1", @95}]
//   shown as "2x2 @85 then 2x1 @90 then 1x1 @95"
// ---------------------------------------------------------------------------
export type PercentSegment = { sets: number; reps: string; toFailure: boolean; percent: string | null }

export function hasPercent(goals: SetGoal[]): boolean {
  return goals.some((g) => g.percent)
}

export function percentSegments(goals: SetGoal[]): PercentSegment[] {
  const out: PercentSegment[] = []
  for (const g of goals) {
    const last = out[out.length - 1]
    const reps = g.repsText || (g.reps !== null ? String(g.reps) : '-')
    if (last && last.reps === reps && last.percent === g.percent && last.toFailure === g.toFailure) {
      last.sets += 1
    } else {
      out.push({ sets: 1, reps, toFailure: g.toFailure, percent: g.percent })
    }
  }
  return out
}

// Plain-text version of the plan for pages that just list exercises.
//   no percent:  "4x8/8/6/6F"   with percent: "2x2 @85 then 2x1 @90"
export function describePlan(targetSets: number | null, targetReps: string | null): string {
  if (!targetSets || !targetReps) return ''
  const goals = parseSetGoals(targetReps, targetSets)
  if (!hasPercent(goals)) return `${targetSets}x${targetReps}`
  return percentSegments(goals)
    .map((x) => `${x.sets}x${x.reps}${x.toFailure ? 'F' : ''}${x.percent ? ` @${x.percent}` : ''}`)
    .join(' then ')
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
// ---------------------------------------------------------------------------
// Percent of max -> weight
//
// A set written "3@70" or "3@73-75" is a percent of the lifter's one-rep max.
// Which max? The lift the percent is "of":
//   1. notes that say "% of Power Clean max" (or "of snatch 1RM") win,
//   2. then the built-in table below (variations use their parent lift),
//   3. otherwise the exercise itself.
// ---------------------------------------------------------------------------
const BASIS_ALIASES: Record<string, string> = {
  'muscle snatch': 'Full Snatch',
  'power snatch': 'Full Snatch',
  'hang power snatch': 'Full Snatch',
  'hang snatch': 'Full Snatch',
  'snatch high pull': 'Full Snatch',
  'snatch pull': 'Full Snatch',
  'snatch balance': 'Full Snatch',
  'muscle snatch + snatch balance complex': 'Full Snatch',
  'pause bench press': 'Bench Press',
  'close-grip bench press': 'Bench Press',
  'trap bar jump': 'Trap Bar Deadlift',
}

export function maxBasis(name: string, notes: string | null): string {
  const m = (notes ?? '').match(/of\s+(?:your\s+)?([A-Za-z][A-Za-z &'\-]*?)\s*(?:max|1\s*rm)\b/i)
  if (m && m[1].trim()) return m[1].trim().replace(/\s+/g, ' ')
  return BASIS_ALIASES[name.trim().toLowerCase()] ?? name.trim()
}

export type TargetWeight = { low: number; high: number | null }

function roundTo(x: number, step: number): number {
  return Number((Math.round(x / step) * step).toFixed(2))
}

// "70" -> one weight, "73-75" -> a range. Null when there is no max or no percent.
export function targetWeight(
  max: number | null | undefined,
  percent: string | null,
  step: number
): TargetWeight | null {
  if (!max || max <= 0 || !percent) return null
  const m = percent.match(/^\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*$/)
  if (!m) return null
  const low = roundTo((max * Number(m[1])) / 100, step)
  if (m[2] === undefined) return { low, high: null }
  const high = roundTo((max * Number(m[2])) / 100, step)
  return high === low ? { low, high: null } : { low, high }
}

export function fmtTarget(t: TargetWeight): string {
  return t.high == null ? String(t.low) : `${t.low}-${t.high}`
}

// Epley estimate of a one-rep max from a recent hard set.
export function estimateMax(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps >= 1)) return 0
  return Math.round(reps === 1 ? weight : weight * (1 + reps / 30))
}

// ---------------------------------------------------------------------------
// Complexes
//
// "Muscle Snatch + Snatch Balance Complex" (the exercise name), or a notes line
// "Complex: 1 Clean Lift Off + 1 Clean Pull + 1 Power Clean", become a list of parts.
// ---------------------------------------------------------------------------
export function complexParts(name: string, notes: string | null): string[] | null {
  const fromNotes = (notes ?? '').match(/complex\s*:\s*(.+?)(?:\s*\|\s*|\.\s|\n|$)/i)
  const raw = fromNotes ? fromNotes[1] : name.includes('+') ? name : ''
  if (!raw) return null
  const parts = raw
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  parts[parts.length - 1] = parts[parts.length - 1].replace(/\s+complex$/i, '').trim()
  return parts.filter(Boolean).length >= 2 ? parts.filter(Boolean) : null
}

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

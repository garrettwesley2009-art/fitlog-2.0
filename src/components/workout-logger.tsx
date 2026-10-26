'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HelpTip } from '@/components/help-tip'
import { enqueue, flush, pendingCount, readPending, resetLocal } from '@/lib/outbox'
import { saveMaxes } from '@/app/actions/maxes'
import {
  parseSetGoals,
  parseRests,
  hasPercent,
  percentSegments,
  maxBasis,
  targetWeight,
  fmtTarget,
  estimateMax,
  complexParts,
} from '@/lib/log-plan'

// ---------------------------------------------------------------------------
// Types shared with the Log page (page.tsx)
// ---------------------------------------------------------------------------
export type PlanExercise = {
  exercise_name: string
  target_sets: number | null
  target_reps: string | null
  notes: string | null
}

export type DayLite = {
  id: string
  day_label: string
  exercises: PlanExercise[]
}

// The whole program, so the Log page can show the rest of it (read-only).
export type ProgramLite = {
  name: string
  week: number
  totalWeeks: number
  currentDayId: string
  days: DayLite[]
}

export type LoggedSet = {
  id: string
  set_index: number
  weight: number | null
  reps: number | null
  rpe: number | null
  exercise_name: string
}

// Sets from an earlier workout that had this exercise.
export type LastTimeSet = {
  set_index: number
  weight: number | null
  reps: number | null
  rpe: number | null
}

export type LastTime = {
  date: string
  sets: LastTimeSet[]
}

export type FeedbackEntry = {
  exercise_name: string
  status: 'done' | 'skipped' | 'swapped'
  effort: number | null
  note: string | null
  swapped_to_name: string | null
}

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------
type SetState = {
  reps: string
  weight: string
  toFailure: boolean
  // Percent of max from the plan ("85" or "75-80"), shown as a badge.
  percent: string | null
  auto: boolean // weight was filled in from a percent of the saved max
  done: boolean
  touchedWeight: boolean
}

type ExState = {
  key: string
  name: string
  swappedFrom: string | null
  plan: PlanExercise
  sets: SetState[]
  rests: number[]
  status: 'active' | 'done' | 'skipped'
  effort: number | null
  note: string
}

const EFFORT_LABELS = ['Very easy', 'Easy', 'Just right', 'Hard', 'Max effort']
const REST_PREF_KEY = 'fitlog.restTimer'
const STEP_PREF_KEY = 'fitlog.weightStep'
const HEX = '[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]'
const NO_SPINNER = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function numStr(n: number | null | undefined) {
  return n == null ? '' : String(n)
}

function fmtClock(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function PercentBadge({ percent }: { percent: string }) {
  return (
    <span className="rounded-md border border-accent px-1.5 py-0.5 text-[11px] font-bold normal-case tracking-normal text-accent">
      @{percent}%
    </span>
  )
}

// "5 sets · 2x2 @85 then 2x1 @90" (percent in the accent color), or plain "3 sets · 8-10".
function PlanLine({ sets, reps }: { sets: number | null; reps: string | null }) {
  const goals = parseSetGoals(reps, sets)
  if (hasPercent(goals)) {
    return (
      <>
        {sets ?? goals.length} sets &middot;{' '}
        {percentSegments(goals).map((seg, k) => (
          <span key={k}>
            {k > 0 && <span> then </span>}
            {seg.sets}x{seg.reps}
            {seg.toFailure ? 'F' : ''}
            {seg.percent && <span className="font-semibold text-accent"> @{seg.percent}</span>}
          </span>
        ))}
      </>
    )
  }
  return (
    <>
      {sets ?? goals.length} sets{reps ? ` \u00b7 ${reps}` : ''}
    </>
  )
}

// Splits "Week A - Day 1 - Monday" into group "Week A" and short label "Day 1 - Monday".
function splitDayLabel(label: string): { group: string | null; short: string } {
  const m = label.match(/^\s*(Week\s+[A-Za-z0-9]+)\s*[-:\u2013\u2014]\s*(.+)$/i)
  return m ? { group: m[1], short: m[2] } : { group: null, short: label }
}

function describe(s: LastTimeSet) {
  return `${s.weight ?? '-'}x${s.reps ?? '-'}`
}

function buildExercises(
  day: DayLite | null,
  logged: LoggedSet[],
  lastTime: Record<string, LastTime>,
  feedback: FeedbackEntry[],
  maxes: Record<string, number>,
  step: number
): ExState[] {
  return (day?.exercises ?? []).map((plan, index) => {
    const swap = feedback.find(
      (f) => f.exercise_name === plan.exercise_name && f.status === 'swapped' && f.swapped_to_name
    )
    const name = swap?.swapped_to_name ?? plan.exercise_name
    const fb = feedback.find((f) => f.exercise_name === name && f.status !== 'swapped')

    const goals = parseSetGoals(plan.target_reps, plan.target_sets)
    const basisMax = swap ? undefined : maxes[maxBasis(plan.exercise_name, plan.notes).toLowerCase()]
    const last = lastTime[name] ?? lastTime[plan.exercise_name]
    const mine = logged.filter((s) => s.exercise_name === name)
    const byIndex = new Map(mine.map((s) => [s.set_index, s] as const))
    const count = Math.max(goals.length, 1, ...mine.map((s) => s.set_index))

    const sets: SetState[] = []
    for (let i = 0; i < count; i++) {
      const done = byIndex.get(i + 1)
      if (done) {
        sets.push({
          reps: numStr(done.reps),
          weight: numStr(done.weight),
          toFailure: Boolean(goals[i]?.toFailure),
          percent: goals[i]?.percent ?? null,
          auto: false,
          done: true,
          touchedWeight: true,
        })
        continue
      }
      // Reps start at the plan; weight starts at what they lifted last time.
      const prev = last ? (last.sets[i] ?? last.sets[last.sets.length - 1]) : undefined
      // A percent plus a saved max beats last time's weight: the plan says what to lift.
      const tw = targetWeight(basisMax, goals[i]?.percent ?? null, step)
      sets.push({
        reps: numStr(goals[i]?.reps ?? prev?.reps),
        weight: tw ? String(tw.low) : numStr(prev?.weight),
        toFailure: Boolean(goals[i]?.toFailure),
        percent: goals[i]?.percent ?? null,
        auto: Boolean(tw),
        done: false,
        touchedWeight: false,
      })
    }

    return {
      key: `${index}`,
      name,
      swappedFrom: swap ? plan.exercise_name : null,
      plan,
      sets,
      rests: parseRests(plan.notes, count),
      status: fb?.status === 'skipped' ? 'skipped' : fb ? 'done' : 'active',
      effort: fb?.effort ?? null,
      note: fb?.note ?? '',
    }
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WorkoutLogger({
  day,
  workoutLabel,
  initialWorkoutId,
  initialSets,
  lastTime,
  history,
  initialFeedback,
  program = null,
  maxes: initialMaxes = {},
}: {
  day: DayLite | null
  workoutLabel: string
  initialWorkoutId: string | null
  initialSets: LoggedSet[]
  lastTime: Record<string, LastTime>
  history: Record<string, LastTime[]>
  initialFeedback: FeedbackEntry[]
  program?: ProgramLite | null
  // Saved one-rep maxes in lb, keyed by lowercase exercise name.
  maxes?: Record<string, number>
}) {
  const router = useRouter()

  const [exs, setExs] = useState<ExState[]>(() =>
    buildExercises(day, initialSets, lastTime, initialFeedback, initialMaxes, 5)
  )
  const [idx, setIdx] = useState<number>(() => {
    const first = buildExercises(day, initialSets, lastTime, initialFeedback, initialMaxes, 5).findIndex(
      (e) => e.status === 'active'
    )
    return first
  })
  // Before the server has made this workout, saves are filed under a local key on the phone.
  const workoutRef = initialWorkoutId ?? `local:${day?.id ?? 'free'}`
  const [editing, setEditing] = useState<number | null>(null)
  const [sheet, setSheet] = useState<null | 'menu' | 'history' | 'replace' | 'effort' | 'program' | 'maxes'>(() => {
    const first = buildExercises(day, initialSets, lastTime, initialFeedback, initialMaxes, 5).find(
      (e) => e.status === 'active'
    )
    return first && first.sets.length > 0 && first.sets.every((s) => s.done) ? 'effort' : null
  })
  const [viewDayId, setViewDayId] = useState<string | null>(null)
  // Saved maxes (lb, by lowercase lift name) and the plate rounding for worked-out weights.
  const [maxes, setMaxes] = useState<Record<string, number>>(initialMaxes)
  const [step, setStep] = useState<number>(5)
  const [maxDraft, setMaxDraft] = useState<Record<string, string>>({})
  const [maxPromptHidden, setMaxPromptHidden] = useState(false)
  const [estFor, setEstFor] = useState<string | null>(null)
  const [estW, setEstW] = useState('')
  const [estR, setEstR] = useState('')
  const [pickedEffort, setPickedEffort] = useState<number | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [restOn, setRestOn] = useState(true)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [restLeft, setRestLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bring back anything still waiting on the phone (for example after closing the app with no signal).
  useEffect(() => {
    if (!initialWorkoutId) resetLocal(workoutRef)
    const pending = readPending(workoutRef)
    if (pending.sets.length === 0 && pending.feedback.length === 0) return
    setExs((prev) => {
      const next = prev.map((e) => {
        const mine = pending.sets.filter((o) => o.exercise === e.name)
        const fb = pending.feedback.find((f) => f.input.exerciseName === e.name)
        if (mine.length === 0 && !fb) return e
        let sets = e.sets
        for (const o of mine) {
          const i = o.setIndex - 1
          if (i >= 0 && i < sets.length) {
            sets = sets.map((x, n) =>
              n === i ? { ...x, reps: String(o.reps), weight: String(o.weight), done: true, touchedWeight: true } : x
            )
          }
        }
        let out: ExState = { ...e, sets }
        if (fb) {
          out = {
            ...out,
            status: fb.input.status === 'skipped' ? 'skipped' : 'done',
            effort: fb.input.effort,
            note: fb.input.note ?? out.note,
          }
        }
        return out
      })
      const first = next.findIndex((e) => e.status === 'active')
      setIdx(first)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = idx === -1
  const ex: ExState | null = idx >= 0 ? exs[idx] : null

  // Remember the plate rounding on this device (nice to have, never required).
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STEP_PREF_KEY))
      if (saved === 1 || saved === 2.5 || saved === 5) setStep(saved)
    } catch {
      /* storage unavailable */
    }
  }, [])

  // Whenever a max or the rounding changes, refill the weights of sets that have a percent and
  // have not been touched or logged yet.
  useEffect(() => {
    setExs((prev) =>
      prev.map((e) => {
        if (e.swappedFrom) return e
        const max = maxes[maxBasis(e.plan.exercise_name, e.plan.notes).toLowerCase()]
        return {
          ...e,
          sets: e.sets.map((st) => {
            if (st.done || st.touchedWeight || !st.percent) return st
            const tw = targetWeight(max, st.percent, step)
            if (!tw) return st.auto ? { ...st, weight: '', auto: false } : st
            return { ...st, weight: String(tw.low), auto: true }
          }),
        }
      })
    )
  }, [maxes, step])

  // Remember the rest timer choice on this device (nice to have, never required).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(REST_PREF_KEY) === 'off') setRestOn(false)
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [])

  // Rest countdown, based on the clock so it stays right if the tab sleeps.
  useEffect(() => {
    if (restEndsAt == null) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000))
      setRestLeft(left)
      if (left <= 0) {
        setRestEndsAt(null)
        try {
          if ('vibrate' in navigator) navigator.vibrate(300)
        } catch {
          /* not supported */
        }
        flash('Rest is up. Next set.')
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt])

  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current)
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    []
  )

  function flash(text: string) {
    setMessage(text)
    if (messageTimer.current) clearTimeout(messageTimer.current)
    messageTimer.current = setTimeout(() => setMessage(null), 2200)
  }

  // The page scrolls inside the main area (the top and bottom bars stay put).
  function scrollToTop() {
    if (typeof document !== 'undefined') {
      document.querySelector('[data-scroll-area]')?.scrollTo({ top: 0, behavior: 'smooth' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const stopRest = useCallback(() => setRestEndsAt(null), [])

  function updateEx(i: number, patch: (e: ExState) => ExState) {
    setExs((prev) => prev.map((e, n) => (n === i ? patch(e) : e)))
  }

  function setField(setIndex: number, field: 'reps' | 'weight', value: string) {
    updateEx(idx, (e) => ({
      ...e,
      sets: e.sets.map((s, n) =>
        n === setIndex
          ? { ...s, [field]: value, touchedWeight: field === 'weight' ? true : s.touchedWeight }
          : s
      ),
    }))
  }

  function bump(setIndex: number, field: 'reps' | 'weight', delta: number) {
    const current = Number(exs[idx].sets[setIndex][field]) || 0
    setField(setIndex, field, String(Math.max(0, current + delta)))
  }

  function currentSetIndex(e: ExState): number {
    if (editing !== null) return editing
    return e.sets.findIndex((s) => !s.done)
  }

  // -------------------------------------------------------------------------
  // Logging one set
  // -------------------------------------------------------------------------
  async function logSet() {
    if (!ex || busy) return
    const ci = currentSetIndex(ex)
    if (ci < 0) return
    const set = ex.sets[ci]

    if (set.reps.trim() === '' || Number(set.reps) <= 0) {
      setError('Enter how many reps you did.')
      return
    }

    setError(null)
    const wasEditing = editing !== null
    // Saved on the phone first, so a dead zone never loses a set. It uploads on its own.
    enqueue({
      type: 'set',
      workout: workoutRef,
      exercise: ex.name,
      setIndex: ci + 1,
      weight: set.weight.trim() === '' ? 0 : Number(set.weight),
      reps: Number(set.reps),
    })
    void flush()
    {
      const loggedWeight = set.weight
      const nextSets = ex.sets.map((s, n) => {
        if (n === ci) return { ...s, done: true, touchedWeight: true }
        // The sets after this one follow the weight you actually used.
        if (!wasEditing && n > ci && !s.done && !s.touchedWeight && !s.auto) return { ...s, weight: loggedWeight }
        return s
      })
      updateEx(idx, (e) => ({ ...e, sets: nextSets }))

      if (wasEditing) {
        setEditing(null)
        return
      }

      const remaining = nextSets.filter((s) => !s.done).length
      if (remaining === 0) {
        stopRest()
        setPickedEffort(ex.effort)
        setNoteText(ex.note)
        setNoteOpen(Boolean(ex.note))
        setSheet('effort')
        return
      }

      const rest = restOn ? (ex.rests[ci] ?? 0) : 0
      if (rest > 0) setRestEndsAt(Date.now() + rest * 1000)
      else flash(`Set ${ci + 1} logged`)
    }
  }

  function addSet() {
    if (!ex) return
    updateEx(idx, (e) => {
      const last = e.sets[e.sets.length - 1]
      return {
        ...e,
        sets: [
          ...e.sets,
          { reps: last.reps, weight: last.weight, toFailure: false, percent: last.percent, auto: last.auto, done: false, touchedWeight: false },
        ],
        rests: [...e.rests.slice(0, -1), e.rests[e.rests.length - 2] ?? 90, 0].slice(0, e.sets.length + 1),
      }
    })
  }

  async function removeLastSet() {
    if (!ex || ex.sets.length <= 1) return
    const last = ex.sets.length - 1
    if (ex.sets[last].done) {
      flash('Tap that set to edit it, or keep it.')
      return
    }
    updateEx(idx, (e) => ({ ...e, sets: e.sets.slice(0, -1), rests: e.rests.slice(0, -1) }))
  }

  // -------------------------------------------------------------------------
  // Saving feedback and moving on
  // -------------------------------------------------------------------------
  async function persistFeedback(
    e: ExState,
    status: 'done' | 'skipped' | 'swapped',
    effort: number | null,
    note: string,
    exerciseName: string,
    swappedTo: string | null
  ): Promise<boolean> {
    enqueue({
      type: 'feedback',
      workout: workoutRef,
      input: {
        exerciseName,
        status,
        effort,
        note: note.trim() || null,
        swappedToName: swappedTo,
        plannedSets: e.plan.target_sets,
        plannedReps: e.plan.target_reps,
      },
    })
    void flush()
    return true
  }

  function moveTo(n: number) {
    if (n < 0 || n >= exs.length) return
    stopRest()
    setEditing(null)
    setSheet(null)
    setIdx(n)
    scrollToTop()
  }

  function goToNext(from: number) {
    stopRest()
    setEditing(null)
    setSheet(null)
    // Next unfinished exercise after this one; if none, come back to any skipped-over earlier one.
    let next = exs.findIndex((e, n) => n > from && e.status === 'active')
    if (next === -1) next = exs.findIndex((e, n) => n !== from && e.status === 'active')
    setIdx(next)
    scrollToTop()
  }

  // Jump straight to an exercise from the program viewer. Nothing is lost: sets already
  // logged stay logged, and the exercise you left stays open to come back to.
  function jumpTo(n: number) {
    stopRest()
    setEditing(null)
    setSheet(null)
    setIdx(n)
    scrollToTop()
  }

  function openProgram() {
    setViewDayId(program?.currentDayId ?? null)
    setSheet('program')
  }

  // ---- Maxes (percent of max -> weight) ----
  // Every lift a percent in this program is "of", with how many days use it.
  function neededLifts(): { key: string; name: string; days: number }[] {
    const days = program?.days ?? (day ? [day] : [])
    const found = new Map<string, { key: string; name: string; days: number }>()
    for (const d of days) {
      const seen = new Set<string>()
      for (const pe of d.exercises) {
        if (!hasPercent(parseSetGoals(pe.target_reps, pe.target_sets))) continue
        const name = maxBasis(pe.exercise_name, pe.notes)
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const row = found.get(key)
        if (row) row.days += 1
        else found.set(key, { key, name, days: 1 })
      }
    }
    return [...found.values()]
  }

  function openMaxes() {
    const draft: Record<string, string> = {}
    for (const l of neededLifts()) draft[l.key] = maxes[l.key] ? String(maxes[l.key]) : ''
    setMaxDraft(draft)
    setEstFor(null)
    setEstW('')
    setEstR('')
    setSheet('maxes')
  }

  async function saveMaxesNow() {
    const lifts = neededLifts()
    const entries = lifts
      .map((l) => ({ name: l.name, key: l.key, oneRm: Number(maxDraft[l.key]) }))
      .filter((e) => e.oneRm > 0)
    if (entries.length === 0) {
      setError('Enter at least one max.')
      return
    }
    setBusy(true)
    setError(null)
    const res = await saveMaxes(entries.map((e) => ({ name: e.name, oneRm: e.oneRm })))
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setMaxes((prev) => {
      const next = { ...prev }
      for (const e of entries) next[e.key] = e.oneRm
      return next
    })
    setSheet(null)
    flash('Maxes saved')
  }

  function chooseStep(n: number) {
    setStep(n)
    try {
      window.localStorage.setItem(STEP_PREF_KEY, String(n))
    } catch {
      /* storage unavailable */
    }
  }

  async function submitEffort(effort: number | null) {
    if (!ex || busy) return
    setBusy(true)
    setError(null)
    const current = ex
    const ok = await persistFeedback(current, 'done', effort, noteText, current.name, null)
    setBusy(false)
    if (!ok) flash('Could not save your rating, but your sets are saved.')
    setExs((prev) =>
      prev.map((e, n) =>
        n === idx ? { ...e, status: 'done', effort, note: noteText.trim() } : e
      )
    )
    goToNext(idx)
  }

  function pickEffort(value: number) {
    setPickedEffort(value)
    if (!noteOpen) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => {
        void submitEffort(value)
      }, 350)
    }
  }

  async function skipExercise() {
    if (!ex || busy) return
    setBusy(true)
    const current = ex
    const ok = await persistFeedback(current, 'skipped', null, '', current.name, null)
    setBusy(false)
    if (!ok) flash('Could not save that, but you can keep going.')
    setExs((prev) => prev.map((e, n) => (n === idx ? { ...e, status: 'skipped' } : e)))
    goToNext(idx)
  }

  async function replaceExercise() {
    if (!ex || busy) return
    const newName = replaceText.trim()
    if (!newName) return
    if (exs.some((e, n) => n !== idx && e.name.toLowerCase() === newName.toLowerCase())) {
      setError('That exercise is already in this workout.')
      return
    }
    setBusy(true)
    setError(null)
    const current = ex
    const ok = await persistFeedback(current, 'swapped', null, '', current.name, newName)
    setBusy(false)
    if (!ok) {
      setError('Could not swap that. Try again.')
      return
    }
    updateEx(idx, (e) => ({
      ...e,
      name: newName,
      swappedFrom: e.swappedFrom ?? e.name,
      sets: e.sets.map((s) => ({ ...s, done: false, touchedWeight: false, auto: false, weight: '' })),
    }))
    setReplaceText('')
    setSheet(null)
    flash(`Swapped for ${newName}`)
  }

  function toggleRest() {
    const next = !restOn
    setRestOn(next)
    if (!next) stopRest()
    try {
      window.localStorage.setItem(REST_PREF_KEY, next ? 'on' : 'off')
    } catch {
      /* storage unavailable */
    }
    setSheet(null)
    flash(next ? 'Rest timer on' : 'Rest timer off')
  }

  async function handleFinish() {
    if (!exs.some((e) => e.sets.some((x) => x.done))) {
      setError('Log at least one set before finishing.')
      return
    }
    setFinishing(true)
    setError(null)
    enqueue({ type: 'finish', workout: workoutRef })
    // Give the upload a few seconds. With no signal we stay put and it finishes on its own later.
    await Promise.race([flush(), new Promise<void>((r) => setTimeout(r, 8000))])
    setFinishing(false)
    if (pendingCount() === 0) {
      router.push('/dashboard')
      return
    }
    setMessage(null)
    setError('Saved on your phone. It will finish by itself when you have signal.')
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  if (!day || exs.length === 0) {
    return (
      <div className="glass-card space-y-3 p-6 text-center">
        <p className="text-lg font-semibold text-ink">No workout to log yet</p>
        <p className="text-sm text-muted">
          Pick a program and your first day will show up here, one exercise at a time.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/templates" className="btn-accent">
            Choose a program
          </Link>
          <Link href="/programs/new" className="btn-ghost">
            Build your own
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------- Summary screen -----------------------------
  if (summary) {
    let setsDone = 0
    let volume = 0
    const efforts: number[] = []
    for (const e of exs) {
      if (e.status === 'skipped') continue
      for (const s of e.sets) {
        if (!s.done) continue
        setsDone += 1
        volume += (Number(s.reps) || 0) * (Number(s.weight) || 0)
      }
      if (e.effort) efforts.push(e.effort)
    }
    const avg = efforts.length
      ? (efforts.reduce((a, b) => a + b, 0) / efforts.length).toFixed(1)
      : '-'

    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">{workoutLabel}</p>
          <h1 className="mt-1 text-3xl font-bold italic leading-tight text-ink">
            Nice work.
            <br />
            That is a wrap.
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sets', value: String(setsDone) },
            { label: 'lb lifted', value: volume.toLocaleString('en-US') },
            { label: 'Avg effort', value: avg },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="glass-card divide-y divide-line px-4">
          {exs.map((e) => (
            <div key={e.key} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 truncate text-ink">{e.name}</span>
              <span
                className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  e.status === 'skipped' ? 'bg-glass-hover text-muted' : 'bg-accent/25 text-ink'
                }`}
              >
                {e.status === 'skipped' ? 'Skipped' : e.effort ? `Effort ${e.effort}` : 'Logged'}
              </span>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="sticky bottom-24 z-10">
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing || setsDone === 0}
            className="btn-accent w-full py-4 text-base"
          >
            {finishing ? 'Finishing...' : 'Finish workout'}
          </button>
          {setsDone === 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              Log at least one set to finish. Or head back and skip the day from Home.
            </p>
          )}
        </div>
      </div>
    )
  }

  // --------------------------- Exercise screen -----------------------------
  const current = ex as ExState
  const ci = currentSetIndex(current)
  // Percent-of-max plans ("2@85/2@85/1@90") show as "2x2 @85 then 1x2 @90" and get a badge per set.
  const planGoals = parseSetGoals(current.plan.target_reps, current.plan.target_sets)
  const planHasPercent = hasPercent(planGoals)
  const planSegments = percentSegments(planGoals)
  const basisName = maxBasis(current.plan.exercise_name, current.plan.notes)
  const basisMax = current.swappedFrom ? undefined : maxes[basisName.toLowerCase()]
  const parts = complexParts(current.name, current.plan.notes)
  const allDone = ci === -1
  const doneCount = current.sets.filter((s) => s.done).length
  const isLast = ci === current.sets.length - 1 && editing === null
  const exHistory = history[current.name] ?? []
  const last = lastTime[current.name]
  const anyDone = doneCount > 0

  const buttonLabel =
    editing !== null
      ? `Save set ${editing + 1}`
      : allDone
        ? 'Rate this exercise'
        : isLast
          ? `Log set ${ci + 1} and finish`
          : `Log set ${ci + 1}`

  return (
    <div className="space-y-4">
      {/* Progress + menu, then the exercise name with arrows */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            aria-label="Leave workout (your logged sets are saved)"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line bg-glass text-ink"
          >
            &#10005;
          </Link>
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {exs.map((e, n) => (
              <span
                key={e.key}
                className={`h-1 flex-1 rounded-full ${
                  e.status !== 'active' ? 'bg-accent' : n === idx ? 'bg-ink' : 'bg-ink/20'
                }`}
              />
            ))}
          </div>
          {program && (
            <button
              type="button"
              aria-label="View the rest of your workout and program"
              onClick={openProgram}
              className="flex h-9 flex-none items-center gap-1 rounded-full border border-line bg-glass px-3 text-xs font-semibold text-ink"
            >
              &#9776; Program
            </button>
          )}
          <button
            type="button"
            aria-label="Exercise options"
            onClick={() => setSheet('menu')}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line bg-glass text-lg text-ink"
          >
            &#8943;
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous exercise"
            disabled={idx <= 0}
            onClick={() => moveTo(idx - 1)}
            className="flex h-11 w-11 flex-none items-center justify-center text-3xl text-muted disabled:opacity-25"
          >
            &lsaquo;
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              Exercise {idx + 1} of {exs.length}
            </p>
            <h1 className="text-xl font-bold italic leading-tight text-ink">{current.name}</h1>
          </div>
          <button
            type="button"
            aria-label="Next exercise"
            disabled={idx >= exs.length - 1}
            onClick={() => moveTo(idx + 1)}
            className="flex h-11 w-11 flex-none items-center justify-center text-3xl text-muted disabled:opacity-25"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      <div className="px-1">
        <p className="text-sm text-ink">
          {planHasPercent ? (
            <span className="font-semibold">
              {current.plan.target_sets ?? current.sets.length} sets &middot;{' '}
              {planSegments.map((seg, k) => (
                <span key={k}>
                  {k > 0 && <span className="font-normal text-muted"> then </span>}
                  {seg.sets}x{seg.reps}
                  {seg.toFailure ? 'F' : ''}
                  {seg.percent && <span className="text-accent"> @{seg.percent}</span>}
                </span>
              ))}
            </span>
          ) : (
            <span className="font-semibold">
              {current.plan.target_sets ?? current.sets.length} sets
              {current.plan.target_reps ? ` · ${current.plan.target_reps}` : ''}
            </span>
          )}
          <span className="text-muted">
            {' '}
            &middot; {doneCount} of {current.sets.length} logged
          </span>{' '}
          <HelpTip title="Reading the plan">
            <p>
              <b className="text-ink">3 sets · 8</b> means do 3 sets of 8 reps. A range like 8-10 means anything in
              that range is fine.
            </p>
            <p>
              <b className="text-ink">F</b> means go to failure: keep going until you cannot do another good rep.
            </p>
            <p>
              <b className="text-ink">@80%</b> means use 80% of your max for that lift. The app works out the weight
              once you enter your max.
            </p>
            <p>Change the weight or reps to what you really did, then tap the big button to log the set.</p>
          </HelpTip>
        </p>
        {current.swappedFrom && (
          <p className="mt-0.5 text-xs text-accent">Swapped in for {current.swappedFrom}</p>
        )}
        {planHasPercent && basisMax && (
          <p className="mt-1 text-xs text-muted">
            {basisName} 1RM <b className="text-accent">{basisMax} lb</b>{' '}
            <HelpTip title="What is a 1RM?">
              <p>
                Your one-rep max (1RM) is the heaviest weight you could lift for one good rep. Percents in your
                program are a share of this number.
              </p>
              <p>Not sure of yours? Tap Edit max and use the estimate: enter a weight and reps you did recently.</p>
            </HelpTip>
            <button type="button" onClick={openMaxes} className="ml-2 font-semibold text-accent">
              Edit max
            </button>
          </p>
        )}
        {parts && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {parts.map((part, k) => (
              <span key={k} className="flex items-center gap-1.5">
                {k > 0 && <span className="text-muted">+</span>}
                <span className="rounded-full border border-line bg-glass px-2.5 py-0.5 text-xs text-ink">
                  {part}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {planHasPercent && !basisMax && !current.swappedFrom && !maxPromptHidden && (
        <div className="inset-card flex items-center gap-3 px-3 py-2.5 text-xs text-muted">
          <p className="min-w-0 flex-1">
            This uses percents. Add your <b className="text-ink">{basisName}</b> max and the app works out your
            weights.
          </p>
          <button type="button" onClick={openMaxes} className="btn-accent-sm flex-none">
            Set max
          </button>
          <button
            type="button"
            aria-label="Not now"
            onClick={() => setMaxPromptHidden(true)}
            className="flex-none text-muted"
          >
            &#10005;
          </button>
        </div>
      )}

      {last && (
        <div className="inset-card px-3 py-2 text-xs text-muted">
          <span className="mr-2 font-semibold uppercase tracking-wide text-accent">Last time</span>
          <HelpTip title="Last time" className="mr-2">
            <p>What you lifted the last time you did this exercise, as weight x reps. Try to match it or beat it a little.</p>
          </HelpTip>
          {last.date ? `${last.date}: ` : ''}
          {last.sets.map(describe).join(' · ')}
        </div>
      )}

      {/* Sets: done above, current in focus, next ones previewed below */}
      <div className="relative space-y-2.5 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-0.5 before:bg-line">
        {current.sets.map((s, i) => {
          const isCurrent = i === ci
          if (isCurrent) {
            const rest = current.rests[i] ?? 0
            return (
              <div key={i} className="relative flex items-start gap-3">
                <span
                  className={`relative z-[1] -ml-[3px] mt-0.5 flex h-11 w-10 flex-none items-center justify-center bg-ink text-sm font-extrabold text-canvas ${HEX}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 rounded-card border-[1.5px] border-ink bg-glass p-3 ring-4 ring-ink/5">
                  <div className="mb-2 px-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                      {editing !== null
                        ? `Editing set ${i + 1}`
                        : `Set ${i + 1} of ${current.sets.length}`}
                      {s.percent && <PercentBadge percent={s.percent} />}
                      {(() => {
                        const tw = targetWeight(basisMax, s.percent, step)
                        return tw ? (
                          <span className="font-semibold normal-case tracking-normal text-muted">
                            Target {fmtTarget(tw)} lb
                          </span>
                        ) : null
                      })()}
                    </p>
                    {s.toFailure ? (
                      <span className="mt-1 inline-block rounded-full border border-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                        To failure
                      </span>
                    ) : (
                      <p className="mt-1 text-xs text-muted">
                        {rest > 0 ? `Rest ${rest} sec after` : 'No rest after'}
                      </p>
                    )}
                  </div>

                  {(['reps', 'weight'] as const).map((field) => (
                    <div
                      key={field}
                      className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-canvas/40 py-1.5 pl-4 pr-2 first:mt-0"
                    >
                      <label
                        htmlFor={`${field}-${i}`}
                        className="text-[11px] uppercase tracking-wide text-muted"
                      >
                        {field === 'reps' ? 'Reps' : 'Weight (lb)'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Less ${field}`}
                          onClick={() => bump(i, field, field === 'reps' ? -1 : -5)}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-glass-hover text-xl text-ink"
                        >
                          &minus;
                        </button>
                        <input
                          id={`${field}-${i}`}
                          type="number"
                          inputMode={field === 'reps' ? 'numeric' : 'decimal'}
                          value={s[field]}
                          onChange={(e) => setField(i, field, e.target.value)}
                          className={`w-[4.5rem] bg-transparent text-center text-3xl font-extrabold italic text-ink outline-none ${NO_SPINNER}`}
                        />
                        <button
                          type="button"
                          aria-label={`More ${field}`}
                          onClick={() => bump(i, field, field === 'reps' ? 1 : 5)}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-glass-hover text-xl text-ink"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void logSet()}
                    className="btn-accent mt-3 w-full py-4 text-base"
                  >
                    {busy ? 'Saving...' : buttonLabel}
                  </button>

                  {restEndsAt != null && (
                    <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted">
                      <span>Rest</span>
                      <HelpTip title="Rest timer">
                        <p>A countdown between sets so you recover before the next one. Tap Skip to end it early.</p>
                        <p>Turn it off any time from the ... menu at the top of the screen.</p>
                      </HelpTip>
                      <b className="tabular-nums text-ink">{fmtClock(restLeft)}</b>
                      <button type="button" onClick={stopRest} className="font-semibold text-accent">
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          if (s.done) {
            return (
              <div key={i} className="relative flex items-start gap-3">
                <span
                  className={`relative z-[1] mt-1 flex h-[38px] w-[34px] flex-none items-center justify-center bg-accent text-sm font-bold text-ink ${HEX}`}
                >
                  &#10003;
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(i)}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-2xl border border-line bg-glass px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span>
                      <b className="italic">{s.reps}</b> reps &times; <b className="italic">{s.weight || 0}</b> lb
                    </span>
                    {s.percent && <PercentBadge percent={s.percent} />}
                  </span>
                  <span className="text-xs text-muted">Edit</span>
                </button>
              </div>
            )
          }

          return (
            <div key={i} className="relative flex items-start gap-3">
              <span
                className={`relative z-[1] mt-1 flex h-[38px] w-[34px] flex-none items-center justify-center bg-line text-sm font-bold text-ink ${HEX}`}
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between rounded-2xl border border-dashed border-line px-3 py-2.5 text-muted">
                <span className="flex items-center gap-2 text-sm">
                  <span>
                    <b className="italic">{s.reps || '-'}</b> reps &times;{' '}
                    <b className="italic">{s.weight || '-'}</b> lb
                  </span>
                  {s.percent && <PercentBadge percent={s.percent} />}
                </span>
                <span className="text-[10px] uppercase tracking-wide">
                  {s.toFailure ? 'to failure' : 'up next'}
                </span>
              </div>
            </div>
          )
        })}

        <div className="relative flex items-center gap-3 pt-2">
          <button
            type="button"
            aria-label="Add a set"
            onClick={addSet}
            className={`relative z-[1] flex h-[38px] w-[34px] flex-none items-center justify-center bg-accent text-xl text-ink ${HEX}`}
          >
            +
          </button>
          <button type="button" onClick={addSet} className="text-base font-bold text-accent">
            Add Set
          </button>
          {current.sets.length > 1 && (
            <button
              type="button"
              onClick={removeLastSet}
              className="ml-auto text-xs text-muted hover:text-ink"
            >
              Remove last
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {allDone && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setPickedEffort(current.effort)
            setNoteText(current.note)
            setNoteOpen(Boolean(current.note))
            setSheet('effort')
          }}
          className="btn-accent w-full py-4 text-base"
        >
          {busy ? 'Saving...' : buttonLabel}
        </button>
      )}

      {/* Toast */}
      {message && (
        <div
          role="status"
          className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-lg"
        >
          {message}
        </div>
      )}

      {/* Bottom sheets */}
      {sheet && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-canvas/70"
            onClick={() => {
              if (sheet !== 'effort') setSheet(null)
            }}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-[1.75rem] border border-b-0 border-line bg-surface px-5 pb-8 pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

            {sheet === 'program' && program && (() => {
              const viewing = program.days.find((d) => d.id === viewDayId) ?? program.days[0]
              const isToday = viewing.id === program.currentDayId
              const groups: string[] = []
              for (const d of program.days) {
                const g = splitDayLabel(d.day_label).group ?? ''
                if (!groups.includes(g)) groups.push(g)
              }
              const viewGroup = splitDayLabel(viewing.day_label).group ?? ''
              const groupDays = program.days.filter(
                (d) => (splitDayLabel(d.day_label).group ?? '') === viewGroup
              )
              const todayGroup =
                splitDayLabel(program.days.find((d) => d.id === program.currentDayId)?.day_label ?? '').group ?? ''
              return (
                <div className="max-h-[75vh] overflow-y-auto">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-ink">{program.name}</h2>
                      <p className="mb-2 text-xs text-muted">
                        Week {program.week} of {program.totalWeeks} &middot; you are on{' '}
                        {splitDayLabel(program.days.find((d) => d.id === program.currentDayId)?.day_label ?? '').short}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSheet(null)}
                      className="btn-ghost-sm flex-none"
                    >
                      Close
                    </button>
                  </div>

                  {groups.length > 1 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {groups.map((g) => {
                        const first = program.days.find((d) => (splitDayLabel(d.day_label).group ?? '') === g)
                        const on = g === viewGroup
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => first && setViewDayId(first.id)}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              on ? 'border-accent font-bold text-accent' : 'border-line bg-glass text-ink'
                            }`}
                          >
                            {g || 'Days'}
                            {g === todayGroup ? ' \u25cf' : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="mb-2 flex flex-wrap gap-2">
                    {groupDays.map((d) => {
                      const on = d.id === viewing.id
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setViewDayId(d.id)}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            on ? 'border-accent font-bold text-accent' : 'border-line bg-glass text-ink'
                          }`}
                        >
                          {splitDayLabel(d.day_label).short.match(/^Day\s*\d+/i)?.[0] ?? splitDayLabel(d.day_label).short}
                          {d.id === program.currentDayId ? ' \u25cf' : ''}
                        </button>
                      )
                    })}
                  </div>

                  <p className="mb-1 text-sm font-semibold text-ink">{splitDayLabel(viewing.day_label).short}</p>
                  {!isToday && (
                    <p className="mb-2 rounded-xl border border-line bg-glass px-3 py-2 text-xs text-muted">
                      Preview only. This is not today&apos;s workout, so there are no Go buttons.
                    </p>
                  )}

                  <div>
                    {isToday
                      ? exs.map((e, n) => (
                          <div key={e.key} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                            <span
                              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] ${
                                e.status === 'done'
                                  ? 'border-transparent bg-accent text-canvas'
                                  : n === idx
                                    ? 'border-accent font-bold text-accent'
                                    : 'border-line text-muted'
                              }`}
                            >
                              {e.status === 'done' ? '\u2713' : n + 1}
                            </span>
                            <div className={`min-w-0 flex-1 ${e.status !== 'active' ? 'opacity-55' : ''}`}>
                              <p className="truncate text-sm font-semibold text-ink">{e.name}</p>
                              <p className="text-xs text-muted">
                                <PlanLine sets={e.plan.target_sets} reps={e.plan.target_reps} />
                              </p>
                            </div>
                            {n === idx ? (
                              <span className="flex-none rounded-full border border-accent px-2.5 py-0.5 text-[11px] font-bold text-accent">
                                Now
                              </span>
                            ) : e.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => jumpTo(n)}
                                className="flex-none rounded-full border border-accent px-3 py-1 text-xs font-bold text-accent"
                              >
                                Go &rsaquo;
                              </button>
                            ) : (
                              <span className="flex-none text-[11px] uppercase tracking-wide text-muted">
                                {e.status === 'skipped' ? 'Skipped' : 'Done'}
                              </span>
                            )}
                          </div>
                        ))
                      : viewing.exercises.map((e, n) => (
                          <div key={`${e.exercise_name}-${n}`} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-line text-[11px] text-muted">
                              {n + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">{e.exercise_name}</p>
                              <p className="text-xs text-muted">
                                <PlanLine sets={e.target_sets} reps={e.target_reps} />
                              </p>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              )
            })()}

            {sheet === 'maxes' && (
              <div className="max-h-[75vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-ink">
                  Your maxes{' '}
                  <HelpTip title="Where do I get my max?">
                    <p>Use the heaviest weight you can lift for one clean rep, or tap the estimate link and enter a recent set.</p>
                    <p>A guess is fine to start. You can change it any time and your weights update.</p>
                  </HelpTip>
                </h2>
                <p className="mb-2 text-xs text-muted">
                  Enter your one-rep max in pounds for each lift. The app uses it to work out your weights from the
                  percents. You can change it any time.
                </p>
                {neededLifts().map((l) => (
                  <div key={l.key} className="border-t border-line py-3 first:border-t-0">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                        <p className="text-xs text-muted">
                          used on {l.days} {l.days === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="--"
                        value={maxDraft[l.key] ?? ''}
                        onChange={(e) => setMaxDraft((d) => ({ ...d, [l.key]: e.target.value }))}
                        aria-label={`${l.name} max in pounds`}
                        className={`input-field w-24 text-center ${NO_SPINNER}`}
                      />
                      <span className="text-xs text-muted">lb</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEstFor(estFor === l.key ? null : l.key)
                        setEstW('')
                        setEstR('')
                      }}
                      className="mt-1 text-xs font-semibold text-accent"
                    >
                      {estFor === l.key ? 'Hide estimate' : 'Not sure? Estimate it'}
                    </button>
                    {estFor === l.key && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>A recent hard set:</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="lb"
                          value={estW}
                          onChange={(e) => setEstW(e.target.value)}
                          aria-label="Weight lifted"
                          className={`input-field w-20 text-center ${NO_SPINNER}`}
                        />
                        <span>&times;</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          value={estR}
                          onChange={(e) => setEstR(e.target.value)}
                          aria-label="Reps"
                          className={`input-field w-16 text-center ${NO_SPINNER}`}
                        />
                        {estimateMax(Number(estW), Number(estR)) > 0 && (
                          <>
                            <span>
                              &asymp; <b className="text-ink">{estimateMax(Number(estW), Number(estR))} lb</b>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setMaxDraft((d) => ({
                                  ...d,
                                  [l.key]: String(estimateMax(Number(estW), Number(estR))),
                                }))
                                setEstFor(null)
                              }}
                              className="btn-ghost-sm"
                            >
                              Use it
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="mt-2 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                  <span>Round weights to</span>
                  {[5, 2.5, 1].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => chooseStep(n)}
                      className={`rounded-full border px-3 py-1 ${
                        step === n ? 'border-accent font-bold text-accent' : 'border-line bg-glass text-ink'
                      }`}
                    >
                      {n} lb
                    </button>
                  ))}
                </div>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                <button type="button" onClick={saveMaxesNow} disabled={busy} className="btn-accent mt-3 w-full py-3">
                  {busy ? 'Saving...' : 'Save maxes'}
                </button>
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="mt-2 w-full text-center text-xs text-muted"
                >
                  Skip for now (percents still show, without weights)
                </button>
              </div>
            )}

            {sheet === 'menu' && (
              <div>
                <h2 className="text-lg font-semibold text-ink">{current.name}</h2>
                <p className="mb-2 text-xs text-muted">Options for this exercise</p>
                {[
                  {
                    label: 'Rest timer',
                    value: restOn ? 'On' : 'Off',
                    onClick: toggleRest,
                  },
                  { label: 'History', onClick: () => setSheet('history') },
                  ...(!anyDone
                    ? [{ label: 'Replace', onClick: () => setSheet('replace') }]
                    : []),
                  {
                    label: 'How-To',
                    tag: 'Coming soon',
                    onClick: () => {
                      setSheet(null)
                      flash('How-To videos are coming later')
                    },
                  },
                  { label: 'Skip this exercise', danger: true, onClick: skipExercise },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={`flex w-full items-center justify-between border-t border-line py-3.5 text-left text-base first:border-t-0 ${
                      'danger' in item && item.danger ? 'text-danger' : 'text-ink'
                    }`}
                  >
                    {item.label}
                    {'value' in item && <span className="text-sm text-muted">{item.value}</span>}
                    {'tag' in item && (
                      <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                        {item.tag}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {sheet === 'history' && (
              <div>
                <h2 className="text-lg font-semibold text-ink">History</h2>
                <p className="mb-2 text-xs text-muted">{current.name}</p>
                {exHistory.length === 0 ? (
                  <p className="py-3 text-sm text-muted">No history yet. This one will be the first.</p>
                ) : (
                  <ul>
                    {exHistory.map((h, n) => (
                      <li key={n} className="border-t border-line py-3 text-sm text-ink first:border-t-0">
                        <span className="text-muted">{h.date || 'Earlier'}: </span>
                        {h.sets.map(describe).join(', ')}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setSheet('menu')}
                  className="mt-2 text-sm font-semibold text-accent"
                >
                  &larr; Back
                </button>
              </div>
            )}

            {sheet === 'replace' && (
              <div>
                <h2 className="text-lg font-semibold text-ink">Replace {current.name}</h2>
                <p className="mb-3 text-xs text-muted">
                  Keeps the same sets and reps. Use this when a machine is busy.
                </p>
                <div className="flex gap-2">
                  <input
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="What are you doing instead?"
                    className="input-compact min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={replaceExercise}
                    disabled={busy || replaceText.trim() === ''}
                    className="btn-accent-sm"
                  >
                    Swap
                  </button>
                </div>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                <button
                  type="button"
                  onClick={() => setSheet('menu')}
                  className="mt-3 text-sm font-semibold text-accent"
                >
                  &larr; Back
                </button>
              </div>
            )}

            {sheet === 'effort' && (
              <div>
                <h2 className="text-lg font-semibold text-ink">{current.name} done</h2>
                <p className="mb-3 text-xs text-muted">
                  How did it feel?{' '}
                  <HelpTip title="Why rate it?">
                    <p>
                      1 is very easy and 5 is max effort. Your rating helps adjust your training and shows how the
                      program is working for you.
                    </p>
                    <p>You can skip it, but it takes one tap.</p>
                  </HelpTip>
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {EFFORT_LABELS.map((label, n) => {
                    const value = n + 1
                    const selected = pickedEffort === value
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => pickEffort(value)}
                        className={`flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-3 transition-colors ${
                          selected
                            ? 'border-accent bg-accent text-ink'
                            : 'border-line bg-glass text-muted'
                        }`}
                      >
                        <span className="text-xl font-bold text-ink">{value}</span>
                        <span className="text-[9px] leading-tight">{label}</span>
                      </button>
                    )
                  })}
                </div>

                {noteOpen ? (
                  <div>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="Anything to add? (optional)"
                      className="input-compact mt-3 w-full"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void submitEffort(pickedEffort)}
                      className="btn-accent mt-3 w-full"
                    >
                      Save &amp; next
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (advanceTimer.current) clearTimeout(advanceTimer.current)
                        setNoteOpen(true)
                      }}
                      className="text-sm font-semibold text-accent"
                    >
                      + Add a note
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void submitEffort(null)}
                      className="text-sm text-muted hover:text-ink"
                    >
                      Skip rating
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

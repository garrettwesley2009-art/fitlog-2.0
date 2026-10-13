'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startWorkoutForCurrentDay, finishWorkout } from '@/app/actions/workouts'
import { deleteLoggedSet, saveExerciseFeedback } from '@/app/actions/log'
import { parseSetGoals, parseRests } from '@/lib/log-plan'

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

function describe(s: LastTimeSet) {
  return `${s.weight ?? '-'}x${s.reps ?? '-'}`
}

function buildExercises(
  day: DayLite | null,
  logged: LoggedSet[],
  lastTime: Record<string, LastTime>,
  feedback: FeedbackEntry[]
): ExState[] {
  return (day?.exercises ?? []).map((plan, index) => {
    const swap = feedback.find(
      (f) => f.exercise_name === plan.exercise_name && f.status === 'swapped' && f.swapped_to_name
    )
    const name = swap?.swapped_to_name ?? plan.exercise_name
    const fb = feedback.find((f) => f.exercise_name === name && f.status !== 'swapped')

    const goals = parseSetGoals(plan.target_reps, plan.target_sets)
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
          done: true,
          touchedWeight: true,
        })
        continue
      }
      // Reps start at the plan; weight starts at what they lifted last time.
      const prev = last ? (last.sets[i] ?? last.sets[last.sets.length - 1]) : undefined
      sets.push({
        reps: numStr(goals[i]?.reps ?? prev?.reps),
        weight: numStr(prev?.weight),
        toFailure: Boolean(goals[i]?.toFailure),
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
}: {
  day: DayLite | null
  workoutLabel: string
  initialWorkoutId: string | null
  initialSets: LoggedSet[]
  lastTime: Record<string, LastTime>
  history: Record<string, LastTime[]>
  initialFeedback: FeedbackEntry[]
}) {
  const router = useRouter()

  const [exs, setExs] = useState<ExState[]>(() =>
    buildExercises(day, initialSets, lastTime, initialFeedback)
  )
  const [idx, setIdx] = useState<number>(() => {
    const first = buildExercises(day, initialSets, lastTime, initialFeedback).findIndex(
      (e) => e.status === 'active'
    )
    return first
  })
  const [workoutId, setWorkoutId] = useState<string | null>(initialWorkoutId)
  const [editing, setEditing] = useState<number | null>(null)
  const [sheet, setSheet] = useState<null | 'menu' | 'history' | 'replace' | 'effort'>(() => {
    const first = buildExercises(day, initialSets, lastTime, initialFeedback).find(
      (e) => e.status === 'active'
    )
    return first && first.sets.length > 0 && first.sets.every((s) => s.done) ? 'effort' : null
  })
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
  const startingRef = useRef<Promise<string | null> | null>(null)
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const summary = idx === -1
  const ex: ExState | null = idx >= 0 ? exs[idx] : null

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

  const stopRest = useCallback(() => setRestEndsAt(null), [])

  // Creates the workout the first time something is saved (not when the page opens).
  async function ensureWorkout(): Promise<string | null> {
    if (workoutId) return workoutId
    if (!startingRef.current) {
      startingRef.current = startWorkoutForCurrentDay()
        .then((res) => {
          if (res.ok) {
            setWorkoutId(res.workoutId)
            return res.workoutId
          }
          setError(res.error)
          return null
        })
        .finally(() => {
          startingRef.current = null
        })
    }
    return startingRef.current
  }

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

    setBusy(true)
    setError(null)
    try {
      const id = await ensureWorkout()
      if (!id) return

      const wasEditing = editing !== null
      if (set.done) {
        const removed = await deleteLoggedSet(id, ex.name, ci + 1)
        if (!removed.ok) {
          setError(removed.error)
          return
        }
      }

      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: id,
          exerciseName: ex.name,
          setIndex: ci + 1,
          weight: set.weight.trim() === '' ? 0 : Number(set.weight),
          reps: Number(set.reps),
          rpe: null,
          notes: null,
        }),
      })

      if (!res.ok) {
        setError('Could not save that set. Try again.')
        return
      }

      const loggedWeight = set.weight
      const nextSets = ex.sets.map((s, n) => {
        if (n === ci) return { ...s, done: true, touchedWeight: true }
        // The sets after this one follow the weight you actually used.
        if (!wasEditing && n > ci && !s.done && !s.touchedWeight) return { ...s, weight: loggedWeight }
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
    } finally {
      setBusy(false)
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
          { reps: last.reps, weight: last.weight, toFailure: false, done: false, touchedWeight: false },
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
    const id = await ensureWorkout()
    if (!id) return false
    const res = await saveExerciseFeedback({
      workoutId: id,
      exerciseName,
      status,
      effort,
      note: note.trim() || null,
      swappedToName: swappedTo,
      plannedSets: e.plan.target_sets,
      plannedReps: e.plan.target_reps,
    })
    return res.ok
  }

  function goToNext(from: number) {
    stopRest()
    setEditing(null)
    setSheet(null)
    const next = exs.findIndex((e, n) => n > from && e.status === 'active')
    setIdx(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
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
      sets: e.sets.map((s) => ({ ...s, done: false, touchedWeight: false, weight: '' })),
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
    if (!workoutId) {
      setError('Log at least one set before finishing.')
      return
    }
    setFinishing(true)
    setError(null)
    const res = await finishWorkout(workoutId)
    setFinishing(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.push('/dashboard')
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
      {/* Picture slot + progress + menu */}
      <div className="relative h-48 overflow-hidden rounded-card border border-line bg-linear-to-br from-accent/30 via-surface to-canvas">
        <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-2">
          <Link
            href="/dashboard"
            aria-label="Leave workout (your logged sets are saved)"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-ink/30 bg-canvas/50 text-ink"
          >
            &#10005;
          </Link>
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {exs.map((e, n) => (
              <span
                key={e.key}
                className={`h-1 flex-1 rounded-full ${
                  n < idx || e.status !== 'active'
                    ? 'bg-accent'
                    : n === idx
                      ? 'bg-ink'
                      : 'bg-ink/20'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Exercise options"
            onClick={() => setSheet('menu')}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-ink/30 bg-canvas/50 text-lg text-ink"
          >
            &#8943;
          </button>
        </div>

        {/* Exercise photo or video goes in this circle later */}
        <div className="absolute left-1/2 top-[42%] flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-ink/40 text-center text-[9px] leading-tight text-ink/60">
          exercise
          <br />
          photo
        </div>

        <div className="absolute inset-x-4 bottom-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
            Exercise {idx + 1} of {exs.length}
          </p>
          <h1 className="text-2xl font-bold italic leading-tight text-ink">{current.name}</h1>
        </div>
      </div>

      <div className="px-1">
        <p className="text-sm text-ink">
          <span className="font-semibold">
            {current.plan.target_sets ?? current.sets.length} sets
            {current.plan.target_reps ? ` · ${current.plan.target_reps}` : ''}
          </span>
          <span className="text-muted">
            {' '}
            &middot; {doneCount} of {current.sets.length} logged
          </span>
        </p>
        {current.swappedFrom && (
          <p className="mt-0.5 text-xs text-accent">Swapped in for {current.swappedFrom}</p>
        )}
      </div>

      {last && (
        <div className="inset-card px-3 py-2 text-xs text-muted">
          <span className="mr-2 font-semibold uppercase tracking-wide text-accent">Last time</span>
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
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink">
                      {editing !== null
                        ? `Editing set ${i + 1}`
                        : `Set ${i + 1} of ${current.sets.length}`}
                    </p>
                    {s.toFailure ? (
                      <span className="rounded-full border border-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                        To failure
                      </span>
                    ) : (
                      <p className="text-xs text-muted">
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
                  <span className="text-sm text-ink">
                    <b className="italic">{s.reps}</b> reps &times; <b className="italic">{s.weight || 0}</b> lb
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
                <span className="text-sm">
                  <b className="italic">{s.reps || '-'}</b> reps &times;{' '}
                  <b className="italic">{s.weight || '-'}</b> lb
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

      {/* Rest timer + the one big button */}
      <div className="sticky bottom-24 z-10 -mx-1 bg-linear-to-t from-canvas via-canvas/90 to-transparent px-1 pb-1 pt-6">
        {restEndsAt != null && (
          <div className="mx-auto mb-2 flex w-max items-center gap-3 rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-muted">
            <span>Rest</span>
            <b className="tabular-nums text-ink">{fmtClock(restLeft)}</b>
            <button type="button" onClick={stopRest} className="font-semibold text-accent">
              Skip
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (allDone) {
              setPickedEffort(current.effort)
              setNoteText(current.note)
              setNoteOpen(Boolean(current.note))
              setSheet('effort')
            } else {
              void logSet()
            }
          }}
          className="btn-accent w-full py-4 text-base"
        >
          {busy ? 'Saving...' : buttonLabel}
        </button>
      </div>

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
                <p className="mb-3 text-xs text-muted">How did it feel?</p>
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

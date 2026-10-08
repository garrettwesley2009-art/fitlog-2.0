'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startWorkoutForCurrentDay, finishWorkout } from '@/app/actions/workouts'

type DayLite = {
  id: string
  day_label: string
  exercises: { exercise_name: string; target_sets: number | null; target_reps: string | null }[]
}

export type LoggedSet = {
  id: string
  set_index: number
  weight: number | null
  reps: number | null
  rpe: number | null
  exercise_name: string
}

// One set from the most recent earlier workout that had this exercise.
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

function describeSet(s: LastTimeSet) {
  return `${s.weight ?? '-'} x ${s.reps ?? '-'}${s.rpe ? ` @ RPE ${s.rpe}` : ''}`
}

export function WorkoutLogger({
  day,
  initialWorkoutId,
  initialSets,
  lastTime,
}: {
  day: DayLite | null
  initialWorkoutId: string | null
  initialSets: LoggedSet[]
  lastTime: Record<string, LastTime>
}) {
  const router = useRouter()
  const [workoutId, setWorkoutId] = useState<string | null>(initialWorkoutId)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>(initialSets)
  const [freeformName, setFreeformName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, { weight: string; reps: string; rpe: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const startingRef = useRef<Promise<string | null> | null>(null)

  // Creates the workout the first time a set is logged (not when the page opens).
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

  function draftFor(exerciseName: string) {
    return drafts[exerciseName] ?? { weight: '', reps: '', rpe: '' }
  }

  function updateDraft(exerciseName: string, patch: Partial<{ weight: string; reps: string; rpe: string }>) {
    setDrafts((prev) => ({ ...prev, [exerciseName]: { ...draftFor(exerciseName), ...patch } }))
  }

  async function logSet(exerciseName: string) {
    if (!exerciseName.trim()) return
    setError(null)

    const id = await ensureWorkout()
    if (!id) return

    const draft = draftFor(exerciseName)
    const existingCount = loggedSets.filter((s) => s.exercise_name === exerciseName).length

    const res = await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId: id,
        exerciseName,
        setIndex: existingCount + 1,
        weight: draft.weight ? Number(draft.weight) : null,
        reps: draft.reps ? Number(draft.reps) : null,
        rpe: draft.rpe ? Number(draft.rpe) : null,
        notes: null,
      }),
    })

    if (!res.ok) {
      setError('Could not save that set. Try again.')
      return
    }

    setLoggedSets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        set_index: existingCount + 1,
        weight: draft.weight ? Number(draft.weight) : null,
        reps: draft.reps ? Number(draft.reps) : null,
        rpe: draft.rpe ? Number(draft.rpe) : null,
        exercise_name: exerciseName,
      },
    ])
    updateDraft(exerciseName, { weight: '', reps: '', rpe: '' })
  }

  async function handleFinish() {
    if (!workoutId) return
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

  const targets = new Map(
    (day?.exercises ?? []).map((e) => [e.exercise_name, e] as const)
  )

  // Today's exercises first, plus anything extra the user added and logged.
  const exercisesToShow = [
    ...new Set([
      ...(day?.exercises ?? []).map((e) => e.exercise_name),
      ...loggedSets.map((s) => s.exercise_name),
    ]),
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {exercisesToShow.map((name) => {
          const sets = loggedSets.filter((s) => s.exercise_name === name)
          const draft = draftFor(name)
          const target = targets.get(name)
          const last = lastTime[name]
          // The matching set from last time (same set number) becomes the
          // greyed-out hint in the inputs, so the target to beat is right there.
          const lastSameSet = last?.sets[sets.length] ?? last?.sets[last.sets.length - 1]
          return (
            <div key={name} className="glass-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-ink">{name}</p>
                {target?.target_sets && target.target_reps && (
                  <p className="text-sm text-muted">
                    {target.target_sets} x {target.target_reps}
                  </p>
                )}
              </div>

              {last && (
                <div className="inset-card mt-2 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    Last time{last.date ? ` - ${last.date}` : ''}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-muted">
                    {last.sets.map((s) => (
                      <li key={s.set_index}>
                        Set {s.set_index}: {describeSet(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sets.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Today</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink">
                    {sets.map((s) => (
                      <li key={s.id}>
                        Set {s.set_index}: {s.weight ?? '-'} x {s.reps ?? '-'}
                        {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  placeholder={lastSameSet?.weight != null ? String(lastSameSet.weight) : 'Weight'}
                  value={draft.weight}
                  onChange={(e) => updateDraft(name, { weight: e.target.value })}
                  className="input-compact w-24"
                />
                <input
                  type="number"
                  placeholder={lastSameSet?.reps != null ? String(lastSameSet.reps) : 'Reps'}
                  value={draft.reps}
                  onChange={(e) => updateDraft(name, { reps: e.target.value })}
                  className="input-compact w-20"
                />
                <input
                  type="number"
                  placeholder={lastSameSet?.rpe != null ? String(lastSameSet.rpe) : 'RPE'}
                  step="0.5"
                  value={draft.rpe}
                  onChange={(e) => updateDraft(name, { rpe: e.target.value })}
                  className="input-compact w-20"
                />
                <button onClick={() => logSet(name)} className="btn-accent-sm">
                  Log set
                </button>
              </div>
            </div>
          )
        })}

        <div className="inset-card p-4">
          <p className="text-sm text-muted">Add an exercise not listed above:</p>
          <div className="mt-2 flex gap-2">
            <input
              value={freeformName}
              onChange={(e) => setFreeformName(e.target.value)}
              placeholder="Exercise name"
              className="input-compact min-w-0 flex-1"
            />
            <button
              onClick={() => {
                if (freeformName.trim()) {
                  logSet(freeformName.trim())
                  setFreeformName('')
                }
              }}
              className="btn-ghost-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={handleFinish}
        disabled={finishing || loggedSets.length === 0}
        className="btn-accent w-full"
      >
        {finishing ? 'Finishing...' : 'Finish workout'}
      </button>

      <p className="text-xs text-muted">
        Every set above is saved to the cloud the moment you click &quot;Log set&quot;. Finishing
        the workout marks today as done and moves you to the next day.
      </p>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

type ProgramDayLite = {
  id: string
  day_label: string
  exercises: { exercise_name: string; target_sets: number | null; target_reps: string | null }[]
}

type LoggedSet = {
  id: string
  set_index: number
  weight: number | null
  reps: number | null
  rpe: number | null
  exercise_name: string
}

export function WorkoutLogger({ days }: { days: ProgramDayLite[] }) {
  const [selectedDay, setSelectedDay] = useState<ProgramDayLite | null>(days[0] ?? null)
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const [freeformName, setFreeformName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, { weight: string; reps: string; rpe: string }>>({})
  const [starting, setStarting] = useState(false)

  async function startWorkout(day: ProgramDayLite | null) {
    setStarting(true)
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programDayId: day?.id ?? null }),
    })
    const body = await res.json()
    setStarting(false)
    if (res.ok) {
      setWorkoutId(body.workoutId)
      const setsRes = await fetch(`/api/workouts?workoutId=${body.workoutId}`)
      const setsBody = await setsRes.json()
      type RawSet = {
        id: string
        set_index: number
        weight: number | null
        reps: number | null
        rpe: number | null
        exercises: { name: string } | null
      }
      setLoggedSets(
        (setsBody.sets ?? []).map((s: RawSet) => ({
          id: s.id,
          set_index: s.set_index,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          exercise_name: s.exercises?.name ?? '',
        }))
      )
    }
  }

  useEffect(() => {
    queueMicrotask(() => startWorkout(days[0] ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function draftFor(exerciseName: string) {
    return drafts[exerciseName] ?? { weight: '', reps: '', rpe: '' }
  }

  function updateDraft(exerciseName: string, patch: Partial<{ weight: string; reps: string; rpe: string }>) {
    setDrafts((prev) => ({ ...prev, [exerciseName]: { ...draftFor(exerciseName), ...patch } }))
  }

  async function logSet(exerciseName: string) {
    if (!workoutId || !exerciseName.trim()) return
    const draft = draftFor(exerciseName)
    const existingCount = loggedSets.filter((s) => s.exercise_name === exerciseName).length

    const res = await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId,
        exerciseName,
        setIndex: existingCount + 1,
        weight: draft.weight ? Number(draft.weight) : null,
        reps: draft.reps ? Number(draft.reps) : null,
        rpe: draft.rpe ? Number(draft.rpe) : null,
        notes: null,
      }),
    })

    if (res.ok) {
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
  }

  const exercisesToShow = selectedDay
    ? selectedDay.exercises.map((e) => e.exercise_name)
    : [...new Set(loggedSets.map((s) => s.exercise_name))]

  return (
    <div className="space-y-6">
      {days.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDay(d)
                startWorkout(d)
              }}
              className={
                selectedDay?.id === d.id ? 'btn-accent-sm' : 'btn-ghost-sm'
              }
            >
              {d.day_label}
            </button>
          ))}
        </div>
      )}

      {starting && <p className="text-sm text-muted">Starting today&apos;s session…</p>}

      <div className="space-y-4">
        {exercisesToShow.map((name) => {
          const sets = loggedSets.filter((s) => s.exercise_name === name)
          const draft = draftFor(name)
          return (
            <div key={name} className="glass-card p-4">
              <p className="font-medium text-ink">{name}</p>

              {sets.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {sets.map((s) => (
                    <li key={s.id}>
                      Set {s.set_index}: {s.weight ?? '—'} x {s.reps ?? '—'}
                      {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  placeholder="Weight"
                  value={draft.weight}
                  onChange={(e) => updateDraft(name, { weight: e.target.value })}
                  className="input-compact w-24"
                />
                <input
                  type="number"
                  placeholder="Reps"
                  value={draft.reps}
                  onChange={(e) => updateDraft(name, { reps: e.target.value })}
                  className="input-compact w-20"
                />
                <input
                  type="number"
                  placeholder="RPE"
                  step="0.5"
                  value={draft.rpe}
                  onChange={(e) => updateDraft(name, { rpe: e.target.value })}
                  className="input-compact w-20"
                />
                <button
                  onClick={() => logSet(name)}
                  disabled={!workoutId}
                  className="btn-accent-sm"
                >
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
                }
              }}
              className="btn-ghost-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted">
        Every set above is saved to the cloud the moment you click &quot;Log set&quot; — nothing waits
        for a final save.
      </p>
    </div>
  )
}

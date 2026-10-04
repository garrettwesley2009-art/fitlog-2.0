'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProgramDraft, ProgramDay, ProgramExercise } from '@/lib/types'

function emptyExercise(orderIndex: number): ProgramExercise {
  return { exercise_name: '', order_index: orderIndex, target_sets: 3, target_reps: '8-10', notes: null }
}

function emptyDay(orderIndex: number): ProgramDay {
  return { day_label: `Day ${orderIndex + 1}`, order_index: orderIndex, exercises: [emptyExercise(0)] }
}

export function ProgramBuilder({ initial }: { initial?: ProgramDraft }) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? 'My Program')
  const [days, setDays] = useState<ProgramDay[]>(initial?.days ?? [emptyDay(0)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateDay(dayIndex: number, patch: Partial<ProgramDay>) {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)))
  }

  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<ProgramExercise>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex
          ? d
          : { ...d, exercises: d.exercises.map((e, j) => (j === exIndex ? { ...e, ...patch } : e)) }
      )
    )
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length)])
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex).map((d, i) => ({ ...d, order_index: i })))
  }

  function addExercise(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex ? d : { ...d, exercises: [...d.exercises, emptyExercise(d.exercises.length)] }
      )
    )
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex
          ? d
          : {
              ...d,
              exercises: d.exercises
                .filter((_, j) => j !== exIndex)
                .map((e, j) => ({ ...e, order_index: j })),
            }
      )
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const draft: ProgramDraft = { name, days }

    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })

    const body = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(body.error ?? 'Something went wrong.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Program name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
        />
      </div>

      <div className="space-y-4">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <input
                value={day.day_label}
                onChange={(e) => updateDay(dayIndex, { day_label: e.target.value })}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-black"
              />
              {days.length > 1 && (
                <button
                  onClick={() => removeDay(dayIndex)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  Remove day
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {day.exercises.map((ex, exIndex) => (
                <div key={exIndex} className="flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Exercise name"
                    value={ex.exercise_name}
                    onChange={(e) =>
                      updateExercise(dayIndex, exIndex, { exercise_name: e.target.value })
                    }
                    className="flex-1 min-w-[160px] rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-black"
                  />
                  <input
                    type="number"
                    placeholder="Sets"
                    value={ex.target_sets ?? ''}
                    onChange={(e) =>
                      updateExercise(dayIndex, exIndex, {
                        target_sets: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-black"
                  />
                  <input
                    placeholder="Reps"
                    value={ex.target_reps ?? ''}
                    onChange={(e) => updateExercise(dayIndex, exIndex, { target_reps: e.target.value })}
                    className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-black"
                  />
                  <button
                    onClick={() => removeExercise(dayIndex, exIndex)}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => addExercise(dayIndex)}
                className="text-sm text-neutral-600 underline hover:text-neutral-900"
              >
                + Add exercise
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addDay}
          className="text-sm text-neutral-600 underline hover:text-neutral-900"
        >
          + Add day
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save program'}
      </button>
    </div>
  )
}

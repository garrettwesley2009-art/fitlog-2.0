'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProgramDraft, ProgramDay, ProgramExercise } from '@/lib/types'

function newExercise(name: string, orderIndex: number): ProgramExercise {
  return { exercise_name: name, order_index: orderIndex, target_sets: 3, target_reps: '10', notes: null }
}

function emptyDay(orderIndex: number): ProgramDay {
  return { day_label: `Day ${orderIndex + 1}`, order_index: orderIndex, exercises: [] }
}

const WEEK_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12]
const HEX = '[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]'

// Where the picker is pointed: add to the end of a day, or replace one exercise.
type Target = { day: number; replace: number | null }

export function ProgramBuilder({ initial }: { initial?: ProgramDraft }) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? 'My Program')
  const [totalWeeks, setTotalWeeks] = useState<number>(initial?.total_weeks ?? 8)
  const [days, setDays] = useState<ProgramDay[]>(initial?.days?.length ? initial.days : [emptyDay(0)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [target, setTarget] = useState<Target | null>(null)
  const [query, setQuery] = useState('')
  const [library, setLibrary] = useState<string[] | null>(null)
  const [libraryFailed, setLibraryFailed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the exercise list the first time the picker opens.
  useEffect(() => {
    if (!target || library !== null) return
    let cancelled = false
    fetch('/api/exercises')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((body: { names: string[] }) => {
        if (!cancelled) setLibrary(body.names)
      })
      .catch(() => {
        if (!cancelled) {
          setLibrary([])
          setLibraryFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [target, library])

  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current)
    },
    []
  )

  function flash(text: string) {
    setMessage(text)
    if (messageTimer.current) clearTimeout(messageTimer.current)
    messageTimer.current = setTimeout(() => setMessage(null), 1800)
  }

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

  function openPicker(t: Target) {
    setQuery('')
    setTarget(t)
  }

  function choose(exerciseName: string) {
    if (!target) return
    const picked = exerciseName.trim()
    if (!picked) return
    const day = days[target.day]
    const duplicate = day.exercises.some(
      (e, j) => j !== target.replace && e.exercise_name.trim().toLowerCase() === picked.toLowerCase()
    )
    if (duplicate) {
      flash('Already in this day')
      return
    }
    if (target.replace !== null) {
      updateExercise(target.day, target.replace, { exercise_name: picked })
    } else {
      setDays((prev) =>
        prev.map((d, i) =>
          i !== target.day
            ? d
            : { ...d, exercises: [...d.exercises, newExercise(picked, d.exercises.length)] }
        )
      )
    }
    setTarget(null)
    flash(target.replace !== null ? `Changed to ${picked}` : `Added ${picked}`)
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (library ?? []).filter((n) => n.toLowerCase().includes(q))
  }, [library, query])

  const typed = query.trim()
  const canAddCustom =
    typed.length > 0 && !(library ?? []).some((n) => n.toLowerCase() === typed.toLowerCase())

  async function handleSave() {
    setError(null)
    if (!name.trim()) {
      setError('Give your program a name.')
      return
    }
    const cleanDays = days
      .map((d, i) => ({
        ...d,
        order_index: i,
        exercises: d.exercises
          .filter((e) => e.exercise_name.trim())
          .map((e, j) => ({ ...e, order_index: j })),
      }))
      .filter((d) => d.exercises.length > 0)
    if (cleanDays.length === 0) {
      setError('Add at least one exercise.')
      return
    }

    setSaving(true)
    const draft: ProgramDraft = { name: name.trim(), total_weeks: totalWeeks, days: cleanDays }

    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Something went wrong.')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card space-y-4 p-4">
        <div>
          <label htmlFor="program-name" className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted">
            Program name
          </label>
          <input
            id="program-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor="program-length" className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted">
            Length
          </label>
          <select
            id="program-length"
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(Number(e.target.value))}
            className="input-field w-full"
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} weeks
              </option>
            ))}
          </select>
        </div>
      </div>

      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="glass-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              aria-label={`Name of day ${dayIndex + 1}`}
              value={day.day_label}
              onChange={(e) => updateDay(dayIndex, { day_label: e.target.value })}
              className="w-full border-b border-line bg-transparent py-1 text-lg font-bold text-ink outline-none focus:border-ink"
            />
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(dayIndex)}
                className="flex-none text-xs text-muted hover:text-danger"
              >
                Remove day
              </button>
            )}
          </div>

          {day.exercises.length === 0 && (
            <p className="mb-3 text-sm text-muted">No exercises yet.</p>
          )}

          {day.exercises.map((ex, exIndex) => (
            <div key={exIndex} className="inset-card mb-2 p-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-[34px] w-[30px] flex-none items-center justify-center bg-line text-xs font-bold text-ink ${HEX}`}
                >
                  {exIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => openPicker({ day: dayIndex, replace: exIndex })}
                  className="min-w-0 flex-1 text-left"
                  aria-label={`Change ${ex.exercise_name}`}
                >
                  <span className="block text-sm font-semibold text-ink">{ex.exercise_name}</span>
                  <span className="text-[11px] text-muted">Tap to change</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${ex.exercise_name}`}
                  onClick={() => removeExercise(dayIndex, exIndex)}
                  className="flex-none px-1.5 text-lg text-muted hover:text-danger"
                >
                  &#10005;
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between rounded-xl border border-line px-3 py-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted">Sets</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Fewer sets"
                      onClick={() =>
                        updateExercise(dayIndex, exIndex, {
                          target_sets: Math.max(1, (ex.target_sets ?? 3) - 1),
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-glass-hover text-lg text-ink"
                    >
                      &minus;
                    </button>
                    <b className="min-w-6 text-center italic text-ink">{ex.target_sets ?? 3}</b>
                    <button
                      type="button"
                      aria-label="More sets"
                      onClick={() =>
                        updateExercise(dayIndex, exIndex, {
                          target_sets: Math.min(10, (ex.target_sets ?? 3) + 1),
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-glass-hover text-lg text-ink"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-1.5">
                  <label htmlFor={`reps-${dayIndex}-${exIndex}`} className="text-[10px] uppercase tracking-wide text-muted">
                    Reps
                  </label>
                  <input
                    id={`reps-${dayIndex}-${exIndex}`}
                    value={ex.target_reps ?? ''}
                    onChange={(e) => updateExercise(dayIndex, exIndex, { target_reps: e.target.value })}
                    placeholder="8-10"
                    className="w-full min-w-0 bg-transparent py-1.5 text-right font-bold italic text-ink outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => openPicker({ day: dayIndex, replace: null })}
            className="w-full rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-muted hover:border-ink hover:text-ink"
          >
            + Add exercise
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="w-full rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-muted hover:border-ink hover:text-ink"
      >
        + Add day
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="sticky bottom-24 z-10 -mx-1 bg-linear-to-t from-canvas via-canvas/90 to-transparent px-1 pb-1 pt-6">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-accent w-full py-4 text-base">
          {saving ? 'Saving...' : 'Save program'}
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-lg"
        >
          {message}
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-canvas/70"
            onClick={() => setTarget(null)}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto flex h-[80vh] max-w-xl flex-col rounded-t-[1.75rem] border border-b-0 border-line bg-surface px-5 pb-6 pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <h2 className="mb-2 text-lg font-semibold text-ink">
              {target.replace !== null ? 'Change exercise' : 'Add an exercise'}
            </h2>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises..."
              aria-label="Search exercises"
              className="input-field w-full"
            />
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {library === null && <p className="py-4 text-sm text-muted">Loading exercises...</p>}
              {libraryFailed && (
                <p className="py-2 text-sm text-muted">
                  Could not load the exercise list. You can still type a name and add it.
                </p>
              )}
              {canAddCustom && (
                <button
                  type="button"
                  onClick={() => choose(typed)}
                  className="flex w-full items-center justify-between border-b border-line py-3.5 text-left text-accent"
                >
                  <span>Add &ldquo;{typed}&rdquo;</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">custom</span>
                </button>
              )}
              {matches.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => choose(n)}
                  className="flex w-full items-center border-b border-line py-3.5 text-left text-ink hover:text-accent"
                >
                  {n}
                </button>
              ))}
              {library !== null && matches.length === 0 && !canAddCustom && (
                <p className="py-4 text-sm text-muted">No exercises yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { clampWeeks, getCurrentProgram, getOrCreateExercise, getProgramPosition } from '@/lib/data'

// The Build page sends back the ids it was given, so an edit can update the
// existing rows in place. That keeps logged workouts and progress attached to
// the days they belong to.
export type EditExercise = {
  id?: string
  exercise_name: string
  order_index: number
  target_sets: number | null
  target_reps: string | null
  notes: string | null
}
export type EditDay = { id?: string; day_label: string; order_index: number; exercises: EditExercise[] }
export type EditDraft = { name: string; total_weeks?: number; days: EditDay[] }

export type EditResult = { ok: true } | { ok: false; status: number; error: string }

const fail = (status: number, error: string): EditResult => ({ ok: false, status, error })

export async function updateProgramFromDraft(
  supabase: SupabaseClient,
  userId: string,
  programId: string,
  draft: EditDraft
): Promise<EditResult> {
  const { data: program } = await supabase
    .from('user_programs')
    .select('id')
    .eq('id', programId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!program) return fail(404, 'That program was not found.')

  if (!draft?.name?.trim() || !Array.isArray(draft.days) || draft.days.length === 0) {
    return fail(400, 'A program needs a name and at least one day.')
  }

  // Where the person is right now (only meaningful for their current program).
  // New days get "skipped" marks in weeks already passed, so adding a day never
  // sends them back to an earlier week.
  const current = await getCurrentProgram(supabase, userId)
  let weeksPassed = 0
  if (current && current.id === programId) {
    const position = await getProgramPosition(supabase, current)
    weeksPassed = position.finished ? position.totalWeeks : position.week - 1
  }

  const { data: existingDays } = await supabase
    .from('user_program_days')
    .select('id, day_label, user_program_exercises(id)')
    .eq('user_program_id', programId)

  type ExistingDay = { id: string; day_label: string; user_program_exercises: { id: string }[] }
  const existing = (existingDays ?? []) as unknown as ExistingDay[]
  const existingById = new Map(existing.map((d) => [d.id, d]))

  const keptIds = new Set(
    draft.days.map((d) => d.id).filter((id): id is string => !!id && existingById.has(id))
  )
  const removed = existing.filter((d) => !keptIds.has(d.id))

  // A day that already has logged workouts cannot be deleted.
  if (removed.length > 0) {
    const { data: used } = await supabase
      .from('workouts')
      .select('user_program_day_id')
      .in('user_program_day_id', removed.map((d) => d.id))
    const usedIds = new Set((used ?? []).map((w: { user_program_day_id: string }) => w.user_program_day_id))
    const blocked = removed.filter((d) => usedIds.has(d.id))
    if (blocked.length > 0) {
      return fail(
        400,
        `"${blocked[0].day_label}" already has logged workouts, so it can't be removed. Put it back and change it instead.`
      )
    }
  }

  const totalWeeks = clampWeeks(draft.total_weeks)
  const { error: programError } = await supabase
    .from('user_programs')
    .update({ name: draft.name.trim(), total_weeks: totalWeeks })
    .eq('id', programId)
  if (programError) return fail(500, 'Could not save the program.')

  const newDayIds: string[] = []

  for (let i = 0; i < draft.days.length; i++) {
    const day = draft.days[i]
    const label = day.day_label?.trim() || `Day ${i + 1}`
    let dayId: string
    const known = day.id ? existingById.get(day.id) : undefined

    if (known) {
      dayId = known.id
      const { error } = await supabase
        .from('user_program_days')
        .update({ day_label: label, order_index: i })
        .eq('id', dayId)
      if (error) return fail(500, 'Could not save a day.')
    } else {
      const { data: created, error } = await supabase
        .from('user_program_days')
        .insert({ user_program_id: programId, day_label: label, order_index: i })
        .select('id')
        .single()
      if (error || !created) return fail(500, 'Could not add a day.')
      dayId = created.id as string
      newDayIds.push(dayId)
    }

    const existingExerciseIds = new Set((known?.user_program_exercises ?? []).map((e) => e.id))
    const keptExerciseIds = new Set<string>()

    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j]
      const name = ex.exercise_name?.trim()
      if (!name) continue
      const exerciseId = await getOrCreateExercise(supabase, userId, name)
      const row = {
        exercise_id: exerciseId,
        order_index: j,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        notes: ex.notes,
      }

      if (ex.id && existingExerciseIds.has(ex.id)) {
        keptExerciseIds.add(ex.id)
        const { error } = await supabase.from('user_program_exercises').update(row).eq('id', ex.id)
        if (error) return fail(500, 'Could not save an exercise.')
      } else {
        const { error } = await supabase
          .from('user_program_exercises')
          .insert({ ...row, user_program_day_id: dayId })
        if (error) return fail(500, 'Could not add an exercise.')
      }
    }

    const toDelete = [...existingExerciseIds].filter((id) => !keptExerciseIds.has(id))
    if (toDelete.length > 0) {
      await supabase.from('user_program_exercises').delete().in('id', toDelete)
    }
  }

  if (removed.length > 0) {
    // Their exercises and any progress marks go with them.
    await supabase.from('user_program_days').delete().in('id', removed.map((d) => d.id))
  }

  const passed = Math.min(weeksPassed, totalWeeks)
  if (newDayIds.length > 0 && passed > 0) {
    const marks = newDayIds.flatMap((dayId) =>
      Array.from({ length: passed }, (_, k) => ({
        user_program_id: programId,
        user_program_day_id: dayId,
        week_number: k + 1,
        status: 'skipped',
      }))
    )
    await supabase
      .from('program_day_progress')
      .upsert(marks, { onConflict: 'user_program_id,user_program_day_id,week_number' })
  }

  return { ok: true }
}

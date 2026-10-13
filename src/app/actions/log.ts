'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrCreateExercise } from '@/lib/data'

type Result = { ok: true } | { ok: false; error: string }

// Removes one logged set (when the check mark is un-ticked or a row is removed).
export async function deleteLoggedSet(
  workoutId: string,
  exerciseName: string,
  setIndex: number
): Promise<Result> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const { data: workout } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!workout) return { ok: false, error: 'Workout not found.' }

  const exerciseId = await getOrCreateExercise(supabase, user.id, exerciseName)

  const { error } = await supabase
    .from('sets')
    .delete()
    .eq('workout_id', workoutId)
    .eq('exercise_id', exerciseId)
    .eq('set_index', setIndex)

  if (error) return { ok: false, error: 'Could not remove that set.' }
  return { ok: true }
}

export type FeedbackInput = {
  workoutId: string
  exerciseName: string
  status: 'done' | 'skipped' | 'swapped'
  effort: number | null
  note: string | null
  swappedToName: string | null
  plannedSets: number | null
  plannedReps: string | null
}

// Saves (or updates) the feedback row for one exercise in one workout. The
// numbers about what was actually lifted are recalculated here from the sets
// table, so the saved row always matches what is logged.
export async function saveExerciseFeedback(input: FeedbackInput): Promise<Result> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const effort =
    input.effort == null ? null : Math.min(5, Math.max(1, Math.round(input.effort)))
  const note = input.note?.trim() ? input.note.trim().slice(0, 1000) : null

  const { data: workout } = await supabase
    .from('workouts')
    .select('id, user_program_id, user_program_day_id, week_number')
    .eq('id', input.workoutId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!workout) return { ok: false, error: 'Workout not found.' }

  const exerciseId = await getOrCreateExercise(supabase, user.id, input.exerciseName)

  const { data: sets } = await supabase
    .from('sets')
    .select('weight, reps')
    .eq('workout_id', input.workoutId)
    .eq('exercise_id', exerciseId)

  let setsDone = 0
  let topWeight: number | null = null
  let totalReps = 0
  let totalVolume = 0
  for (const s of (sets ?? []) as { weight: number | null; reps: number | null }[]) {
    setsDone += 1
    if (s.weight != null && (topWeight == null || s.weight > topWeight)) topWeight = s.weight
    if (s.reps != null) totalReps += s.reps
    if (s.weight != null && s.reps != null) totalVolume += s.weight * s.reps
  }

  const { error } = await supabase.from('exercise_feedback').upsert(
    {
      user_id: user.id,
      workout_id: input.workoutId,
      exercise_id: exerciseId,
      exercise_name: input.exerciseName,
      status: input.status,
      effort,
      note,
      swapped_to_name: input.status === 'swapped' ? input.swappedToName : null,
      sets_planned: input.plannedSets,
      reps_planned: input.plannedReps,
      sets_done: setsDone,
      top_weight: topWeight,
      total_reps: totalReps,
      total_volume: totalVolume,
      user_program_id: workout.user_program_id,
      user_program_day_id: workout.user_program_day_id,
      week_number: workout.week_number,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workout_id,exercise_id' }
  )

  if (error) return { ok: false, error: 'Could not save your feedback.' }
  return { ok: true }
}

// Used by "Undo" after skipping or swapping an exercise.
export async function clearExerciseFeedback(
  workoutId: string,
  exerciseName: string
): Promise<Result> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const exerciseId = await getOrCreateExercise(supabase, user.id, exerciseName)

  const { error } = await supabase
    .from('exercise_feedback')
    .delete()
    .eq('workout_id', workoutId)
    .eq('exercise_id', exerciseId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: 'Could not undo that.' }
  return { ok: true }
}

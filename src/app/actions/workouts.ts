'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram, getProgramPosition } from '@/lib/data'

const PROGRESS_CONFLICT = 'user_program_id,user_program_day_id,week_number'

// Marks the user's current day as skipped and moves on to the next one.
export async function skipCurrentDay(): Promise<void> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) redirect('/login')

  const program = await getCurrentProgram(supabase, user.id)
  if (!program) redirect('/dashboard')

  const position = await getProgramPosition(supabase, program)
  if (position.finished) redirect('/dashboard')

  await supabase.from('program_day_progress').upsert(
    {
      user_program_id: program.id,
      user_program_day_id: position.day.id,
      week_number: position.week,
      status: 'skipped',
    },
    { onConflict: PROGRESS_CONFLICT }
  )

  revalidatePath('/dashboard')
  revalidatePath('/log')
  redirect('/dashboard')
}

// Creates the workout for the current day when the first set is logged.
// If a workout already exists for this (program, week, day), returns it
// instead, so refreshing the page never creates duplicates.
export async function startWorkoutForCurrentDay(): Promise<
  { ok: true; workoutId: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const program = await getCurrentProgram(supabase, user.id)

  // No program: freeform logging, one workout per session with no week/day.
  if (!program) {
    const { data: created, error } = await supabase
      .from('workouts')
      .insert({ user_id: user.id })
      .select('id')
      .single()
    if (error || !created) return { ok: false, error: 'Could not start the workout.' }
    return { ok: true, workoutId: created.id as string }
  }

  const position = await getProgramPosition(supabase, program)
  if (position.finished) return { ok: false, error: 'This program is finished.' }

  const { data: existing } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', user.id)
    .eq('user_program_id', program.id)
    .eq('week_number', position.week)
    .eq('user_program_day_id', position.day.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return { ok: true, workoutId: existing.id as string }

  const { data: created, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      user_program_id: program.id,
      user_program_day_id: position.day.id,
      week_number: position.week,
    })
    .select('id')
    .single()

  if (error || !created) return { ok: false, error: 'Could not start the workout.' }
  return { ok: true, workoutId: created.id as string }
}

// Marks the day this workout belongs to as done.
export async function finishWorkout(
  workoutId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const { data: workout } = await supabase
    .from('workouts')
    .select('id, user_program_id, user_program_day_id, week_number')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!workout) return { ok: false, error: 'Workout not found.' }

  const { count } = await supabase
    .from('sets')
    .select('id', { count: 'exact', head: true })
    .eq('workout_id', workoutId)

  if (!count) return { ok: false, error: 'Log at least one set before finishing.' }

  if (workout.user_program_id && workout.user_program_day_id && workout.week_number) {
    const { error } = await supabase.from('program_day_progress').upsert(
      {
        user_program_id: workout.user_program_id,
        user_program_day_id: workout.user_program_day_id,
        week_number: workout.week_number,
        status: 'done',
        workout_id: workout.id,
      },
      { onConflict: PROGRESS_CONFLICT }
    )
    if (error) return { ok: false, error: 'Could not save your progress.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/log')
  return { ok: true }
}

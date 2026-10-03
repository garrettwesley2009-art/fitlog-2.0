import { SupabaseClient } from '@supabase/supabase-js'
import { ProgramDraft } from '@/lib/types'

// The user's most recently created program, with its days and exercises
// nested, in display order. Treated as "the current program" for v1 --
// no multi-program switching UI yet, but the schema supports it later.
export async function getCurrentProgram(supabase: SupabaseClient, userId: string) {
  const { data: program } = await supabase
    .from('user_programs')
    .select('id, name, source, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!program) return null

  const { data: days } = await supabase
    .from('user_program_days')
    .select(
      'id, day_label, order_index, user_program_exercises(id, order_index, target_sets, target_reps, notes, exercises(id, name))'
    )
    .eq('user_program_id', program.id)
    .order('order_index', { ascending: true })

  type RawDay = {
    id: string
    day_label: string
    order_index: number
    user_program_exercises: {
      id: string
      order_index: number
      target_sets: number | null
      target_reps: string | null
      notes: string | null
      exercises: { id: string; name: string } | null
    }[]
  }

  const sortedDays = ((days ?? []) as unknown as RawDay[]).map((d) => ({
    id: d.id,
    day_label: d.day_label,
    order_index: d.order_index,
    exercises: [...d.user_program_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((e) => ({
        id: e.id,
        exercise_id: e.exercises?.id,
        exercise_name: e.exercises?.name ?? '(unknown exercise)',
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        notes: e.notes,
      })),
  }))

  return { ...program, days: sortedDays }
}

export async function getOrCreateExercise(
  supabase: SupabaseClient,
  userId: string,
  name: string
) {
  const trimmed = name.trim()
  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return existing.id as string

  const { data: created, error } = await supabase
    .from('exercises')
    .insert({ name: trimmed, is_custom: true, created_by: userId })
    .select('id')
    .single()

  if (error) throw error
  return created.id as string
}

// Builds a full user_program (+ days + exercises) from a flat draft object,
// resolving/creating each exercise by name. Shared by the manual program
// builder and the AI assistant's "apply this program" action.
export async function insertProgramFromDraft(
  supabase: SupabaseClient,
  userId: string,
  draft: ProgramDraft,
  source: 'manual' | 'ai_customized'
) {
  const { data: program, error: programError } = await supabase
    .from('user_programs')
    .insert({ user_id: userId, name: draft.name, source })
    .select('id')
    .single()

  if (programError || !program) {
    throw programError ?? new Error('Failed to create program')
  }

  for (const day of draft.days) {
    const { data: newDay, error: dayError } = await supabase
      .from('user_program_days')
      .insert({
        user_program_id: program.id,
        day_label: day.day_label,
        order_index: day.order_index,
      })
      .select('id')
      .single()

    if (dayError || !newDay) continue

    for (const ex of day.exercises) {
      const exerciseId = await getOrCreateExercise(supabase, userId, ex.exercise_name)
      await supabase.from('user_program_exercises').insert({
        user_program_day_id: newDay.id,
        exercise_id: exerciseId,
        order_index: ex.order_index,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        notes: ex.notes,
      })
    }
  }

  return program.id as string
}

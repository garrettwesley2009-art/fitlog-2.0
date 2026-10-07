import { SupabaseClient } from '@supabase/supabase-js'
import { ProgramDraft } from '@/lib/types'

export function clampWeeks(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 8
  return Math.min(12, Math.max(4, Math.round(n)))
}

// The user's most recently created program, with its days and exercises
// nested, in display order. Treated as "the current program" for v1 --
// no multi-program switching UI yet, but the schema supports it later.
export async function getCurrentProgram(supabase: SupabaseClient, userId: string) {
  const { data: program } = await supabase
    .from('user_programs')
    .select('id, name, source, created_at, total_weeks')
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

export type CurrentProgram = NonNullable<Awaited<ReturnType<typeof getCurrentProgram>>>

export type ProgramPosition =
  | { finished: true; totalWeeks: number; totalDays: number; doneCount: number }
  | {
      finished: false
      week: number
      totalWeeks: number
      dayIndex: number
      day: CurrentProgram['days'][number]
      totalDays: number
      doneCount: number
    }

// Where the user is in their program: the first (week, day) that has not
// been marked done or skipped. Nothing is stored for "current day" -- it is
// always derived from program_day_progress, so it can't drift out of sync.
export async function getProgramPosition(
  supabase: SupabaseClient,
  program: CurrentProgram
): Promise<ProgramPosition> {
  const totalWeeks = clampWeeks(program.total_weeks)
  const totalDays = totalWeeks * program.days.length

  const { data: rows } = await supabase
    .from('program_day_progress')
    .select('user_program_day_id, week_number')
    .eq('user_program_id', program.id)

  const finished = new Set(
    (rows ?? []).map(
      (r: { user_program_day_id: string; week_number: number }) =>
        `${r.week_number}:${r.user_program_day_id}`
    )
  )
  const doneCount = finished.size

  for (let week = 1; week <= totalWeeks; week++) {
    for (let dayIndex = 0; dayIndex < program.days.length; dayIndex++) {
      const day = program.days[dayIndex]
      if (!finished.has(`${week}:${day.id}`)) {
        return { finished: false, week, totalWeeks, dayIndex, day, totalDays, doneCount }
      }
    }
  }

  return { finished: true, totalWeeks, totalDays, doneCount }
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
    .insert({
      user_id: userId,
      name: draft.name,
      source,
      total_weeks: clampWeeks(draft.total_weeks),
    })
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

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clampWeeks } from '@/lib/data'

// Copies a template's days/exercises into a brand new program owned by the
// current user. Used by the "Use this template" button on a template's page.
export async function createProgramFromTemplate(formData: FormData) {
  const templateId = String(formData.get('templateId') ?? '')
  if (!templateId) return

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) redirect('/login')

  const { data: template } = await supabase
    .from('templates')
    .select('id, name, total_weeks')
    .eq('id', templateId)
    .single()

  if (!template) redirect('/templates')

  const { data: templateDays } = await supabase
    .from('template_days')
    .select(
      'id, day_label, order_index, template_exercises(exercise_id, order_index, target_sets, target_reps, notes)'
    )
    .eq('template_id', templateId)
    .order('order_index', { ascending: true })

  const { data: newProgram, error: programError } = await supabase
    .from('user_programs')
    .insert({
      user_id: user!.id,
      name: template.name,
      source: 'template',
      source_template_id: template.id,
      total_weeks: clampWeeks(template.total_weeks),
    })
    .select('id')
    .single()

  if (programError || !newProgram) redirect('/templates')

  for (const day of templateDays ?? []) {
    const { data: newDay, error: dayError } = await supabase
      .from('user_program_days')
      .insert({
        user_program_id: newProgram.id,
        day_label: day.day_label,
        order_index: day.order_index,
      })
      .select('id')
      .single()

    if (dayError || !newDay) continue

    const exerciseRows = (day.template_exercises ?? []).map((e) => ({
      user_program_day_id: newDay.id,
      exercise_id: e.exercise_id,
      order_index: e.order_index,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
      notes: e.notes,
    }))

    if (exerciseRows.length > 0) {
      await supabase.from('user_program_exercises').insert(exerciseRows)
    }
  }

  redirect('/dashboard')
}

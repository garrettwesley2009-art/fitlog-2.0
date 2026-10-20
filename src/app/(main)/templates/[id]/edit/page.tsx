import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProgramBuilder } from '@/components/program-builder'
import type { ProgramDraft } from '@/lib/types'

// Opens a template in the Build page so the person can change anything, then
// saves it as a brand new program of their own. The original template is never touched.
export default async function EditTemplateCopyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('templates')
    .select('id, name, total_weeks')
    .eq('id', id)
    .single()

  if (!template) notFound()

  const { data: days } = await supabase
    .from('template_days')
    .select(
      'day_label, order_index, template_exercises(order_index, target_sets, target_reps, notes, exercises(name))'
    )
    .eq('template_id', id)
    .order('order_index', { ascending: true })

  const draft: ProgramDraft = {
    name: `${template.name} (my copy)`,
    total_weeks: template.total_weeks ?? 8,
    days: (days ?? []).map((d, i) => ({
      day_label: d.day_label,
      order_index: i,
      exercises: (d.template_exercises ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((ex, j) => {
          const exerciseName = Array.isArray(ex.exercises)
            ? ex.exercises[0]?.name
            : (ex.exercises as unknown as { name: string } | null)?.name
          return {
            exercise_name: exerciseName ?? '',
            order_index: j,
            target_sets: ex.target_sets ?? null,
            target_reps: ex.target_reps ?? null,
            notes: ex.notes ?? null,
          }
        })
        .filter((ex) => ex.exercise_name),
    })),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit your copy of {template.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Change anything you like. Saving puts a copy in your programs. The original template stays the same.
        </p>
      </div>
      <ProgramBuilder initial={draft} />
    </div>
  )
}

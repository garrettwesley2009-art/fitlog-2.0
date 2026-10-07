import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createProgramFromTemplate } from '@/app/actions/programs'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('templates')
    .select('id, name, description, total_weeks')
    .eq('id', id)
    .single()

  if (!template) notFound()

  const { data: days } = await supabase
    .from('template_days')
    .select(
      'id, day_label, order_index, template_exercises(order_index, target_sets, target_reps, notes, exercises(name))'
    )
    .eq('template_id', id)
    .order('order_index', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {template.total_weeks} weeks &middot; {(days ?? []).length} days per week
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{template.name}</h1>
        {template.description && <p className="mt-1 text-sm text-muted">{template.description}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={createProgramFromTemplate}>
          <input type="hidden" name="templateId" value={template.id} />
          <button type="submit" className="btn-accent">
            Use this template
          </button>
        </form>
        <Link href={`/assistant?templateId=${template.id}`} className="btn-ghost">
          Customize with AI first
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(days ?? []).map((day) => (
          <div key={day.id} className="glass-card p-4">
            <p className="font-medium text-ink">{day.day_label}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {(day.template_exercises ?? [])
                .sort((a, b) => a.order_index - b.order_index)
                .map((ex, i) => {
                  const exerciseName = Array.isArray(ex.exercises)
                    ? ex.exercises[0]?.name
                    : (ex.exercises as unknown as { name: string } | null)?.name
                  return (
                    <li key={i}>
                      {exerciseName}
                      {ex.target_sets && ex.target_reps ? ` - ${ex.target_sets}x${ex.target_reps}` : ''}
                      {ex.notes ? ` (${ex.notes})` : ''}
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

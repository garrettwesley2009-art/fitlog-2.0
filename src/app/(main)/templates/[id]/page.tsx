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
    .select('id, name, description')
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
        <h1 className="text-2xl font-semibold text-neutral-900">{template.name}</h1>
        {template.description && <p className="mt-1 text-sm text-neutral-500">{template.description}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={createProgramFromTemplate}>
          <input type="hidden" name="templateId" value={template.id} />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Use this template
          </button>
        </form>
        <Link
          href={`/assistant?templateId=${template.id}`}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          Customize with AI first
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(days ?? []).map((day) => (
          <div key={day.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="font-medium text-neutral-900">{day.day_label}</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {(day.template_exercises ?? [])
                .sort((a, b) => a.order_index - b.order_index)
                .map((ex, i) => {
                  const exerciseName = Array.isArray(ex.exercises)
                    ? ex.exercises[0]?.name
                    : (ex.exercises as unknown as { name: string } | null)?.name
                  return (
                    <li key={i}>
                      {exerciseName}
                      {ex.target_sets && ex.target_reps ? ` — ${ex.target_sets}x${ex.target_reps}` : ''}
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

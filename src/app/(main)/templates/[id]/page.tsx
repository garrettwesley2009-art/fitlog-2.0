import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createProgramFromTemplate } from '@/app/actions/programs'
import { categoriesFor, categoryLabel, isNewTemplate } from '@/lib/template-meta'
import { NewBadge } from '@/components/new-badge'
import { BackButton } from '@/components/back-button'
import { describePlan } from '@/lib/log-plan'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('templates')
    .select('id, name, description, total_weeks, created_at')
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

  const categories = categoriesFor(template.name, template.description)
  const isNew = isNewTemplate(template.created_at)

  return (
    <div className="space-y-6">
      <BackButton href="/templates" label="Templates" />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {template.total_weeks} weeks &middot; {(days ?? []).length} days per week
          </p>
          {isNew && <NewBadge />}
        </div>
        <h1 className="mt-1 font-display text-[34px] font-extrabold text-ink">{template.name}</h1>
        {categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-line-strong px-2 py-0.5 text-xs uppercase tracking-wide text-muted"
              >
                {categoryLabel(c)}
              </span>
            ))}
          </div>
        )}
        {template.description && <p className="mt-2 text-sm text-muted">{template.description}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={createProgramFromTemplate}>
          <input type="hidden" name="templateId" value={template.id} />
          <button type="submit" className="btn-accent">
            Use this template
          </button>
        </form>
        <Link href={`/templates/${template.id}/edit`} className="btn-ghost">
          Edit my own copy
        </Link>
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
                      {ex.target_sets && ex.target_reps ? ` - ${describePlan(ex.target_sets, ex.target_reps)}` : ''}
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

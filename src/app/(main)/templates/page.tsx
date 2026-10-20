import { createClient } from '@/lib/supabase/server'
import { categoriesFor, isNewTemplate } from '@/lib/template-meta'
import { TemplateBrowser, type TemplateCard } from '@/components/template-browser'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, description, total_weeks, created_at, template_days(id)')
    .order('name', { ascending: true })

  const cards: TemplateCard[] = (templates ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    description: (t.description as string | null) ?? null,
    total_weeks: t.total_weeks as number,
    day_count: Array.isArray(t.template_days) ? t.template_days.length : 0,
    is_new: isNewTemplate(t.created_at as string | null),
    categories: categoriesFor(t.name as string, (t.description as string | null) ?? null),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Templates</h1>
        <p className="mt-1 text-sm text-muted">
          Pick one to start from, edit your own copy, or customize it with the coach.
        </p>
      </div>

      {cards.length > 0 ? (
        <TemplateBrowser templates={cards} />
      ) : (
        <p className="text-sm text-muted">
          No templates are loaded yet -- run the seed SQL in your Supabase project to add some.
        </p>
      )}
    </div>
  )
}

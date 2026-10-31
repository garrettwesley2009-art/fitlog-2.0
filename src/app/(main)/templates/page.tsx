import Link from 'next/link'
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
        <h1 className="font-display text-[34px] font-extrabold text-ink">Programs</h1>
        <p className="mt-1 text-sm text-muted">
          Pick one to start from, edit your own copy, or customize it with the coach.
        </p>
      </div>

      {/* PROGRAMS-TAB: Build lives here now, so Workout has one Programs tab */}
      <div className="card border-accent p-4">
        <h2 className="font-display text-2xl font-bold text-ink">Make your own</h2>
        <p className="mt-1 text-sm text-muted">
          Start from a blank page, or let the Coach build one from your goals.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/programs/new" className="btn-accent">
            Build your own
          </Link>
          <Link href="/assistant" className="btn-ghost">
            Ask the Coach
          </Link>
        </div>
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

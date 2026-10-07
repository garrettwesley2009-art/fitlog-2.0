import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('templates')
    .select('id, name, description')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Templates</h1>
        <p className="mt-1 text-sm text-muted">
          Pick one to start from, then customize it yourself or with the AI assistant.
        </p>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="glass-card p-5 transition-colors hover:bg-glass-hover"
            >
              <h2 className="font-medium text-ink">{t.name}</h2>
              {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          No templates are loaded yet -- run the seed SQL in your Supabase project to add some.
        </p>
      )}
    </div>
  )
}

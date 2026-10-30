'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CATEGORIES, categoryLabel, type CategoryId } from '@/lib/template-meta'
import { NewBadge } from '@/components/new-badge'

export type TemplateCard = {
  id: string
  name: string
  description: string | null
  total_weeks: number
  day_count: number
  is_new: boolean
  categories: CategoryId[]
}

type Filter = 'all' | 'new' | CategoryId

export function TemplateBrowser({ templates }: { templates: TemplateCard[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const chips = useMemo(() => {
    const list: { id: Filter; label: string; count: number }[] = [
      { id: 'all', label: 'All', count: templates.length },
    ]
    const newCount = templates.filter((t) => t.is_new).length
    if (newCount > 0) list.push({ id: 'new', label: 'New', count: newCount })
    for (const c of CATEGORIES) {
      const count = templates.filter((t) => t.categories.includes(c.id)).length
      if (count > 0) list.push({ id: c.id, label: c.label, count })
    }
    return list
  }, [templates])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates
      .filter((t) => {
        if (filter === 'new') return t.is_new
        if (filter !== 'all') return t.categories.includes(filter)
        return true
      })
      .filter((t) => !q || `${t.name} ${t.description ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.is_new) - Number(a.is_new) || a.name.localeCompare(b.name))
  }, [templates, filter, query])

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search templates"
        aria-label="Search templates"
        className="input-field w-full"
      />

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === c.id
                ? 'border-accent bg-accent text-ink'
                : 'border-line text-muted hover:bg-glass-hover'
            }`}
          >
            {c.label} <span className="opacity-70">{c.count}</span>
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="glass-card p-5 transition-colors hover:bg-glass-hover"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {t.total_weeks} weeks &middot; {t.day_count} days
                </p>
                {t.is_new && <NewBadge />}
              </div>
              <h2 className="mt-1 font-medium text-ink">{t.name}</h2>
              {t.categories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-line-strong px-2 py-0.5 text-xs uppercase tracking-wide text-muted"
                    >
                      {categoryLabel(c)}
                    </span>
                  ))}
                </div>
              )}
              {t.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{t.description}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nothing matches that. Try another filter or search.</p>
      )}
    </div>
  )
}

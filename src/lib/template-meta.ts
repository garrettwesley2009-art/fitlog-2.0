// How templates are grouped and when one counts as "New".
// No database changes: categories are worked out from the template's name and
// description with the keyword rules below. To fix a template that lands in the
// wrong group, add it to CATEGORY_OVERRIDES (lowercase name -> category ids).

export type CategoryId = 'strength' | 'muscle' | 'olympic' | 'sport' | 'beginner'

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'strength', label: 'Strength' },
  { id: 'muscle', label: 'Muscle' },
  { id: 'olympic', label: 'Olympic' },
  { id: 'sport', label: 'Sport' },
  { id: 'beginner', label: 'Beginner' },
]

const RULES: { id: CategoryId; test: RegExp }[] = [
  { id: 'olympic', test: /olympic|snatch|clean|weightlifting/ },
  { id: 'sport', test: /baseball|softball|football|basketball|soccer|volleyball|sport|athlet/ },
  { id: 'muscle', test: /hypertrophy|growth|muscle|bodybuilding|physique/ },
  { id: 'strength', test: /strength|powerlifting/ },
  { id: 'beginner', test: /beginner|starter|full body|foundation/ },
]

// Exact names that need a hand-picked answer (lowercase).
const CATEGORY_OVERRIDES: Record<string, CategoryId[]> = {
  'baseball power 4-week': ['sport'],
  'weightlifting 10-week block': ['olympic', 'strength'],
}

export function categoriesFor(name: string, description: string | null): CategoryId[] {
  const override = CATEGORY_OVERRIDES[name.trim().toLowerCase()]
  if (override) return override
  const text = `${name} ${description ?? ''}`.toLowerCase()
  return RULES.filter((r) => r.test.test(text)).map((r) => r.id)
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}

// A template is New for this many days after it was added.
export const NEW_DAYS = 7

export function isNewTemplate(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const added = new Date(createdAt).getTime()
  if (Number.isNaN(added)) return false
  return Date.now() - added < NEW_DAYS * 24 * 60 * 60 * 1000
}

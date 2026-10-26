// The profile as the app sees it, and how much of it is filled in.
export type ProfileFields = {
  name: string | null
  goals: string[] | null
  days: number | null
  experience: string | null
  birthDate: string | null // yyyy-mm-dd
  gender: string | null
  heightIn: number | null
  weightLb: number | null
  equipment: string[] | null
  limits: string | null
}

export const PROFILE_COLUMNS =
  'display_name, goals, days_per_week, experience, birth_date, gender, height_in, weight_lb, equipment, limits'

// Turns a profiles row into ProfileFields (numeric columns can arrive as strings).
export function fromRow(row: Record<string, unknown> | null | undefined, fallbackName = ''): ProfileFields {
  const num = (v: unknown) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)
  const rawName = (row?.display_name as string | null | undefined) ?? fallbackName
  return {
    name: rawName && !rawName.includes('@') ? rawName : '',
    goals: (row?.goals as string[] | null | undefined) ?? [],
    days: num(row?.days_per_week),
    experience: (row?.experience as string | null | undefined) ?? null,
    birthDate: (row?.birth_date as string | null | undefined) ?? null,
    gender: (row?.gender as string | null | undefined) ?? null,
    heightIn: num(row?.height_in),
    weightLb: num(row?.weight_lb),
    equipment: (row?.equipment as string[] | null | undefined) ?? [],
    limits: (row?.limits as string | null | undefined) ?? null,
  }
}

export function profileProgress(p: ProfileFields) {
  const items = [
    { key: 'name', label: 'First name', done: Boolean(p.name && p.name.trim()) },
    { key: 'goals', label: 'Goals', done: Boolean(p.goals && p.goals.length > 0) },
    { key: 'days', label: 'Days a week', done: p.days != null },
    { key: 'experience', label: 'Experience level', done: Boolean(p.experience) },
    { key: 'body', label: 'Height and weight', done: p.heightIn != null && p.weightLb != null },
    { key: 'birth', label: 'Date of birth', done: Boolean(p.birthDate) },
    { key: 'equipment', label: 'Equipment', done: Boolean(p.equipment && p.equipment.length > 0) },
  ]
  const done = items.filter((i) => i.done).length
  return {
    items,
    done,
    total: items.length,
    percent: Math.round((done / items.length) * 100),
    complete: done === items.length,
  }
}

// Age in whole years from a yyyy-mm-dd date, or null if the date is not usable.
export function ageFrom(birthDate: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--
  return age >= 0 && age < 130 ? age : null
}

const LEVEL_TEXT: Record<string, string> = {
  new: 'new to lifting',
  some: 'some lifting experience',
  experienced: 'experienced lifter',
}

// A short plain-text summary of the member for the AI coach. Empty when nothing is filled in.
export function profileSummary(p: ProfileFields): string {
  const lines: string[] = []
  if (p.name) lines.push(`Name: ${p.name}`)
  if (p.goals && p.goals.length) lines.push(`Goals: ${p.goals.join(', ')}`)
  if (p.days != null) lines.push(`Wants to train ${p.days} days a week`)
  if (p.experience) lines.push(`Experience: ${LEVEL_TEXT[p.experience] ?? p.experience}`)
  if (p.birthDate) {
    const age = ageFrom(p.birthDate)
    if (age != null) lines.push(`Age: ${age}`)
  }
  if (p.heightIn != null) lines.push(`Height: ${Math.floor(p.heightIn / 12)} ft ${Math.round(p.heightIn % 12)} in`)
  if (p.weightLb != null) lines.push(`Body weight: ${p.weightLb} lb`)
  if (p.equipment && p.equipment.length) lines.push(`Equipment: ${p.equipment.join(', ')}`)
  if (p.limits && p.limits.trim()) lines.push(`Injuries or limits to work around: ${p.limits.trim()}`)
  return lines.join('\n')
}

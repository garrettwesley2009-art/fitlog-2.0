'use server'

import { createClient } from '@/lib/supabase/server'
import { AVOID_MOVES, FOCUS_MUSCLES, SEASONS, SESSION_MINUTES, SPORTS, WEEKDAYS } from '@/lib/profile-progress'

type Result = { ok: true } | { ok: false; error: string }

const GOALS = ['Get stronger', 'Build muscle', 'Lose fat', 'Athletic performance', 'Stay consistent']
const LEVELS = ['new', 'some', 'experienced']
const GENDERS = ['male', 'female']
const EQUIPMENT = ['Full gym', 'Barbell and rack', 'Dumbbells', 'Kettlebells', 'Bands or bodyweight only']

// Any subset of the profile. Only the fields you send are changed; an empty value clears an optional field.
export type ProfilePatch = {
  name?: string
  goals?: string[]
  days?: number | null
  experience?: string | null
  birthDate?: string // yyyy-mm-dd, or '' to clear
  gender?: string | null
  heightFt?: string
  heightIn?: string
  weightLb?: string
  equipment?: string[]
  limits?: string
  trainDays?: string[]
  sessionMinutes?: number | null
  focusMuscles?: string[]
  avoidMoves?: string[]
  likes?: string
  dislikes?: string
  sport?: string | null
  sportSeason?: string | null
  eventDate?: string // yyyy-mm-dd, or '' to clear
}

export async function saveProfileFields(patch: ProfilePatch): Promise<Result> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const row: Record<string, unknown> = { id: user.id }
  let newName: string | null = null

  if (patch.name !== undefined) {
    const name = patch.name.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!name) return { ok: false, error: 'Enter your first name.' }
    row.display_name = name
    newName = name
  }

  if (patch.goals !== undefined) {
    const goals = Array.from(new Set(patch.goals.filter((g) => GOALS.includes(g))))
    if (goals.length === 0) return { ok: false, error: 'Pick at least one goal.' }
    row.goals = goals
  }

  if (patch.days !== undefined) {
    const d = patch.days
    row.days_per_week = d != null && Number.isInteger(d) && d >= 1 && d <= 7 ? d : null
  }

  if (patch.experience !== undefined) {
    row.experience = patch.experience && LEVELS.includes(patch.experience) ? patch.experience : null
  }

  if (patch.gender !== undefined) {
    row.gender = patch.gender && GENDERS.includes(patch.gender) ? patch.gender : null
  }

  if (patch.birthDate !== undefined) {
    if (patch.birthDate === '') row.birth_date = null
    else {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(patch.birthDate)
      const date = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null
      const valid =
        m &&
        date &&
        date.getUTCFullYear() === Number(m[1]) &&
        date.getUTCMonth() === Number(m[2]) - 1 &&
        date.getUTCDate() === Number(m[3]) &&
        date.getTime() >= Date.UTC(1920, 0, 1) &&
        date.getTime() <= Date.now()
      if (!valid) return { ok: false, error: 'Pick a real date of birth.' }
      row.birth_date = patch.birthDate
    }
  }

  if (patch.heightFt !== undefined || patch.heightIn !== undefined) {
    const ftText = (patch.heightFt ?? '').trim()
    const inText = (patch.heightIn ?? '').trim()
    if (ftText === '' && inText === '') row.height_in = null
    else {
      const ft = Number(ftText || 0)
      const inch = Number(inText || 0)
      const total = ft * 12 + inch
      if (!Number.isFinite(total) || ft < 3 || ft > 7 || inch < 0 || inch > 11.9 || total < 36 || total > 96) {
        return { ok: false, error: 'Check your height (for example 5 ft 10 in).' }
      }
      row.height_in = Math.round(total * 10) / 10
    }
  }

  if (patch.weightLb !== undefined) {
    const t = patch.weightLb.trim()
    if (t === '') row.weight_lb = null
    else {
      const w = Number(t)
      if (!Number.isFinite(w) || w < 50 || w > 700) return { ok: false, error: 'Check your weight in pounds.' }
      row.weight_lb = Math.round(w * 10) / 10
    }
  }

  if (patch.equipment !== undefined) {
    row.equipment = Array.from(new Set(patch.equipment.filter((e) => EQUIPMENT.includes(e))))
  }

  if (patch.limits !== undefined) {
    row.limits = patch.limits.trim().slice(0, 500) || null
  }

  if (patch.trainDays !== undefined) {
    // Kept in week order no matter what order they were tapped in.
    row.train_days = WEEKDAYS.filter((d) => patch.trainDays!.includes(d))
  }

  if (patch.sessionMinutes !== undefined) {
    const m = patch.sessionMinutes
    row.session_minutes = m != null && SESSION_MINUTES.includes(m) ? m : null
  }

  if (patch.focusMuscles !== undefined) {
    const picked = FOCUS_MUSCLES.filter((m) => patch.focusMuscles!.includes(m))
    if (picked.length > 3) return { ok: false, error: 'Pick up to 3.' }
    row.focus_muscles = picked
  }

  if (patch.avoidMoves !== undefined) {
    row.avoid_moves = AVOID_MOVES.filter((m) => patch.avoidMoves!.includes(m))
  }

  if (patch.likes !== undefined) row.likes = patch.likes.trim().slice(0, 300) || null
  if (patch.dislikes !== undefined) row.dislikes = patch.dislikes.trim().slice(0, 300) || null

  if (patch.sport !== undefined) {
    row.sport = patch.sport && SPORTS.includes(patch.sport) ? patch.sport : null
    if (!row.sport) {
      row.sport_season = null
      row.event_date = null
    }
  }

  if (patch.sportSeason !== undefined && row.sport !== null) {
    row.sport_season = patch.sportSeason && SEASONS.some((x) => x.id === patch.sportSeason) ? patch.sportSeason : null
  }

  if (patch.eventDate !== undefined && row.sport !== null) {
    if (patch.eventDate === '') row.event_date = null
    else {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(patch.eventDate)
      const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN
      const now = Date.now()
      if (!Number.isFinite(t) || t < now - 366 * 86_400_000 || t > now + 2 * 366 * 86_400_000) {
        return { ok: false, error: 'Pick a date within the next two years.' }
      }
      row.event_date = patch.eventDate
    }
  }

  const { error } = await supabase.from('profiles').upsert(row)
  if (error) return { ok: false, error: 'Could not save that. Try again.' }

  if (newName) await supabase.auth.updateUser({ data: { display_name: newName } })
  return { ok: true }
}

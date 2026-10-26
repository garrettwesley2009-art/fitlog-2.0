'use server'

import { createClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

const GOAL_OPTIONS = [
  'Get stronger',
  'Build muscle',
  'Lose fat',
  'Athletic performance',
  'Stay consistent',
] as const

// Saves the first-time setup: first name, at least one goal, and optionally days per week.
export async function completeOnboarding(input: {
  name: string
  goals: string[]
  days: number | null
}): Promise<Result> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 40)
  if (!name) return { ok: false, error: 'Enter your first name.' }

  const goals = Array.from(new Set(input.goals.filter((g) => (GOAL_OPTIONS as readonly string[]).includes(g))))
  if (goals.length === 0) return { ok: false, error: 'Pick at least one goal.' }

  const days =
    input.days != null && Number.isInteger(input.days) && input.days >= 1 && input.days <= 7 ? input.days : null

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: name,
    goals,
    days_per_week: days,
    onboarded_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: 'Could not save that. Try again.' }

  // The Home greeting reads the name from the account itself.
  await supabase.auth.updateUser({ data: { display_name: name } })
  return { ok: true }
}

// Only people who had an account before this feature may skip the setup screen.
export async function skipOnboarding(): Promise<Result> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_optional')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.onboarding_optional) return { ok: false, error: 'Please finish the setup first.' }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { ok: false, error: 'Could not skip. Try again.' }
  return { ok: true }
}

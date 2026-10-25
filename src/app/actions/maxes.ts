'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrCreateExercise } from '@/lib/data'

export type MaxEntry = { name: string; oneRm: number }

// Saves one-rep maxes (in pounds) for the signed-in user. One row per exercise:
// saving again replaces the old number.
export async function saveMaxes(
  entries: MaxEntry[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ok: false, error: 'Please log in again.' }

  const clean = (Array.isArray(entries) ? entries : [])
    .map((e) => ({ name: typeof e?.name === 'string' ? e.name.trim() : '', oneRm: Number(e?.oneRm) }))
    .filter((e) => e.name && Number.isFinite(e.oneRm) && e.oneRm > 0 && e.oneRm <= 2000)
    .slice(0, 40)

  if (clean.length === 0) return { ok: false, error: 'Enter a max between 1 and 2000 lb.' }

  try {
    const rows = []
    for (const e of clean) {
      const exerciseId = await getOrCreateExercise(supabase, user.id, e.name)
      rows.push({
        user_id: user.id,
        exercise_id: exerciseId,
        one_rm: Math.round(e.oneRm * 10) / 10,
        updated_at: new Date().toISOString(),
      })
    }
    const { error } = await supabase.from('user_maxes').upsert(rows, { onConflict: 'user_id,exercise_id' })
    if (error) return { ok: false, error: 'Could not save your maxes. The maxes table may not be set up yet.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not save your maxes. Try again.' }
  }
}

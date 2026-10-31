'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { bestWeight, getSessions } from '@/lib/training'

// Saves a goal, then goes back to the Goals page. Up to 3 goals at a time.
export async function createGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) redirect('/login')

  const kind = formData.get('kind') === 'weekly' ? 'weekly' : 'lift'
  const target = Number(formData.get('target'))
  const exercise = String(formData.get('exercise') ?? '').trim()

  const max = kind === 'weekly' ? 7 : 2000
  if (!Number.isFinite(target) || target <= 0 || target > max) redirect('/you/goals/new?error=target')
  if (kind === 'lift' && !exercise) redirect('/you/goals/new?error=exercise')

  const { count } = await supabase.from('user_goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((count ?? 0) >= 3) redirect('/you/goals?error=limit')

  let start = 0
  if (kind === 'lift') start = bestWeight(await getSessions(supabase, user.id), exercise)

  const { error } = await supabase.from('user_goals').insert({
    user_id: user.id,
    kind,
    exercise_name: kind === 'lift' ? exercise : null,
    target,
    start_value: start,
  })
  if (error) redirect('/you/goals/new?error=save')

  revalidatePath('/you/goals')
  redirect('/you/goals')
}

export async function deleteGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const id = String(formData.get('id') ?? '')
  if (id) await supabase.from('user_goals').delete().eq('id', id).eq('user_id', userData.user.id)
  revalidatePath('/you/goals')
  redirect('/you/goals')
}

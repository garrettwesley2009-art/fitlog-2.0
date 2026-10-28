import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fromRow, PROFILE_COLUMNS } from '@/lib/profile-progress'

// Gives the Coach setup card the saved answers it can prefill.
export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
  const p = fromRow(data as Record<string, unknown> | null)
  return NextResponse.json({
    goals: p.goals ?? [],
    days: p.days,
    equipment: p.equipment ?? [],
    limits: p.limits,
    experience: p.experience,
  })
}

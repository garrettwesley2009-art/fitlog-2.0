'use server'

import { createClient } from '@/lib/supabase/server'

// Called about once a minute while the app is open. Records "this person is here right now".
// Quiet on purpose: if the table is missing or the user is signed out, nothing happens.
export async function pingActivity(): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return
  await supabase
    .from('user_activity')
    .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

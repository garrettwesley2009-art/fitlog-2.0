import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Asks Supabase who is signed in once per page load. The layout, the setup gate and the
// page all share this one answer instead of each making their own network call.
// Returns the same shape as supabase.auth.getUser(): { data: { user } }.
const loadUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
})

export async function getUserCached() {
  const user = await loadUser()
  return { data: { user } }
}

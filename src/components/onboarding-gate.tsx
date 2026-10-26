import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Sends people who have not done the first-time setup to /welcome. Renders nothing.
// If the database change has not been made yet, the query fails and nobody is sent anywhere.
export async function OnboardingGate() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return null
  if (!data || data.onboarded_at == null) redirect('/welcome')
  return null
}

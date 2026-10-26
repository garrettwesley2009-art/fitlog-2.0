import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Welcome } from '@/components/welcome'

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ replay?: string }> }) {
  const { replay } = await searchParams
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, onboarded_at, onboarding_optional')
    .eq('id', user.id)
    .maybeSingle()

  const isReplay = replay === '1'
  if (profile?.onboarded_at && !isReplay) redirect('/dashboard')

  const meta = (user.user_metadata?.display_name as string | undefined) ?? ''
  const guess = (profile?.display_name as string | undefined) ?? meta
  // Do not prefill with the part of an email address.
  const prefill = guess && !guess.includes('@') && guess !== user.email?.split('@')[0] ? guess : ''

  return <Welcome replay={isReplay} canSkip={Boolean(profile?.onboarding_optional)} initialName={prefill} />
}

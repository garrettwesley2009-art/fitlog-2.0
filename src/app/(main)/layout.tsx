import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/nav-bar'
import { Heartbeat } from '@/components/heartbeat'
import { SyncRunner } from '@/components/sync-runner'
import { OnboardingGate } from '@/components/onboarding-gate'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect('/login')
  }

  const displayName =
    (data.user.user_metadata?.display_name as string | undefined) ??
    data.user.email ??
    'Account'

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas bg-glow text-ink">
      <NavBar displayName={displayName} />
      <Heartbeat />
      <SyncRunner />
      <OnboardingGate />
      {/* pb-28 leaves room so the bottom bar never covers the end of a page */}
      <div data-scroll-area className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">{children}</main>
      </div>
    </div>
  )
}

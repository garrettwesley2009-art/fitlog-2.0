import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/nav-bar'
import { Heartbeat } from '@/components/heartbeat'
import { SyncRunner } from '@/components/sync-runner'

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
    <div className="min-h-screen bg-canvas bg-glow text-ink">
      <NavBar displayName={displayName} />
      <Heartbeat />
      <SyncRunner />
      {/* pb-28 leaves room so the bottom bar never covers the end of a page */}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">{children}</main>
    </div>
  )
}

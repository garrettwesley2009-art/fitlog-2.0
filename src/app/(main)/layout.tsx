import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/nav-bar'

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
    <div className="min-h-screen bg-neutral-50">
      <NavBar displayName={displayName} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user!

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'Account'
  const initial = (displayName.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-glass-hover text-3xl text-muted">
          {initial}
        </div>
        <h1 className="mt-3 text-xl font-semibold text-ink">{displayName}</h1>
        {user.email && <p className="mt-1 text-sm text-muted">{user.email}</p>}
      </div>

      <div className="glass-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Coming soon</p>
        <p className="mt-1 text-sm text-muted">
          A few quick questions about you and your goals, so your coaching can be more accurate.
        </p>
      </div>

      <form action={logout}>
        <button className="btn-ghost">Log out</button>
      </form>
    </div>
  )
}

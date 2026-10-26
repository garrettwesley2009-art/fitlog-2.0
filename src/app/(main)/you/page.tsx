import { ProfileEditor } from '@/components/profile-editor'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user!
  const { data: isAdmin } = await supabase.rpc('is_admin')

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

      <ProfileEditor />

      {isAdmin === true && (
        <Link href="/admin" className="glass-card flex items-center justify-between p-5">
          <span>
            <span className="block text-xs font-medium uppercase tracking-wide text-accent">Admin</span>
            <span className="mt-1 block text-sm text-ink">Live users</span>
          </span>
          <span className="text-muted">&rsaquo;</span>
        </Link>
      )}

      <Link href="/welcome?replay=1" className="btn-ghost block text-center">

        Replay the app tour

      </Link>

      <form action={logout}>
        <button className="btn-ghost">Log out</button>
      </form>
    </div>
  )
}

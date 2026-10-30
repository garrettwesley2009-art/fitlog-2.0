import { getUserCached } from '@/lib/supabase/get-user'
import { ProfileEditor } from '@/components/profile-editor'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data } = await getUserCached()
  const user = data.user!
  const { data: isAdmin } = await supabase.rpc('is_admin')

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'Account'
  const initial = (displayName.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-4">
        <span className="flex h-[68px] w-[68px] flex-none items-center justify-center rounded-full border-[3px] border-accent bg-inset font-display text-3xl font-bold text-ink">
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[32px] font-extrabold leading-none text-ink">{displayName}</h1>
          {user.email && <p className="mt-1 truncate text-sm text-muted">{user.email}</p>}
        </div>
      </section>

      <ProfileEditor />

      {isAdmin === true && (
        <Link href="/admin" className="card flex min-h-14 items-center justify-between px-4 py-3">
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-insight">Admin</span>
            <span className="mt-0.5 block text-[15px] text-ink">Live users</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      <Link href="/welcome?replay=1" className="btn-ghost w-full">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Replay the app tour
      </Link>

      {/* Kept apart from everything else so it is never tapped by accident */}
      <form action={logout} className="mt-6 flex justify-center border-t border-line pt-4">
        <button className="flex min-h-11 items-center gap-2 px-4 text-[15px] font-semibold text-danger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />
          </svg>
          Log out
        </button>
      </form>
    </div>
  )
}

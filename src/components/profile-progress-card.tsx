import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PROFILE_COLUMNS, fromRow, profileProgress } from '@/lib/profile-progress'

// Home card: shows until the profile is complete, then disappears.
export async function ProfileProgressCard() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle()
  if (error || !data) return null

  const progress = profileProgress(fromRow(data))
  if (progress.complete) return null
  const next = progress.items.find((i) => !i.done)

  return (
    <Link href="/you#profile" className="glass-card block p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Getting started</p>
        <p className="text-xs text-muted">{progress.percent}% done</p>
      </div>
      <p className="mt-2 text-base font-semibold text-ink">Finish your profile</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {next ? `Next: ${next.label}. ` : ''}A few quick answers for sharper coaching.
      </p>
    </Link>
  )
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LiveRefresh } from '@/components/live-refresh'

export const dynamic = 'force-dynamic'

type Stats = {
  online_now: number
  active_today: number
  new_signups_today: number
  workouts_today: number
  total_users: number
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_live_stats')

  // Not an admin: act like the page does not exist.
  if (error?.code === '42501') notFound()

  if (error || !data) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-ink">Live users</h1>
        <p className="text-sm text-muted">
          The live stats are not set up yet. Run add_live_users.sql in Supabase, then reload this page.
        </p>
      </div>
    )
  }

  const stats = data as Stats
  const updated = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/New_York',
  })

  const tiles = [
    { label: 'Active today', value: stats.active_today },
    { label: 'New signups today', value: stats.new_signups_today },
    { label: 'Workouts logged today', value: stats.workouts_today },
    { label: 'Total accounts', value: stats.total_users },
  ]

  return (
    <div className="space-y-5">
      <LiveRefresh />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Live users</h1>
        <p className="mt-1 text-xs text-muted">Updates every 30 seconds &middot; last update {updated} ET</p>
      </div>

      <div className="glass-card flex items-center gap-4 p-6">
        <span className="relative flex h-3 w-3 flex-none">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <div>
          <p className="text-5xl font-bold italic text-ink">{stats.online_now}</p>
          <p className="text-xs uppercase tracking-wide text-muted">Online now (last 5 minutes)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="glass-card p-4">
            <p className="text-3xl font-bold text-ink">{t.value}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

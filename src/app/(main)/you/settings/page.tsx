import { logout } from '@/app/actions/auth'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>

      <div className="glass-card p-5">
        <p className="text-sm text-muted">More settings, like units and notifications, are coming.</p>
      </div>

      <form action={logout}>
        <button className="btn-ghost">Log out</button>
      </form>
    </div>
  )
}

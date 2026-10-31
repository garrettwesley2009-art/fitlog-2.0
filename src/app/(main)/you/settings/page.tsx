import Link from 'next/link'
import { logout } from '@/app/actions/auth'

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center justify-between px-4 text-[16px] text-ink">
      {children}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted"><path d="M9 5l7 7-7 7" /></svg>
    </Link>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">Settings</h1>

      <section className="card divide-y divide-line" aria-label="Help">
        <Row href="/welcome?replay=1">Replay the app tour</Row>
        <Row href="/you">Edit your profile</Row>
        <Row href="/you/goals">Your goals</Row>
      </section>

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

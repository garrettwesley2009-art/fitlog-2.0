import Link from 'next/link'
import { logout } from '@/app/actions/auth'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/templates', label: 'Templates' },
  { href: '/programs/new', label: 'Build a program' },
  { href: '/log', label: 'Log workout' },
  { href: '/history', label: 'History' },
  { href: '/assistant', label: 'AI assistant' },
]

export function NavBar({ displayName }: { displayName: string }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-neutral-900">FitLog</span>
          <nav className="flex flex-wrap gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">{displayName}</span>
          <form action={logout}>
            <button className="text-sm text-neutral-500 underline hover:text-neutral-900">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()

  return (
    <header className="border-b border-line bg-canvas/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            FitLog
          </span>
          <nav className="flex flex-wrap gap-3">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/')
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'border-b-2 border-accent text-sm font-medium text-ink'
                      : 'border-b-2 border-transparent text-sm text-muted hover:text-ink'
                  }
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{displayName}</span>
          <form action={logout}>
            <button className="text-sm text-muted underline hover:text-ink">Log out</button>
          </form>
        </div>
      </div>
    </header>
  )
}

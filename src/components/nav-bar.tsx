'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_SECTIONS, findActiveSub, findSection } from '@/lib/nav'
import type { NavSectionId } from '@/lib/nav'

function NavIcon({ id }: { id: NavSectionId }) {
  const props = {
    className: 'h-6 w-6',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (id) {
    case 'workout':
      return (
        <svg {...props}>
          <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
        </svg>
      )
    case 'schedule':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      )
    case 'coach':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'you':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      )
  }
}

export function NavBar({ displayName }: { displayName: string }) {
  const pathname = usePathname()
  const section = findSection(pathname)
  const activeSub = section ? findActiveSub(section, pathname) : null
  const showHeader = !section?.hideHeader
  const showSubs = !!section && section.subs.length > 1
  const initial = (displayName.trim()[0] ?? '?').toUpperCase()

  return (
    <>
      {/* Top: shared header (not on the You pages) plus this section's tabs */}
      {(showHeader || showSubs) && (
        <div className="sticky top-0 z-30 border-b border-line bg-canvas/70 backdrop-blur">
          {showHeader && (
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              {/* Logo goes here later: swap the text for an <Image> */}
              <Link
                href="/dashboard"
                className="text-sm font-semibold uppercase tracking-[0.3em] text-muted"
              >
                FitLog
              </Link>
              <Link
                href="/you"
                aria-label="Your profile"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-glass-hover text-xs font-medium text-muted hover:text-ink"
              >
                {initial}
              </Link>
            </div>
          )}

          {showSubs && section && (
            <nav
              aria-label={`${section.label} sections`}
              className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4"
            >
              {section.subs.map((sub) => {
                const active = activeSub?.href === sub.href
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'shrink-0 border-b-2 border-accent py-3 text-sm font-medium text-ink'
                        : 'shrink-0 border-b-2 border-transparent py-3 text-sm font-medium text-muted hover:text-ink'
                    }
                  >
                    {sub.label}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      )}

      {/* Bottom: the main sections */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-5xl items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV_SECTIONS.map((s) => {
            const active = section?.id === s.id
            return (
              <li key={s.id} className="flex-1">
                <Link
                  href={s.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    active ? 'text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  <span className={active ? 'text-accent' : ''}>
                    <NavIcon id={s.id} />
                  </span>
                  {s.label}
                  <span
                    className={`h-1 w-1 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`}
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

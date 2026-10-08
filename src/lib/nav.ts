// The one place that defines the app's navigation.
// - Each SECTION is a button on the bottom bar.
// - Each section's SUBS are the tabs shown at the top while you are in it.
// To rename a tab or move a page, change it here -- nothing else needs to move.

export type NavSectionId = 'workout' | 'schedule' | 'home' | 'coach' | 'you'

export type NavSub = { label: string; href: string }

export type NavSection = {
  id: NavSectionId
  label: string
  // Where the bottom bar button goes.
  href: string
  // Any address starting with one of these counts as "inside" this section.
  prefixes: string[]
  subs: NavSub[]
  // The You section has its own look instead of the shared top header.
  hideHeader?: boolean
}

// Bottom bar order, left to right.
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'workout',
    label: 'Workout',
    href: '/log',
    prefixes: ['/log', '/workout', '/templates', '/programs'],
    subs: [
      { label: 'Log', href: '/log' },
      { label: 'My Program', href: '/workout/program' },
      { label: 'Discover', href: '/templates' },
      { label: 'Build', href: '/programs/new' },
    ],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    href: '/schedule',
    prefixes: ['/schedule', '/history'],
    subs: [
      { label: 'Calendar', href: '/schedule' },
      { label: 'Upcoming', href: '/schedule/upcoming' },
      { label: 'History', href: '/history' },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    href: '/dashboard',
    prefixes: ['/dashboard'],
    subs: [
      { label: 'Today', href: '/dashboard' },
      { label: 'Progress', href: '/dashboard/progress' },
    ],
  },
  {
    id: 'coach',
    label: 'Coach',
    href: '/assistant',
    prefixes: ['/assistant'],
    subs: [{ label: 'Chat', href: '/assistant' }],
  },
  {
    id: 'you',
    label: 'You',
    href: '/you',
    prefixes: ['/you'],
    hideHeader: true,
    subs: [
      { label: 'Profile', href: '/you' },
      { label: 'Goals', href: '/you/goals' },
      { label: 'Badges', href: '/you/badges' },
      { label: 'Settings', href: '/you/settings' },
    ],
  },
]

function startsWithPath(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(base + '/')
}

export function findSection(pathname: string): NavSection | null {
  return (
    NAV_SECTIONS.find((s) => s.prefixes.some((p) => startsWithPath(pathname, p))) ?? null
  )
}

// The top tab that matches the current page. If several match (for example
// /dashboard and /dashboard/progress), the most specific one wins.
export function findActiveSub(section: NavSection, pathname: string): NavSub | null {
  let best: NavSub | null = null
  for (const sub of section.subs) {
    if (startsWithPath(pathname, sub.href)) {
      if (!best || sub.href.length > best.href.length) best = sub
    }
  }
  return best
}

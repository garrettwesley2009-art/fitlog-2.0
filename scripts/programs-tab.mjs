import fs from 'node:fs'
const MARK = 'PROGRAMS-TAB'
function load(f) {
  let s = fs.readFileSync(f, 'utf8')
  const crlf = s.includes('\r\n')
  if (crlf) s = s.replace(/\r\n/g, '\n')
  return { s, crlf }
}
function save(f, s, crlf) { fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s) }
function rep(s, a, b, label) {
  const n = s.split(a).length - 1
  if (n !== 1) { console.log(`MISSING/AMBIGUOUS (${n}) in ${label}:`, a.slice(0, 60)); process.exit(1) }
  return s.replace(a, () => b)
}

// ---- 1. src/lib/nav.ts -----------------------------------------------------
{
  const f = 'src/lib/nav.ts'
  let { s, crlf } = load(f)
  if (s.includes(MARK)) { console.log('SKIPPED nav.ts (already applied)') } else {
    s = rep(s, `export type NavSub = { label: string; href: string }`,
      `// ${MARK}: "also" lists other addresses that count as this tab (Build counts as Programs).\nexport type NavSub = { label: string; href: string; also?: string[] }`, f)
    s = rep(s, `    prefixes: ['/log', '/workout', '/templates', '/programs'],
    subs: [
      { label: 'Log', href: '/log' },
      { label: 'My Program', href: '/workout/program' },
      { label: 'Discover', href: '/templates' },
      { label: 'Build', href: '/programs/new' },
    ],`, `    prefixes: ['/log', '/workout', '/templates', '/programs', '/history'],
    subs: [
      { label: 'Log', href: '/log' },
      { label: 'My Program', href: '/workout/program' },
      { label: 'History', href: '/history' },
      { label: 'Programs', href: '/templates', also: ['/programs'] },
    ],`, f)
    const a = s.indexOf(`  {\n    id: 'schedule',`)
    const b = s.indexOf(`  {\n    id: 'home',`)
    if (a < 0 || b < a) { console.log('MISSING schedule section in nav.ts'); process.exit(1) }
    s = s.slice(0, a) + s.slice(b)
    s = rep(s, `    if (startsWithPath(pathname, sub.href)) {`,
      `    if ([sub.href, ...(sub.also ?? [])].some((h) => startsWithPath(pathname, h))) {`, f)
    save(f, s, crlf)
    console.log('DONE nav.ts')
  }
}

// ---- 2. Programs page: Templates + a Build card ------------------------------
{
  const f = 'src/app/(main)/templates/page.tsx'
  let { s, crlf } = load(f)
  if (s.includes(MARK)) { console.log('SKIPPED templates/page.tsx (already applied)') } else {
    s = rep(s, `import { createClient } from '@/lib/supabase/server'`, `import Link from 'next/link'\nimport { createClient } from '@/lib/supabase/server'`, f)
    s = rep(s, `font-extrabold text-ink">Templates</h1>`, `font-extrabold text-ink">Programs</h1>`, f)
    s = rep(s, `          Pick one to start from, edit your own copy, or customize it with the coach.
        </p>
      </div>
`, `          Pick one to start from, edit your own copy, or customize it with the coach.
        </p>
      </div>

      {/* ${MARK}: Build lives here now, so Workout has one Programs tab */}
      <div className="card border-accent p-4">
        <h2 className="font-display text-2xl font-bold text-ink">Make your own</h2>
        <p className="mt-1 text-sm text-muted">
          Start from a blank page, or let the Coach build one from your goals.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/programs/new" className="btn-accent">
            Build your own
          </Link>
          <Link href="/assistant" className="btn-ghost">
            Ask the Coach
          </Link>
        </div>
      </div>
`, f)
    save(f, s, crlf)
    console.log('DONE templates/page.tsx')
  }
}

// ---- 3. Old Schedule pages now just forward to where that content lives -----
for (const [f, to] of [
  ['src/app/(main)/schedule/page.tsx', '/history'],
  ['src/app/(main)/schedule/upcoming/page.tsx', '/workout/program'],
]) {
  const { s, crlf } = load(f)
  if (s.includes('redirect(')) { console.log('SKIPPED', f); continue }
  save(f, `import { redirect } from 'next/navigation'\n\n// ${MARK}: the Schedule tab was removed; this old address forwards to the new home.\nexport default function Page() {\n  redirect('${to}')\n}\n`, crlf)
  console.log('DONE', f)
}

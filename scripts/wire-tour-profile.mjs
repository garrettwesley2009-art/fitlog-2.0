// Connects the app tour and the profile setup. Safe to run twice.
import fs from 'node:fs'

function edit(file, label, already, steps) {
  if (!fs.existsSync(file)) return console.log(`MISSING  ${file}`)
  let t = fs.readFileSync(file, 'utf8')
  if (t.includes(already)) return console.log(`SKIPPED  ${label} (already done)`)
  const nl = t.includes('\r\n') ? '\r\n' : '\n'
  let ok = 0
  for (const [name, re, fn] of steps) {
    if (re.test(t)) {
      t = t.replace(re, fn)
      ok++
    } else console.log(`  not found: ${name}`)
  }
  if (ok === steps.length) {
    fs.writeFileSync(file, t.replace(/\r?\n/g, nl))
    console.log(`DONE     ${label}`)
  } else console.log(`NOT CHANGED  ${label} (send me this message)`)
}

edit('src/components/nav-bar.tsx', 'nav bar', 'data-tour', [
  ['bottom links', /(<Link\s+href=\{s\.href\}\s+)/, '$1data-tour={`nav-${s.id}`}\n                  '],
])

edit('src/app/(main)/layout.tsx', 'layout', 'AppTour', [
  ['import', /(import \{ OnboardingGate \} from '@\/components\/onboarding-gate'\r?\n)/, "$1import { AppTour } from '@/components/app-tour'\n"],
  ['element', /(<OnboardingGate \/>)/, '$1\n      <AppTour />'],
])

edit('src/app/(main)/you/page.tsx', 'You page', 'ProfileEditor', [
  [
    'coming soon card',
    /<div className="glass-card p-5">\s*<p[^>]*>Coming soon<\/p>\s*<p[^>]*>[\s\S]*?<\/p>\s*<\/div>/,
    '<ProfileEditor />',
  ],
  ['import', /^/, "import { ProfileEditor } from '@/components/profile-editor'\n"],
])

edit('src/app/(main)/dashboard/page.tsx', 'Home page', 'ProfileProgressCard', [
  ['placeholder', /<QuestPlaceholder \/>/, '<ProfileProgressCard />'],
  ['import list', /QuestPlaceholder,\s*/, ''],
  ['import', /^/, "import { ProfileProgressCard } from '@/components/profile-progress-card'\n"],
])

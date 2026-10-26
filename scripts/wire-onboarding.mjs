// Connects the welcome flow: adds the gate to the main layout and a "Replay the app tour" link to You.
import fs from 'node:fs'

function edit(file, label, already, steps) {
  if (!fs.existsSync(file)) return console.log(`MISSING  ${file}`)
  let t = fs.readFileSync(file, 'utf8')
  if (t.includes(already)) return console.log(`SKIPPED  ${label} (already done)`)
  const nl = t.includes('\r\n') ? '\r\n' : '\n'
  let ok = 0
  for (const [re, fn] of steps) {
    if (re.test(t)) {
      t = t.replace(re, fn)
      ok++
    } else console.log(`  not found: ${re}`)
  }
  t = t.replace(/\n/g, '\n').replace(/\r?\n/g, nl)
  if (ok === steps.length) {
    fs.writeFileSync(file, t)
    console.log(`DONE     ${label}`)
  } else console.log(`NOT CHANGED  ${label} (send me this message)`)
}

edit('src/app/(main)/layout.tsx', 'layout', 'OnboardingGate', [
  [/(import \{ SyncRunner \} from '@\/components\/sync-runner'\r?\n)/, "$1import { OnboardingGate } from '@/components/onboarding-gate'\n"],
  [/(<SyncRunner \/>)/, '$1\n      <OnboardingGate />'],
])

edit('src/app/(main)/you/page.tsx', 'You page', 'welcome?replay', [
  [/^/, "import Link from 'next/link'\n"],
  [/(\s*)(<form action=\{logout\}>)/, '$1<Link href="/welcome?replay=1" className="btn-ghost block text-center">$1  Replay the app tour$1</Link>$1$2'],
])

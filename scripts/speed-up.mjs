// Makes every page share one "who is signed in" check per tap. Safe to run twice.
import fs from 'node:fs'
import path from 'node:path'

const IMPORT = "import { getUserCached } from '@/lib/supabase/get-user'"
const targets = []
function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.tsx?$/.test(e.name)) targets.push(p)
  }
}
walk(path.join('src', 'app', '(main)'))
const gate = path.join('src', 'components', 'onboarding-gate.tsx')
if (fs.existsSync(gate)) targets.push(gate)

let changed = 0
for (const file of targets) {
  const raw = fs.readFileSync(file, 'utf8')
  if (!raw.includes('supabase.auth.getUser()')) continue
  const nl = raw.includes('\r\n') ? '\r\n' : '\n'
  let s = raw.replace(/\r\n/g, '\n')
  if (/^\s*['"]use (client|server)['"]/.test(s)) { console.log(`SKIPPED  ${file} (client/server-action file)`); continue }
  s = s.replace(/await supabase\.auth\.getUser\(\)/g, 'await getUserCached()')
  if (!s.includes(IMPORT)) {
    const i = s.search(/^import /m)
    s = i >= 0 ? s.slice(0, i) + IMPORT + '\n' + s.slice(i) : IMPORT + '\n' + s
  }
  fs.writeFileSync(file, s.replace(/\n/g, nl))
  console.log(`DONE     ${file}`)
  changed++
}
if (changed === 0) console.log('SKIPPED  nothing to change (already done)')

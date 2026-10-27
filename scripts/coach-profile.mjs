// Gives the Coach a clean profile summary (age, height in ft/in, goals, equipment, limits). Safe to run twice.
import fs from 'node:fs'
const file = 'src/app/api/assistant/route.ts'
if (!fs.existsSync(file)) { console.log(`MISSING  ${file}`); process.exit(0) }
let t = fs.readFileSync(file, 'utf8')
if (t.includes('profileSummary')) { console.log('SKIPPED  coach (already done)'); process.exit(0) }
const nl = t.includes('\r\n') ? '\r\n' : '\n'
const src = t.replace(/\r\n/g, '\n')
const fn = /function profileNote\([^)]*\)[^{]*\{\n[\s\S]*?\n\}\n/
if (!fn.test(src)) { console.log('NOT CHANGED  coach (send me this message)'); process.exit(0) }
let out = src.replace(
  fn,
  `function profileNote(profile: Record<string, unknown> | null): string {
  const none = 'No profile information is saved for this person yet.'
  if (!profile) return none
  const summary = profileSummary(fromRow(profile))
  return summary ? \`Saved profile (private, from the You page):\\n\${summary}\` : none
}
`
)
// add the import after the last import line at the top
out = out.replace(/((?:^import [^\n]*\n)+)/m, "$1import { fromRow, profileSummary } from '@/lib/profile-progress'\n")
out = out.replace(/^const SKIP_PROFILE_KEYS = [^\n]*\n/m, '')
fs.writeFileSync(file, out.replace(/\n/g, nl))
console.log('DONE     coach')

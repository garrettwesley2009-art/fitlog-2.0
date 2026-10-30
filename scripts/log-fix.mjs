import fs from 'node:fs'
const f = 'src/components/workout-logger.tsx'
let s = fs.readFileSync(f, 'utf8')
const crlf = s.includes('\r\n')
if (crlf) s = s.replace(/\r\n/g, '\n')
if (s.includes('carryWeight')) { console.log('SKIPPED (already applied)'); process.exit(0) }
const edits = [
  [`    const sets: SetState[] = []
    for (let i = 0; i < count; i++) {
      const done = byIndex.get(i + 1)
      if (done) {`,
   `    const sets: SetState[] = []
    // Weight from the latest set already logged in this workout (survives a reload).
    let carryWeight = ''
    for (let i = 0; i < count; i++) {
      const done = byIndex.get(i + 1)
      if (done) {
        carryWeight = numStr(done.weight)`],
  [`        weight: tw ? String(tw.low) : numStr(prev?.weight),`,
   `        weight: tw ? String(tw.low) : carryWeight || numStr(prev?.weight),`],
]
for (const [a, b] of edits) {
  if (!s.includes(a)) { console.log('MISSING', a.slice(0, 50)); process.exit(1) }
  s = s.replace(a, b)
}
if (crlf) s = s.replace(/\n/g, '\r\n')
fs.writeFileSync(f, s)
console.log('DONE')

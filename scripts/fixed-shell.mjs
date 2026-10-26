// Makes the top and bottom bars stay still: only the middle of the page scrolls. Safe to run twice.
import fs from 'node:fs'
const file = 'src/app/(main)/layout.tsx'
if (!fs.existsSync(file)) { console.log(`MISSING  ${file}`); process.exit(0) }
let t = fs.readFileSync(file, 'utf8')
if (t.includes('data-scroll-area')) { console.log('SKIPPED  layout (already done)'); process.exit(0) }
const a = /<div className="min-h-screen bg-canvas bg-glow text-ink">/
const b = /<main className="mx-auto max-w-5xl px-4 pb-28 pt-6">/
const c = /<\/main>/
if (!a.test(t) || !b.test(t) || !c.test(t)) { console.log('NOT CHANGED  layout (send me this message)'); process.exit(0) }
t = t.replace(a, '<div className="flex h-dvh flex-col overflow-hidden bg-canvas bg-glow text-ink">')
t = t.replace(b, '<div data-scroll-area className="min-h-0 flex-1 overflow-y-auto overscroll-contain">\n        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">')
t = t.replace(c, '</main>\n      </div>')
fs.writeFileSync(file, t)
console.log('DONE     layout')

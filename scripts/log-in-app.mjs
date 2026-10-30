import fs from 'node:fs'
const f = 'src/components/workout-logger.tsx'
let s = fs.readFileSync(f, 'utf8')
const crlf = s.includes('\r\n')
if (crlf) s = s.replace(/\r\n/g, '\n')
if (s.includes('LOG-IN-APP')) { console.log('SKIPPED (already applied)'); process.exit(0) }
function rep(a, b) {
  const n = s.split(a).length - 1
  if (n !== 1) { console.log(`MISSING/AMBIGUOUS (${n}):`, a.slice(0, 70)); process.exit(1) }
  s = s.replace(a, () => b)
}
// The logger now lives inside the app's normal page (top tabs and bottom bar stay visible)
rep(`    // Focus mode: while logging, the workout takes the whole screen (the app's bars are hidden
    // underneath). The X at the top left leaves; every logged set is already saved.
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas pt-[env(safe-area-inset-top)] text-ink">`,
    `    // Lives inside the Workout > Log page: the app's top tabs and bottom bar stay visible.
    // The X at the top left leaves; every logged set is already saved.
    <div className="mx-auto flex w-full max-w-xl flex-col text-ink" data-x="LOG-IN-APP">`)
rep(`mx-auto flex h-14 w-full max-w-xl flex-none items-center gap-2 px-3`, `flex h-14 w-full flex-none items-center gap-2`)
rep(`mx-auto flex w-full max-w-xl flex-none gap-1 px-4`, `flex w-full flex-none gap-1`)
rep(`<div id="log-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">`, `<div id="log-scroll">`)
rep(`<div className="mx-auto max-w-xl space-y-4 px-4 pb-6 pt-4">`, `<div className="space-y-4 pb-6 pt-4">`)
rep(`<div className="flex-none border-t border-line bg-canvas px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">`,
    `<div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-canvas px-4 pb-3 pt-3">`)
if (crlf) s = s.replace(/\n/g, '\r\n')
fs.writeFileSync(f, s)
console.log('DONE')

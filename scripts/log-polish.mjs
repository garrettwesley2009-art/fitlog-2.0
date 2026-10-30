import fs from 'node:fs'
const f = 'src/components/workout-logger.tsx'
let s = fs.readFileSync(f, 'utf8')
const crlf = s.includes('\r\n')
if (crlf) s = s.replace(/\r\n/g, '\n')
if (s.includes('LOG-POLISH')) { console.log('SKIPPED (already applied)'); process.exit(0) }
const fail = (m) => { console.log('MISSING:', m); process.exit(1) }
const idx = (n, from = 0) => { const i = s.indexOf(n, from); if (i < 0) fail(n.slice(0, 70)); return i }

// 1. "Last time" reads "225 x 5" and never shows a lone dash like 12x-1
const d0 = idx('function describe(s: LastTimeSet) {')
const d1 = idx('\n}\n', d0) + 3
s = s.slice(0, d0) + `function describe(s: LastTimeSet) {
  const w = s.weight != null ? \`\${s.weight}\` : null
  const r = s.reps != null ? \`\${s.reps}\` : null
  if (w && r) return \`\${w} × \${r}\`
  if (w) return \`\${w} lb\`
  if (r) return \`\${r} reps\`
  return '-'
}
` + s.slice(d1)

// 2. Compact rest card: small ring, next set, Start button and +30 all in one row
const R0 = idx('{resting ? (')
const R1 = idx(') : null}', R0) + ') : null}'.length
s = s.slice(0, R0) + `{resting ? (
            <div className="card flex items-center gap-4 p-3" data-x="LOG-POLISH">
              <div className="relative h-24 w-24 flex-none">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-line)" strokeWidth="9" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={RING}
                    strokeDashoffset={ringOffset}
                    className="transition-[stroke-dashoffset] duration-300 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[26px] font-extrabold leading-none tabular">{fmtClock(restLeft)}</span>
                  <span className="label-caps">Rest</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {nextSet && (
                  <p className="text-[15px] text-muted">
                    Next:{' '}
                    <span className="font-semibold text-ink">
                      Set {ci + 1} · {nextSet.weight || 0} × {nextSet.reps || '-'}
                    </span>{' '}
                    <HelpTip title="Rest timer">
                      <p>A countdown between sets so you recover before the next one. Tap Start set to begin early.</p>
                      <p>Turn it off any time from the ... menu at the top of the screen.</p>
                    </HelpTip>
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startNextSet}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent font-bold text-white active:scale-[0.97]"
                  >
                    Start set {ci + 1}
                  </button>
                  <button type="button" onClick={() => addRest(30)} className="btn-ghost-sm">
                    +30 sec
                  </button>
                </div>
              </div>
            </div>
          ) : null}` + s.slice(R1)

// 3. The "up next" row in the list is just a highlighted row (the Start button lives in the rest card)
const U0 = idx('if (isCur && nextSet && resting) {')
const U1 = idx('                if (st.done) {', U0)
s = s.slice(0, U0) + `if (isCur && nextSet && resting) {
                  return (
                    <li
                      key={i}
                      className="flex min-h-12 items-center justify-between rounded-xl border-2 border-accent bg-surface px-3 tabular"
                    >
                      <span className="font-semibold">
                        Set {i + 1} <span className="text-sm font-normal text-muted">up next</span>
                      </span>
                      <span className="font-display text-[19px] font-bold">
                        {nextSet.weight || 0} × {nextSet.reps || '-'}
                      </span>
                    </li>
                  )
                }
` + s.slice(U1)

if (crlf) s = s.replace(/\n/g, '\r\n')
fs.writeFileSync(f, s)
console.log('DONE')

import fs from 'node:fs'
const f = 'src/components/workout-logger.tsx'
let s = fs.readFileSync(f, 'utf8')
const crlf = s.includes('\r\n')
if (crlf) s = s.replace(/\r\n/g, '\n')
if (s.includes('LOG-BIG-NUMBERS')) { console.log('SKIPPED (already applied)'); process.exit(0) }

function rep(a, b) {
  const n = s.split(a).length - 1
  if (n !== 1) { console.log(`MISSING/AMBIGUOUS (${n}):`, a.slice(0, 60)); process.exit(1) }
  s = s.replace(a, () => b)
}

// 1. Set chips: one compact row, "+" on the same row
rep(`<div className="grid grid-cols-4 gap-2">
            {current.sets.map((s, i) => {`, `<div className="flex flex-wrap gap-2" data-x="LOG-BIG-NUMBERS">
            {current.sets.map((s, i) => {`)
rep(`flex h-[52px] items-center justify-center gap-1 rounded-[14px] font-display text-[19px] font-bold tabular`,
    `flex h-11 min-w-[76px] flex-1 items-center justify-center gap-1 rounded-[12px] px-2 font-display text-[17px] font-bold tabular`)
rep(`flex h-[52px] items-center justify-center rounded-[14px] border-2 border-accent bg-surface text-[15px] font-semibold`,
    `flex h-11 min-w-[76px] flex-1 items-center justify-center rounded-[12px] border-2 border-accent bg-surface px-2 text-[15px] font-semibold`)
rep(`flex h-[52px] items-center justify-center rounded-[14px] border border-dashed border-dash text-[15px] text-muted`,
    `flex h-11 min-w-[76px] flex-1 items-center justify-center rounded-[12px] border border-dashed border-dash px-2 text-[15px] text-muted`)
rep(`flex h-[52px] items-center justify-center rounded-[14px] border border-dashed border-line-strong text-2xl text-muted`,
    `flex h-11 w-11 flex-none items-center justify-center rounded-[12px] border border-dashed border-line-strong text-2xl text-muted`)

// 2. Rest text a bit bigger
rep(`<span className="ml-auto text-sm text-muted">`, `<span className="ml-auto text-[15px] text-muted">`)

// 3. Weight and reps side by side with big numbers
const start = `{(['weight', 'reps'] as const).map((field) => (`
const endMark = `\n              ))}\n            </div>\n          ) : allDone ? (`
const i0 = s.indexOf(start)
const i1 = s.indexOf(endMark)
if (i0 < 0 || i1 < i0) { console.log('MISSING weight/reps block'); process.exit(1) }
const block = `<div className="grid grid-cols-2 gap-3">
                {(['weight', 'reps'] as const).map((field) => (
                  <div key={field} className="card px-2.5 py-3 text-center">
                    <label htmlFor={\`\${field}-\${ci}\`} className="label-caps">
                      {field === 'reps' ? 'Reps' : 'Weight · lb'}
                    </label>
                    <input
                      id={\`\${field}-\${ci}\`}
                      type="number"
                      inputMode={field === 'reps' ? 'numeric' : 'decimal'}
                      value={nextSet[field]}
                      onChange={(e) => setField(ci, field, e.target.value)}
                      className={\`mt-1 w-full min-w-0 rounded-xl bg-transparent text-center font-display text-[68px] font-extrabold leading-[1.05] tabular text-ink outline-none focus-visible:bg-inset \${NO_SPINNER}\`}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        aria-label={field === 'reps' ? 'One fewer rep' : 'Five pounds less'}
                        onClick={() => bump(ci, field, field === 'reps' ? -1 : -5)}
                        className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-line-strong bg-inset text-[30px] leading-none text-ink active:scale-95"
                      >
                        &minus;
                      </button>
                      <button
                        type="button"
                        aria-label={field === 'reps' ? 'One more rep' : 'Five pounds more'}
                        onClick={() => bump(ci, field, field === 'reps' ? 1 : 5)}
                        className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-line-strong bg-inset text-[30px] leading-none text-ink active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>`
s = s.slice(0, i0) + block + s.slice(i1 + `\n              ))}`.length)

if (crlf) s = s.replace(/\n/g, '\r\n')
fs.writeFileSync(f, s)
console.log('DONE')

import fs from 'node:fs'
const f = 'src/components/workout-logger.tsx'
let s = fs.readFileSync(f, 'utf8')
const crlf = s.includes('\r\n')
if (crlf) s = s.replace(/\r\n/g, '\n')
const already = s.includes('LOG-SET-LIST')
if (already && s.includes('grid-cols-[44px_1fr_44px]')) { console.log('SKIPPED (already applied)'); process.exit(0) }
const fail = (m) => { console.log('MISSING:', m); process.exit(1) }
const idx = (needle, from = 0) => { const i = s.indexOf(needle, from); if (i < 0) fail(needle); return i }

const list = `<div className="card p-2" data-x="LOG-SET-LIST">
            <ul className="space-y-1.5">
              {current.sets.map((st, i) => {
                const isCur = i === ci && !allDone
                if (isCur && nextSet && !resting) {
                  const tw = targetWeight(basisMax, nextSet.percent, step)
                  return (
                    <li key={i} className="rounded-2xl border-2 border-accent bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="font-display text-xl font-bold">
                          {editing !== null ? \`Editing set \${i + 1}\` : \`Set \${i + 1} of \${current.sets.length}\`}
                        </p>
                        {nextSet.percent && <PercentBadge percent={nextSet.percent} />}
                        {tw && <span className="text-sm font-semibold text-muted">Target {fmtTarget(tw)} lb</span>}
                        <span className="ml-auto text-sm text-muted">
                          {nextSet.toFailure ? (
                            <span className="font-bold uppercase text-accent-text">To failure</span>
                          ) : (current.rests[ci] ?? 0) > 0 ? (
                            \`Rest \${current.rests[ci]} sec after\`
                          ) : (
                            'No rest after'
                          )}
                        </span>
                      </div>
                      {(['weight', 'reps'] as const).map((field) => (
                        <div key={field} className="mt-2 grid grid-cols-[44px_1fr_44px] items-center gap-2">
                          <button
                            type="button"
                            aria-label={field === 'reps' ? 'One fewer rep' : 'Five pounds less'}
                            onClick={() => bump(ci, field, field === 'reps' ? -1 : -5)}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-inset text-[22px] leading-none text-ink active:scale-95"
                          >
                            &minus;
                          </button>
                          <div className="text-center">
                            <label htmlFor={\`\${field}-\${ci}\`} className="label-caps block">
                              {field === 'reps' ? 'Reps' : 'Weight · lb'}
                            </label>
                            <input
                              id={\`\${field}-\${ci}\`}
                              type="number"
                              inputMode={field === 'reps' ? 'numeric' : 'decimal'}
                              value={nextSet[field]}
                              onChange={(e) => setField(ci, field, e.target.value)}
                              className={\`w-full min-w-0 rounded-xl bg-transparent text-center font-display text-[52px] font-extrabold leading-none tabular text-ink outline-none focus-visible:bg-inset \${NO_SPINNER}\`}
                            />
                          </div>
                          <button
                            type="button"
                            aria-label={field === 'reps' ? 'One more rep' : 'Five pounds more'}
                            onClick={() => bump(ci, field, field === 'reps' ? 1 : 5)}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-inset text-[22px] leading-none text-ink active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void logSet()}
                        className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                        {busy ? 'Saving...' : buttonLabel}
                      </button>
                    </li>
                  )
                }
                if (isCur && nextSet && resting) {
                  return (
                    <li key={i} className="rounded-2xl border-2 border-accent bg-surface p-3">
                      <p className="tabular text-[15px] text-muted">
                        Up next: <span className="font-semibold text-ink">Set {i + 1} · {nextSet.weight || 0} × {nextSet.reps || '-'}</span>
                      </p>
                      <button type="button" onClick={startNextSet} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-white active:scale-[0.97]">
                        Start set {i + 1}
                      </button>
                    </li>
                  )
                }
                if (st.done) {
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          startNextSet()
                          setEditing(i)
                        }}
                        aria-label={\`Set \${i + 1}: \${st.weight || 0} pounds for \${st.reps} reps\${st.pr ? ', personal record' : ''}. Tap to edit.\`}
                        className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-left"
                      >
                        <span
                          className={\`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full \${
                            st.pr ? 'bg-record text-on-record' : 'bg-success text-on-success'
                          }\`}
                          aria-hidden="true"
                        >
                          {st.pr ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" /></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                          )}
                        </span>
                        <span className="text-[15px] text-muted">{st.pr ? \`Set \${i + 1} · PR\` : \`Set \${i + 1}\`}</span>
                        <span className={\`ml-auto font-display text-[19px] font-bold tabular \${st.pr ? 'text-record' : 'text-ink'}\`}>
                          {st.weight || 0} × {st.reps}
                        </span>
                      </button>
                    </li>
                  )
                }
                return (
                  <li
                    key={i}
                    className="flex min-h-11 items-center justify-between rounded-xl border border-dashed border-dash px-3 text-[15px] text-muted tabular"
                  >
                    <span>Set {i + 1}</span>
                    <span>{st.toFailure ? 'To failure' : \`\${st.weight || '-'} × \${st.reps || '-'}\`}</span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={addSet}
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-dashed border-line-strong text-[15px] font-semibold text-muted"
              >
                + Add set
              </button>
              {current.sets.length > 1 && !current.sets[current.sets.length - 1].done && (
                <button type="button" onClick={removeLastSet} className="min-h-11 px-3 text-sm text-muted hover:text-ink">
                  Remove last set
                </button>
              )}
            </div>
          </div>
          `


const LIST_START = '<div className="card p-2" data-x="LOG-SET-LIST">'
if (already) {
  // Upgrade from the first set-list version: swap only the list block.
  const L0 = idx(LIST_START)
  const L1 = idx('{allDone ? (', L0)
  s = s.slice(0, L0) + list + s.slice(L1)
  if (crlf) s = s.replace(/\n/g, '\r\n')
  fs.writeFileSync(f, s)
  console.log('DONE (upgraded)')
  process.exit(0)
}

// ---- 1. Rebuild the middle of the exercise screen -------------------------
const A = idx('{/* Every set at a glance.')
const B = idx('{prNote && (', A)
const C = idx('{resting ? (', B)
const D = idx(') : !allDone && nextSet ? (', C)
const E = idx(') : allDone ? (', D)
const F = idx(') : null}', E)

const pr = s.slice(B, C)
let restCard = s.slice(C, D) + ') : null}'
restCard = restCard.replace('h-[168px] w-[168px]', 'h-[128px] w-[128px]').replace('text-[56px]', 'text-[40px]')
const doneCard = '{allDone ? (' + s.slice(E + ') : allDone ? ('.length, F) + ') : null}'

s = s.slice(0, A) + pr + restCard + '\n\n          ' + list + doneCard + s.slice(F + ') : null}'.length)

// ---- 2. Bottom bar only when the exercise is finished ---------------------
const G = idx('{/* The one big button, where your thumb is */}')
const H = idx('{/* Toast */}', G)
const bar = `{/* After the last set: rate the exercise. Logging a set lives inside the set list. */}
      {allDone && (
        <div className="flex-none border-t border-line bg-canvas px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPickedEffort(current.effort)
                setNoteText(current.note)
                setNoteOpen(Boolean(current.note))
                setSheet('effort')
              }}
              className={bigButton}
            >
              {busy ? 'Saving...' : buttonLabel}
            </button>
          </div>
        </div>
      )}

      `
s = s.slice(0, G) + bar + s.slice(H)

if (crlf) s = s.replace(/\n/g, '\r\n')
fs.writeFileSync(f, s)
console.log('DONE')

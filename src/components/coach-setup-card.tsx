'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const GOALS = ['Build muscle', 'Get stronger', 'Lose fat', 'Athletic performance', 'General fitness']
const LENGTHS = ['30 min', '45 min', '60 min', '75+ min']
const MAIN_STYLES = ['Full body', 'Upper / Lower', 'Push / Pull / Legs', 'Bro split']
const FOCUS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
const WEEKS = [4, 6, 8, 12]
const CHOOSE = 'Let the Coach choose'

const STYLES: [string, string][] = [
  [CHOOSE, 'Coach picks the best fit for your days, goal and experience'],
  ['Full body', 'Every session hits everything'],
  ['Upper / Lower', 'Alternate upper and lower days'],
  ['Push / Pull / Legs', 'Best at 5-6 days'],
  ['Bro split', 'One body part per day'],
  ['Full body 3x', 'Three full-body days, great for beginners'],
  ['Push / Pull', 'Four days, upper body split two ways'],
  ['Arnold split', 'Chest and back, shoulders and arms, legs'],
  ['PPL x2 (6 days)', 'Push, pull, legs twice a week'],
  ['Powerbuilding', 'Heavy strength work plus bodybuilding volume'],
  ['Strength 5x5', 'Simple heavy barbell lifts, 5 sets of 5'],
  ['Olympic lifting', 'Snatch, clean and jerk, and the lifts that build them'],
  ['Athlete / sport performance', 'Power, speed and strength for your sport'],
  ['Glute focus', 'Extra volume for glutes and legs'],
  ['Minimalist (short sessions)', 'Few exercises, done fast'],
  ['Home workouts', 'Dumbbells, bands, little or no equipment'],
  ['Hypertrophy only', 'Muscle size focus, higher reps'],
  ['Bodyweight', 'No equipment at all'],
  ['Calisthenics', 'Pull-ups, dips, push-ups and progressions'],
  ['Kettlebell', 'Kettlebell-based strength and conditioning'],
  ['Conditioning mix', 'Lifting plus cardio and intervals'],
]

const chip = (on: boolean) =>
  `rounded-full border px-3 py-2 text-sm ${on ? 'border-accent bg-accent/20 text-ink' : 'border-line text-muted'}`

function StylePicker({
  current,
  onPick,
  onClose,
}: {
  current: string
  onPick: (v: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const hits = useMemo(
    () => STYLES.filter(([n, d]) => !ql || n.toLowerCase().includes(ql) || d.toLowerCase().includes(ql)),
    [ql]
  )
  const exact = STYLES.some(([n]) => n.toLowerCase() === ql)

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Pick a style"
        className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-canvas p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Pick a style</h2>
          <button type="button" onClick={onClose} className="btn-ghost-sm">
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">Search the list, or type your own.</p>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or type a style..."
          className="input-field mt-3"
          aria-label="Search styles"
        />
        <div className="mt-3 space-y-2 overflow-y-auto pb-2">
          {ql && !exact && (
            <button
              type="button"
              onClick={() => onPick(q.trim())}
              className="block w-full rounded-2xl border border-accent bg-accent/15 px-4 py-3 text-left text-ink"
            >
              <span className="font-semibold">Use what I typed:</span> &ldquo;{q.trim()}&rdquo;
              <span className="block text-xs text-muted">The Coach builds around it</span>
            </button>
          )}
          {hits.map(([n, d]) => (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left text-ink ${
                current === n ? 'border-accent bg-accent/15' : 'border-line'
              }`}
            >
              {n}
              <span className="block text-xs text-muted">{d}</span>
            </button>
          ))}
          {hits.length === 0 && <p className="text-sm text-muted">No styles match. Use what you typed above.</p>}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function CoachSetupCard({ onBuild, disabled }: { onBuild: (message: string) => void; disabled?: boolean }) {
  const [goal, setGoal] = useState<string | null>(null)
  const [days, setDays] = useState<number | null>(null)
  const [len, setLen] = useState('60 min')
  const [style, setStyle] = useState(MAIN_STYLES[1])
  const [focus, setFocus] = useState<string[]>([])
  const [weeks, setWeeks] = useState(8)
  const [fromProfile, setFromProfile] = useState<{ goal: boolean; days: boolean }>({ goal: false, days: false })
  const [equip, setEquip] = useState<string[]>([])
  const [limits, setLimits] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    fetch('/api/coach-profile')
      .then((r) => r.json())
      .then((p) => {
        const goals: string[] = Array.isArray(p.goals) ? p.goals : []
        const match = GOALS.find((g) => goals.some((x) => x.toLowerCase() === g.toLowerCase()))
        if (match) setGoal(match)
        if (typeof p.days === 'number' && p.days >= 2 && p.days <= 6) setDays(p.days)
        setFromProfile({ goal: Boolean(match), days: typeof p.days === 'number' && p.days >= 2 && p.days <= 6 })
        setEquip(Array.isArray(p.equipment) ? p.equipment : [])
        setLimits(p.limits ?? null)
      })
      .catch(() => {})
  }, [])

  const customStyle = !MAIN_STYLES.includes(style)
  const ready = Boolean(goal && days)

  function build() {
    if (!ready) return
    const styleLine =
      style === CHOOSE
        ? `Style: let the Coach choose. Pick the best split from my days, goal, experience and equipment (2-3 days full body, 4 days upper/lower, 5-6 days push/pull/legs or upper/lower plus extra work) and explain your pick in one sentence.`
        : `Style: ${style}`
    onBuild(
      [
        'Build me a new program with these choices. You have everything you need, so skip the interview questions and go straight to the outline and the program_json.',
        `Goal: ${goal}`,
        `Days per week: ${days}`,
        `Session length: ${len}`,
        styleLine,
        `Extra focus: ${focus.length ? focus.join(', ') : 'none'}`,
        `Program length: ${weeks} weeks`,
        'Use my saved profile for equipment, experience and limits.',
      ].join('\n')
    )
  }

  const tag = (show: boolean) =>
    show ? <span className="ml-2 text-[10px] normal-case tracking-normal text-accent">from your profile</span> : null
  const label = 'text-xs font-medium uppercase tracking-wide text-muted'

  return (
    <div className="space-y-4 rounded-2xl border border-line p-4">
      <p className="text-sm font-semibold text-ink">Set up your program</p>

      <div className="space-y-2">
        <p className={label}>Goal{tag(fromProfile.goal)}</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button key={g} type="button" onClick={() => setGoal(g)} className={chip(goal === g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Days a week{tag(fromProfile.days)}</p>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={chip(days === d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Session length</p>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((l) => (
            <button key={l} type="button" onClick={() => setLen(l)} className={chip(len === l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Style</p>
        <div className="flex flex-wrap gap-2">
          {MAIN_STYLES.map((s) => (
            <button key={s} type="button" onClick={() => setStyle(s)} className={chip(style === s)}>
              {s}
            </button>
          ))}
          {customStyle && (
            <button type="button" className={chip(true)}>
              {style}
            </button>
          )}
          <button type="button" onClick={() => setPicker(true)} className="rounded-full border border-dashed border-line px-3 py-2 text-sm text-ink">
            More styles...
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Extra focus (optional)</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFocus((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
              className={chip(focus.includes(f))}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Weeks</p>
        <div className="flex flex-wrap gap-2">
          {WEEKS.map((w) => (
            <button key={w} type="button" onClick={() => setWeeks(w)} className={chip(weeks === w)}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {(equip.length > 0 || limits) && (
        <p className="text-xs text-muted">
          The Coach also uses your profile
          {equip.length > 0 ? `: ${equip.join(', ')}` : ''}
          {limits ? `. Limits: ${limits}` : ''}
        </p>
      )}

      <button type="button" onClick={build} disabled={!ready || disabled} className="btn-accent w-full">
        {ready ? 'Build my program' : 'Pick a goal and days to build'}
      </button>

      {picker && (
        <StylePicker
          current={style}
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setStyle(v)
            setPicker(false)
          }}
        />
      )}
    </div>
  )
}

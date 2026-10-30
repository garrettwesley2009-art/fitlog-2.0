'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfileFields, type ProfilePatch } from '@/app/actions/profile'

const GOALS = ['Get stronger', 'Build muscle', 'Lose fat', 'Athletic performance', 'Stay consistent']
const EQUIPMENT = ['Full gym', 'Barbell and rack', 'Dumbbells', 'Kettlebells', 'Bands or bodyweight only']

export type ProfileValues = {
  name: string
  birthDate: string
  gender: string | null
  goals: string[]
  days: number | null
  experience: string | null
  equipment: string[]
  heightFt: string
  heightIn: string
  weightLb: string
  limits: string
}

type Step = {
  id: string
  title: string
  hint: string
  required?: boolean
  answered: (v: ProfileValues) => boolean
  patch: (v: ProfileValues) => ProfilePatch
}

const STEPS: Step[] = [
  {
    id: 'name',
    title: 'What should we call you?',
    hint: 'Your first name.',
    required: true,
    answered: (v) => v.name.trim() !== '',
    patch: (v) => ({ name: v.name }),
  },
  {
    id: 'birth',
    title: 'When is your birthday?',
    hint: 'Helps tailor training to your age. Optional.',
    answered: (v) => v.birthDate !== '',
    patch: (v) => ({ birthDate: v.birthDate }),
  },
  {
    id: 'gender',
    title: 'Are you male or female?',
    hint: 'Optional.',
    answered: (v) => v.gender != null,
    patch: (v) => ({ gender: v.gender }),
  },
  {
    id: 'goals',
    title: 'What are your goals?',
    hint: 'Pick any that fit.',
    required: true,
    answered: (v) => v.goals.length > 0,
    patch: (v) => ({ goals: v.goals }),
  },
  {
    id: 'days',
    title: 'How many days a week do you want to train?',
    hint: 'We will keep programs close to this.',
    answered: (v) => v.days != null,
    patch: (v) => ({ days: v.days }),
  },
  {
    id: 'experience',
    title: 'How much lifting experience do you have?',
    hint: 'Be honest, there is no wrong answer.',
    answered: (v) => v.experience != null,
    patch: (v) => ({ experience: v.experience }),
  },
  {
    id: 'equipment',
    title: 'What equipment can you use?',
    hint: 'Pick all that apply.',
    answered: (v) => v.equipment.length > 0,
    patch: (v) => ({ equipment: v.equipment }),
  },
  {
    id: 'height',
    title: 'How tall are you?',
    hint: 'Optional.',
    answered: (v) => v.heightFt !== '',
    patch: (v) => ({ heightFt: v.heightFt, heightIn: v.heightIn }),
  },
  {
    id: 'weight',
    title: 'What do you weigh?',
    hint: 'In pounds. Optional, only you see it.',
    answered: (v) => v.weightLb !== '',
    patch: (v) => ({ weightLb: v.weightLb }),
  },
  {
    id: 'limits',
    title: 'Any injuries or limits?',
    hint: 'Anything we should work around. Optional.',
    answered: () => false,
    patch: (v) => ({ limits: v.limits }),
  },
]

const EXPERIENCE = [
  { id: 'new', label: 'New to lifting', note: 'Under 6 months' },
  { id: 'some', label: 'Some experience', note: '6 months to 2 years' },
  { id: 'experienced', label: 'Experienced', note: '2+ years of steady training' },
]

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Summary({ v }: { v: ProfileValues }) {
  const rows: [string, string][] = [
    ['Name', v.name],
    ['Birthday', v.birthDate ? new Date(`${v.birthDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''],
    ['Gender', v.gender ? (v.gender === 'male' ? 'Male' : 'Female') : ''],
    ['Goals', v.goals.join(', ')],
    ['Days a week', v.days ? String(v.days) : ''],
    ['Experience', EXPERIENCE.find((e) => e.id === v.experience)?.label ?? ''],
    ['Equipment', v.equipment.join(', ')],
    ['Height', v.heightFt ? `${v.heightFt} ft ${v.heightIn || 0} in` : ''],
    ['Weight', v.weightLb ? `${v.weightLb} lb` : ''],
    ['Limits', v.limits],
  ]
  return (
    <dl className="mt-4 text-left text-sm">
      {rows.map(([k, val]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5">
          <dt className="flex-none text-muted">{k}</dt>
          <dd className="min-w-0 text-right text-ink">{val || '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

// The "Set up profile" button, its progress, and the one-question-at-a-time screens.
export function ProfileSetup({
  initial,
  percent,
}: {
  initial: ProfileValues
  percent: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<ProfileValues>(initial)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ProfileValues>(k: K, value: ProfileValues[K]) => {
    setError(null)
    setV((p) => ({ ...p, [k]: value }))
  }
  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

  function start() {
    const first = STEPS.findIndex((s) => !s.answered(initial))
    setV(initial)
    setStep(first === -1 ? 0 : first)
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    router.refresh()
  }

  async function advance(skip = false) {
    const s = STEPS[step]
    setError(null)
    if (!skip) {
      setBusy(true)
      const res = await saveProfileFields(s.patch(v))
      setBusy(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
    }
    setStep(step + 1)
  }

  const finished = step >= STEPS.length
  const s = finished ? null : STEPS[step]
  const canNext = !s?.required || s.answered(v)

  const chip = (on: boolean) =>
    `rounded-full border px-5 py-3 text-[15px] ${on ? 'border-accent bg-accent text-ink' : 'border-line text-muted'}`
  const option = (on: boolean) =>
    `mt-2.5 block w-full rounded-2xl border px-4 py-3.5 text-left text-[15px] text-ink ${
      on ? 'border-accent bg-accent/20' : 'border-line bg-glass'
    }`

  return (
    <>
      <div className="glass-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">
            {percent === 100 ? 'Profile complete' : percent === 0 ? 'Set up your profile' : 'Finish your profile'}
          </p>
          <p className="text-xs text-muted">{percent}% done</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {percent === 100
            ? 'All filled in. Thanks, this helps the Coach suggest better programs.'
            : 'A few quick questions for sharper coaching from the Coach tab.'}
        </p>
        <button type="button" onClick={start} className="btn-accent mt-4 w-full py-3.5 text-base">
          {percent === 0 ? 'Set up profile' : percent === 100 ? 'Edit profile' : 'Continue setup'}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[85] flex flex-col bg-canvas px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line bg-glass text-ink"
              >
                &#10005;
              </button>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }}
                />
              </div>
              {!finished && (
                <span className="text-xs text-muted">
                  {step + 1}/{STEPS.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pt-6">
              {finished || !s ? (
                <div className="text-center">
                  <div className="text-5xl" aria-hidden="true">
                    &#127881;
                  </div>
                  <h1 className="mt-3 font-display text-[34px] font-extrabold text-ink">You&apos;re all set</h1>
                  <p className="mt-2 text-sm text-muted">
                    Here is your profile. You can change any of it later from the You page.
                  </p>
                  <Summary v={v} />
                </div>
              ) : (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-accent">Question {step + 1}</p>
                  <h1 className="mt-1 font-display text-[34px] font-extrabold leading-none text-ink">{s.title}</h1>
                  <p className="mt-2 text-sm text-muted">{s.hint}</p>

                  {s.id === 'name' && (
                    <input
                      className="input-field mt-5 text-xl"
                      autoFocus
                      value={v.name}
                      maxLength={40}
                      autoComplete="given-name"
                      placeholder="First name"
                      onChange={(e) => set('name', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canNext && void advance()}
                    />
                  )}

                  {s.id === 'birth' && (
                    <input
                      type="date"
                      aria-label="Date of birth"
                      className="input-field mt-5 text-xl"
                      min="1920-01-01"
                      max={today()}
                      value={v.birthDate}
                      onChange={(e) => set('birthDate', e.target.value)}
                    />
                  )}

                  {s.id === 'gender' &&
                    [
                      ['male', 'Male'],
                      ['female', 'Female'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={v.gender === id}
                        onClick={() => set('gender', v.gender === id ? null : id)}
                        className={option(v.gender === id)}
                      >
                        {label}
                      </button>
                    ))}

                  {s.id === 'goals' && (
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {GOALS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={v.goals.includes(g)}
                          onClick={() => set('goals', toggle(v.goals, g))}
                          className={chip(v.goals.includes(g))}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  )}

                  {s.id === 'days' && (
                    <div className="mt-5 flex gap-2.5">
                      {[2, 3, 4, 5, 6].map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={v.days === d}
                          onClick={() => set('days', v.days === d ? null : d)}
                          className={`h-14 w-14 rounded-full border text-base font-semibold ${
                            v.days === d ? 'border-accent bg-accent text-ink' : 'border-line text-muted'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}

                  {s.id === 'experience' &&
                    EXPERIENCE.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        aria-pressed={v.experience === e.id}
                        onClick={() => set('experience', v.experience === e.id ? null : e.id)}
                        className={option(v.experience === e.id)}
                      >
                        {e.label}
                        <span className="mt-0.5 block text-xs text-muted">{e.note}</span>
                      </button>
                    ))}

                  {s.id === 'equipment' && (
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {EQUIPMENT.map((e) => (
                        <button
                          key={e}
                          type="button"
                          aria-pressed={v.equipment.includes(e)}
                          onClick={() => set('equipment', toggle(v.equipment, e))}
                          className={chip(v.equipment.includes(e))}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  {s.id === 'height' && (
                    <div className="mt-5 flex items-center gap-2.5">
                      <input
                        className="input-field w-24 text-center text-xl"
                        inputMode="numeric"
                        aria-label="Feet"
                        placeholder="ft"
                        maxLength={1}
                        value={v.heightFt}
                        onChange={(e) => set('heightFt', e.target.value.replace(/\D/g, ''))}
                      />
                      <span className="text-muted">ft</span>
                      <input
                        className="input-field w-24 text-center text-xl"
                        inputMode="decimal"
                        aria-label="Inches"
                        placeholder="in"
                        maxLength={4}
                        value={v.heightIn}
                        onChange={(e) => set('heightIn', e.target.value.replace(/[^\d.]/g, ''))}
                      />
                      <span className="text-muted">in</span>
                    </div>
                  )}

                  {s.id === 'weight' && (
                    <input
                      className="input-field mt-5 text-xl"
                      inputMode="decimal"
                      placeholder="lb"
                      maxLength={5}
                      value={v.weightLb}
                      onChange={(e) => set('weightLb', e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  )}

                  {s.id === 'limits' && (
                    <textarea
                      className="input-field mt-5 min-h-32 text-base"
                      maxLength={500}
                      placeholder="For example sore left shoulder"
                      value={v.limits}
                      onChange={(e) => set('limits', e.target.value)}
                    />
                  )}

                  {error && <p className="mt-3 text-sm text-danger">{error}</p>}
                </div>
              )}
            </div>

            <div className="pt-3">
              {finished || !s ? (
                <button type="button" onClick={close} className="btn-accent w-full py-3.5 text-base">
                  Done
                </button>
              ) : (
                <>
                  <div className="flex gap-2.5">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        className="btn-ghost w-24 py-3.5 text-base"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || !canNext}
                      onClick={() => void advance()}
                      className="btn-accent flex-1 py-3.5 text-base"
                    >
                      {busy ? 'Saving...' : step === STEPS.length - 1 ? 'Finish' : 'Next'}
                    </button>
                  </div>
                  {!s.required && (
                    <button type="button" onClick={() => void advance(true)} className="mt-1 w-full py-3 text-sm text-muted">
                      Skip this one
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, skipOnboarding } from '@/app/actions/onboarding'

const GOALS = ['Get stronger', 'Build muscle', 'Lose fat', 'Athletic performance', 'Stay consistent']

const SLIDES = [
  {
    title: 'Welcome to FitLog',
    body: 'Your program, your sets and your progress in one place, built for the way we train at the gym.',
    icon: '\u{1F44B}',
  },
  {
    title: 'Pick a program',
    body: 'Open Workout, then Discover, to choose a ready-made program, or Build your own. A program runs for a set number of weeks. You do each day in order, whenever it suits you.',
    icon: '\u{1F4CB}',
  },
  {
    title: 'Log your sets',
    body: 'Open Workout, change the weight and reps to what you really did, then tap the big button. A rest timer starts for you. No signal at the gym? Your sets are saved on your phone and upload on their own later.',
    icon: '\u{1F3CB}\u{FE0F}',
  },
  {
    title: 'See your progress',
    body: 'Home shows your week, your streak and the weight you lifted. Anywhere you see a small (?), tap it for a quick explanation.',
    icon: '\u{1F4C8}',
  },
]

export function Welcome({
  replay,
  canSkip,
  initialName,
}: {
  replay: boolean
  canSkip: boolean
  initialName: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0..SLIDES.length-1 are slides, SLIDES.length is the setup form
  const [name, setName] = useState(initialName)
  const [goals, setGoals] = useState<string[]>([])
  const [days, setDays] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onForm = step === SLIDES.length
  const slide = SLIDES[step]

  function leave(tour = false) {
    router.push(tour ? '/dashboard?tour=1' : '/dashboard')
    router.refresh()
  }

  function nextFromSlides() {
    if (step < SLIDES.length - 1) setStep(step + 1)
    else if (replay) leave(true)
    else setStep(SLIDES.length)
  }

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  async function save() {
    setBusy(true)
    setError(null)
    const res = await completeOnboarding({ name, goals, days })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    leave(true)
  }

  async function skipSetup() {
    setBusy(true)
    setError(null)
    const res = await skipOnboarding()
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    leave()
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink">FitLog</p>
        {!onForm && (
          <button
            type="button"
            onClick={() => (replay ? leave(true) : setStep(SLIDES.length))}
            className="text-sm text-muted"
          >
            Skip
          </button>
        )}
      </div>

      <div className="my-4 flex justify-center gap-2" aria-hidden="true">
        {[...SLIDES, null].map((_, n) => (
          <span key={n} className={`h-1.5 w-8 rounded-full ${n <= step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </div>

      {!onForm && slide && (
        <section className="glass-card flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl" aria-hidden="true">
            {slide.icon}
          </div>
          <h1 className="mt-6 font-display text-[34px] font-extrabold text-ink">{slide.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{slide.body}</p>
        </section>
      )}

      {onForm && (
        <section className="glass-card flex-1 space-y-6 p-6">
          <div>
            <h1 className="font-display text-[34px] font-extrabold text-ink">About you</h1>
            <p className="mt-1 text-sm text-muted">Two quick things so the app can be yours.</p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">First name</span>
            <input
              className="input-field mt-1 w-full"
              value={name}
              maxLength={40}
              autoComplete="given-name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">What are your goals? Pick any</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOALS.map((g) => {
                const on = goals.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGoal(g)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      on ? 'border-accent bg-accent text-ink' : 'border-line text-muted'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Days a week you want to train (optional)
            </p>
            <div className="mt-2 flex gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(days === d ? null : d)}
                  className={`h-11 w-11 rounded-full border text-sm font-semibold ${
                    days === d ? 'border-accent bg-accent text-ink' : 'border-line text-muted'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </section>
      )}

      <div className="mt-4 space-y-2">
        {!onForm ? (
          <button type="button" onClick={nextFromSlides} className="btn-accent w-full py-3">
            {step === SLIDES.length - 1 ? (replay ? 'Done' : 'Next') : 'Next'}
          </button>
        ) : (
          <>
            <button type="button" onClick={save} disabled={busy} className="btn-accent w-full py-3">
              {busy ? 'Saving...' : "Let's go"}
            </button>
            {canSkip && (
              <button type="button" onClick={skipSetup} disabled={busy} className="w-full py-2 text-sm text-muted">
                Skip for now
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}

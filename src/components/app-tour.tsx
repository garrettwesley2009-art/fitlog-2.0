'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const STEPS = [
  {
    target: 'nav-workout',
    title: 'Workout',
    body: 'Your program lives here. Log your sets, see the rest of your program, find new programs in Discover, or build your own.',
  },
  { target: 'nav-home', title: 'Home', body: "Today's workout, your week, your streak and the weight you have lifted." },
  { target: 'nav-coach', title: 'Coach', body: 'Ask the coach to build or change a program for you.' },
  {
    target: 'nav-you',
    title: 'You',
    body: 'Your profile and goals. You can replay this tour from here any time.',
  },
]

type Box = { top: number; left: number; width: number; height: number }

function Tour() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const active = params.get('tour') === '1'
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<Box | null>(null)

  const finish = useCallback(() => {
    setStep(0)
    router.replace(pathname)
  }, [router, pathname])

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${STEPS[step]?.target}"]`)
    if (!el) return setBox(null)
    const r = el.getBoundingClientRect()
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step])

  useLayoutEffect(() => {
    if (!active) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  // If a step's button is not on screen, skip it instead of pointing at nothing.
  useEffect(() => {
    if (active && !box && step < STEPS.length - 1) {
      const t = setTimeout(() => {
        if (!document.querySelector(`[data-tour="${STEPS[step].target}"]`)) setStep((s) => s + 1)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [active, box, step])

  if (!active || !box) return null
  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth
  const vh = typeof window === 'undefined' ? 780 : window.innerHeight
  const width = Math.min(320, vw - 32)
  const center = box.left + box.width / 2
  const left = Math.max(16, Math.min(center - width / 2, vw - width - 16))

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="App tour">
      <div className="absolute inset-0" />
      <div
        className="pointer-events-none absolute rounded-2xl ring-2 ring-accent"
        style={{
          top: box.top - 6,
          left: box.left - 6,
          width: box.width + 12,
          height: box.height + 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
        }}
      />
      <div
        className="absolute rounded-3xl border border-line bg-surface p-5 shadow-xl"
        style={{ left, width, bottom: vh - box.top + 18 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
          {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink">{s.title}</h2>
        <p className="mt-1 text-sm text-muted">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-sm text-muted">
            Skip tour
          </button>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="btn-accent px-6 py-2.5"
          >
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppTour() {
  return (
    <Suspense fallback={null}>
      <Tour />
    </Suspense>
  )
}

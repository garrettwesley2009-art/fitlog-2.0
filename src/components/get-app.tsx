'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

// "Get the app" bar on Home and its step-by-step install sheet. Hidden once
// FitLog runs from the home screen. On Chrome (Android or computer) the
// browser hands us an install prompt, so the sheet shows one Install button;
// everywhere else it walks through the browser's own menus.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type Kind = 'hidden' | 'prompt' | 'ios' | 'android' | 'desktop'

let deferred: InstallPrompt | null = null
let installedHere = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// Registered as soon as this file loads, because Chrome fires the event once, early.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPrompt
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedHere = true
    notify()
  })
}

const STANDALONE = '(display-mode: standalone)'

function subscribe(listener: () => void) {
  listeners.add(listener)
  const mq = window.matchMedia(STANDALONE)
  mq.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    mq.removeEventListener('change', listener)
  }
}

function getKind(): Kind {
  const nav = navigator as Navigator & { standalone?: boolean }
  if (installedHere || nav.standalone || window.matchMedia(STANDALONE).matches) return 'hidden'
  if (deferred) return 'prompt'
  const ua = nav.userAgent
  // iPadOS reports itself as a Mac, so check for touch too.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

type Step = { art: ReactNode; title: string; body: string }

// ---- Drawings of what to tap (the thing to tap has the red ring) ----

function ShareArt() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="42" className="fill-surface stroke-accent-text" strokeWidth="3" />
      <g className="stroke-ink" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 58v20h28V58" />
        <path d="M60 68V36M50 46l10-10 10 10" />
      </g>
    </svg>
  )
}

function MenuArt({ above, item, below }: { above: string; item: string; below: string }) {
  return (
    <svg width="230" height="126" viewBox="0 0 230 126" aria-hidden="true" className="font-sans">
      <rect x="10" y="10" width="210" height="30" rx="8" className="fill-surface" />
      <text x="24" y="30" fontSize="14" className="fill-muted">{above}</text>
      <rect x="10" y="46" width="210" height="36" rx="8" className="fill-surface stroke-accent-text" strokeWidth="2" />
      <text x="24" y="69" fontSize="15" fontWeight="600" className="fill-ink">{item}</text>
      <rect x="10" y="88" width="210" height="30" rx="8" className="fill-surface" />
      <text x="24" y="108" fontSize="14" className="fill-muted">{below}</text>
    </svg>
  )
}

function ChromeMenuArt() {
  return (
    <svg width="220" height="80" viewBox="0 0 220 80" aria-hidden="true" className="font-sans">
      <rect x="10" y="20" width="200" height="40" rx="20" className="fill-surface stroke-line" />
      <text x="30" y="45" fontSize="13" className="fill-muted">fitlog</text>
      <circle cx="186" cy="40" r="17" fill="none" className="stroke-accent-text" strokeWidth="2.5" />
      <g className="fill-ink">
        <circle cx="186" cy="32" r="2.6" />
        <circle cx="186" cy="40" r="2.6" />
        <circle cx="186" cy="48" r="2.6" />
      </g>
    </svg>
  )
}

function HomeScreenArt() {
  return (
    <svg width="200" height="100" viewBox="0 0 200 100" aria-hidden="true" className="font-sans">
      <rect x="20" y="16" width="44" height="44" rx="11" className="fill-glass-hover" />
      <rect x="136" y="16" width="44" height="44" rx="11" className="fill-glass-hover" />
      <clipPath id="get-app-tile">
        <rect x="78" y="16" width="44" height="44" rx="11" />
      </clipPath>
      <image href="/apple-touch-icon.png" x="78" y="16" width="44" height="44" clipPath="url(#get-app-tile)" />
      <rect x="77" y="15" width="46" height="46" rx="12" fill="none" className="stroke-accent-text" strokeWidth="2" />
      <text x="100" y="80" textAnchor="middle" fontSize="12" className="fill-ink">FitLog</text>
    </svg>
  )
}

function stepsFor(kind: Kind): Step[] {
  const open: Step = {
    art: <HomeScreenArt />,
    title: 'Open FitLog from your home screen',
    body: 'It opens full screen, like any other app, and you stay signed in.',
  }
  if (kind === 'ios')
    return [
      { art: <ShareArt />, title: 'Tap the Share button', body: 'The square with an arrow pointing up, at the bottom of Safari (top right on iPad).' },
      {
        art: <MenuArt above="Add to Favorites" item="Add to Home Screen" below="Find on Page" />,
        title: 'Tap "Add to Home Screen"',
        body: "Scroll down the list if you don't see it right away. Then tap Add.",
      },
      open,
    ]
  if (kind === 'android')
    return [
      { art: <ChromeMenuArt />, title: 'Tap the ⋮ menu', body: 'Three dots in the top right corner of Chrome.' },
      {
        art: <MenuArt above="New tab" item="Install app" below="Share…" />,
        title: 'Tap "Install app"',
        body: 'On some phones it says "Add to Home screen" instead.',
      },
      open,
    ]
  if (kind === 'prompt')
    return [{ art: <HomeScreenArt />, title: 'Install FitLog', body: 'Tap Install and FitLog goes on your home screen, opening full screen like any other app.' }]
  return [
    {
      art: <HomeScreenArt />,
      title: 'Open FitLog on your phone',
      body: `Go to ${window.location.host} in Safari (iPhone) or Chrome (Android), then tap Download the app on Home.`,
    },
  ]
}

function InstallSheet({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const [i, setI] = useState(0)
  const steps = stepsFor(kind)
  const step = steps[i]
  const last = i === steps.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function install() {
    const p = deferred
    if (!p) return
    await p.prompt()
    const { outcome } = await p.userChoice
    if (outcome === 'accepted') {
      deferred = null
      notify()
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="get-app-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl border border-line bg-surface px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <p className="label-caps tabular">{steps.length > 1 ? `Step ${i + 1} of ${steps.length}` : 'Download the app'}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-glass-hover">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-1 flex h-36 items-center justify-center rounded-2xl border border-line bg-canvas">{step.art}</div>
        <h2 id="get-app-title" className="mt-4 text-balance font-display text-[28px] font-bold leading-tight text-ink">
          {step.title}
        </h2>
        <p className="mt-1 text-muted">{step.body}</p>

        {steps.length > 1 && (
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
            {steps.map((_, k) => (
              <span key={k} className={`h-2 rounded-full ${k === i ? 'w-5 bg-ink' : 'w-2 bg-line-strong'}`} />
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="btn-ghost flex-1 rounded-2xl border font-bold text-ink">
              Back
            </button>
          )}
          {kind === 'prompt' ? (
            <button type="button" onClick={install} className="btn-accent flex-1 rounded-2xl font-bold">
              Install
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="min-h-12 flex-1 rounded-2xl bg-ink font-bold text-canvas transition-transform active:scale-[0.97]"
            >
              {last ? 'Done' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function GetApp() {
  // The server can't know, so it renders nothing and the browser fills it in.
  const kind = useSyncExternalStore(subscribe, getKind, () => 'hidden' as Kind)
  const [open, setOpen] = useState(false)

  if (kind === 'hidden') return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="card flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-transform active:scale-[0.98]"
      >
        <Image src="/apple-touch-icon.png" alt="" width={36} height={36} unoptimized className="flex-none rounded-[10px] border border-line" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Download the app</span>
          <span className="block text-sm text-muted">Install FitLog on your phone</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-muted">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && <InstallSheet kind={kind} onClose={() => setOpen(false)} />}
    </>
  )
}

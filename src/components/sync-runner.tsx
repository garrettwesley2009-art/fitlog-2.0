'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { flush, refreshStatus, clearFailed, useOutboxStatus } from '@/lib/outbox'

// Invisible helper that keeps the phone's saved workout data flowing to the server, plus a small
// pill at the top that only appears when something is waiting or went wrong.
export function SyncRunner() {
  const router = useRouter()
  const status = useOutboxStatus()
  const [online, setOnline] = useState(true)
  const previous = useRef(0)

  useEffect(() => {
    refreshStatus()
    setOnline(navigator.onLine)
    const run = () => {
      if (document.visibilityState === 'visible') void flush()
    }
    const goOnline = () => {
      setOnline(true)
      void flush()
    }
    const goOffline = () => setOnline(false)

    run()
    const timer = setInterval(run, 15_000)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    document.addEventListener('visibilitychange', run)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      document.removeEventListener('visibilitychange', run)
    }
  }, [])

  // When the last waiting item goes through, re-read the page data (so Home shows the finished day).
  useEffect(() => {
    if (previous.current > 0 && status.pending === 0) router.refresh()
    previous.current = status.pending
  }, [status.pending, router])

  const base =
    'fixed left-1/2 top-2 z-[65] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full border bg-surface/95 px-4 py-1.5 text-xs shadow-lg backdrop-blur'

  if (status.needsLogin && status.pending > 0) {
    return (
      <div className={`${base} border-accent text-ink`} role="status">
        <span>{status.pending} saved on your phone.</span>
        <Link href="/login" className="font-semibold text-accent">
          Log in to finish syncing
        </Link>
      </div>
    )
  }

  if (status.pending > 0) {
    return (
      <div className={`${base} ${online ? 'border-line text-muted' : 'border-accent text-ink'}`} role="status">
        {online
          ? `Syncing ${status.pending} ${status.pending === 1 ? 'item' : 'items'}...`
          : `Offline. ${status.pending} saved on your phone, will sync when you have signal.`}
      </div>
    )
  }

  if (status.failed > 0) {
    return (
      <div className={`${base} border-accent text-ink`} role="status">
        <span>
          {status.failed} {status.failed === 1 ? 'item' : 'items'} could not sync.
        </span>
        <button type="button" onClick={clearFailed} className="font-semibold text-accent">
          Dismiss
        </button>
      </div>
    )
  }

  return null
}

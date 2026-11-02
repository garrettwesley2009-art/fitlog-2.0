'use client'

import { useEffect } from 'react'

// Pages to keep ready for opening with no signal (see public/sw.js).
const SAVE = ['/dashboard', '/log']

// Registers /sw.js (offline launch for the home-screen app) and, when there is
// signal, asks it to save Home, Log and the current page. Production only, so
// local dev never serves stale files.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (!navigator.onLine) return
    navigator.serviceWorker.ready.then((reg) => {
      const paths = [...new Set([...SAVE, window.location.pathname])]
      reg.active?.postMessage({ type: 'save-pages', paths })
    })
  }, [])
  return null
}

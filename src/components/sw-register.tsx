'use client'

import { useEffect } from 'react'

// Registers /sw.js (offline launch for the home-screen app). Production only,
// so local dev never serves stale files.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}

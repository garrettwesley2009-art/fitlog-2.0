'use client'

import { useEffect } from 'react'
import { pingActivity } from '@/app/actions/activity'

const PING_EVERY_MS = 60_000

// Invisible. Tells the server "still here" once a minute while this tab is on screen.
export function Heartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'visible') {
        pingActivity().catch(() => {})
      }
    }
    ping()
    const timer = setInterval(ping, PING_EVERY_MS)
    document.addEventListener('visibilitychange', ping)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', ping)
    }
  }, [])

  return null
}

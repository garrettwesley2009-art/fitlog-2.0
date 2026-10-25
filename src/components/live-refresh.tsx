'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-reads the page's numbers every 30 seconds while the tab is open.
export function LiveRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, everyMs)
    return () => clearInterval(timer)
  }, [router, everyMs])
  return null
}

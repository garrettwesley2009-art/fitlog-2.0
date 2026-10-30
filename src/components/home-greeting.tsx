'use client'

import { useEffect, useState } from 'react'

// The hello and weekday depend on the visitor's own clock and time zone, so
// they are filled in by the browser after the page loads.
export function HomeGreeting({ name }: { name: string }) {
  const [info, setInfo] = useState<{ day: string; hello: string } | null>(null)

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    setInfo({ day: now.toLocaleDateString(undefined, { weekday: 'long' }), hello })
  }, [])

  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-[17px] font-medium text-muted">
        {info?.hello ?? 'Hello'}, <span className="font-semibold text-ink">{name}</span>
      </p>
      <p className="h-5 text-sm text-muted">{info?.day ?? ''}</p>
    </div>
  )
}

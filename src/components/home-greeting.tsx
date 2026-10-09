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
    <div>
      <p className="h-4 text-xs text-muted">{info?.day ?? ''}</p>
      <h1 className="mt-0.5 text-2xl font-semibold text-ink">
        {info?.hello ?? 'Hello'}, {name}
      </h1>
    </div>
  )
}

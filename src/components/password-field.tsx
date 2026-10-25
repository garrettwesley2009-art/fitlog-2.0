'use client'

import { useState } from 'react'

// A password box with a Show / Hide button, so typos are easy to spot on a phone.
export function PasswordField({
  name = 'password',
  autoComplete,
  minLength,
}: {
  name?: string
  autoComplete: 'current-password' | 'new-password'
  minLength?: number
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative mt-1">
      <input
        name={name}
        type={shown ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="input-field pr-16"
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-3 text-xs font-semibold text-muted hover:text-ink"
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

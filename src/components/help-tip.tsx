'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// A small (?) button that opens a short explanation. Put it right beside the thing it explains.
export function HelpTip({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={`What is this? ${title}`}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={`inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-muted/60 align-middle text-[11px] font-semibold leading-none text-muted active:bg-glass-hover ${className}`}
      >
        ?
      </button>
      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-sm bg-surface p-5 text-left"
          >
            <h2 id={id} className="text-base font-semibold text-ink">
              {title}
            </h2>
            <div className="mt-2 space-y-2 text-sm text-muted">{children}</div>
            <button type="button" onClick={() => setOpen(false)} className="btn-accent mt-4 w-full py-2.5">
              Got it
            </button>
          </div>
        </div>,
          document.body
        )}
    </>
  )
}

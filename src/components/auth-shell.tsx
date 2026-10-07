import type { ReactNode } from 'react'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas bg-glow px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        {/* LOGO SLOT: when you have a logo, put it in /public and replace this block with
            <Image src="/logo.png" alt="FitLog" width={120} height={40} /> */}
        <div className="mb-8 flex justify-center">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
            FitLog
          </span>
        </div>

        <div className="glass-card space-y-6 p-8">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
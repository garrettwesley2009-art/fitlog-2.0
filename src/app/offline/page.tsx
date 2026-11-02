// Shown by the service worker (public/sw.js) when there's no signal and the
// page asked for was never opened on this phone before.
export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <h1 className="font-display text-[40px] font-extrabold uppercase leading-none text-ink">You&apos;re offline</h1>
      <p className="mt-3 max-w-xs text-muted">
        This page needs a connection. Sets you log while offline are saved on your phone and sync when you&apos;re back.
      </p>
      <a href="/dashboard" className="btn-accent mt-6 flex w-full max-w-xs items-center justify-center rounded-2xl font-bold">
        Try again
      </a>
    </main>
  )
}

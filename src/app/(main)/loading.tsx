// Shown instantly while the next page loads, so tapping a tab never feels stuck.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-glass-hover" />
      <div className="glass-card space-y-3 p-5">
        <div className="h-4 w-24 animate-pulse rounded-full bg-glass-hover" />
        <div className="h-6 w-2/3 animate-pulse rounded-xl bg-glass-hover" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-glass-hover" />
      </div>
      <div className="glass-card space-y-3 p-5">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-glass-hover" />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-glass-hover" />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-glass-hover" />
      </div>
    </div>
  )
}

// Placeholder for a tab whose page isn't built yet, so every tab works today.
export function ComingSoon({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <div className="glass-card p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Coming soon</p>
        <p className="mt-2 text-sm text-muted">{children}</p>
      </div>
    </div>
  )
}

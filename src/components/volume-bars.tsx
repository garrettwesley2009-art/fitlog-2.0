import type { VolumePoint } from '@/lib/home'

// "2026-10-10" -> "Oct 10". Fixed locale so it reads the same everywhere.
function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

const fmt = (n: number) => n.toLocaleString('en-US')

// One series, one color: total weight lifted in each recent workout.
// Hover, tap or focus a bar to see its date and total.
export function VolumeBars({ points }: { points: VolumePoint[] }) {
  if (points.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        Log a workout and your lifting totals will start showing up here.
      </p>
    )
  }

  const max = Math.max(...points.map((p) => p.volume), 1)
  const latest = points[points.length - 1]
  const previous = points.length > 1 ? points[points.length - 2] : null

  let change: string | null = null
  if (previous && previous.volume > 0) {
    const pct = Math.round(((latest.volume - previous.volume) / previous.volume) * 100)
    change = `${pct >= 0 ? '+' : ''}${pct}% vs the workout before`
  }

  return (
    <div className="mt-3">
      <div className="flex h-24 items-end gap-2 border-b border-line">
        {points.map((p, i) => {
          const isLatest = i === points.length - 1
          const height = Math.max(4, Math.round((p.volume / max) * 100))
          return (
            <div
              key={`${p.date}-${i}`}
              tabIndex={0}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {shortDate(p.date)} - {fmt(p.volume)} lb
              </span>
              <div
                style={{ height: `${height}%` }}
                className={`mx-auto w-full max-w-6 rounded-t-[4px] bg-accent transition-opacity ${
                  isLatest ? 'opacity-100' : 'opacity-60 group-hover:opacity-100 group-focus:opacity-100'
                }`}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] text-muted">
        <span>{shortDate(points[0].date)}</span>
        {points.length > 1 && <span>{shortDate(latest.date)}</span>}
      </div>

      <p className="mt-2 text-xs text-muted">
        Latest <span className="text-ink">{fmt(latest.volume)} lb</span>
        {change ? ` - ${change}` : ''}
      </p>

      {/* The same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>Weight lifted per workout</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Pounds lifted</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={`${p.date}-${i}`}>
              <td>{shortDate(p.date)}</td>
              <td>{fmt(p.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Home cards for features that are not built yet. They show the final layout
// in a dimmed state so the page looks complete, and each one gets switched on
// when its feature ships (badges, goals, profile onboarding).

function SoonTag() {
  return (
    <span className="rounded-full border border-line-strong px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted">
      Coming soon
    </span>
  )
}

export function BadgesPlaceholder() {
  return (
    <div className="rounded-card border border-dashed border-dash p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps">Badges</p>
        <SoonTag />
      </div>
      <div className="mt-4 flex gap-3">
        {['First workout', 'First PR', 'Full week', '3 weeks'].map((name) => (
          <div key={name} className="w-16 text-center text-xs leading-tight text-muted">
            <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-record/60 text-record/70">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
              </svg>
            </div>
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}

export function GoalPlaceholder() {
  return (
    <div className="rounded-card border border-dashed border-dash p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps">Goal</p>
        <SoonTag />
      </div>
      <p className="mt-2 font-display text-xl font-bold text-ink">Set a goal and track it here</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full w-0 rounded-full bg-accent" />
      </div>
      <p className="mt-2 text-xs text-muted">Pick a lift, a body weight or a weekly target.</p>
    </div>
  )
}

export function QuestPlaceholder() {
  return (
    <div className="rounded-card border border-dashed border-dash p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps">Getting started</p>
        <SoonTag />
      </div>
      <p className="mt-2 font-display text-xl font-bold text-ink">Finish your profile</p>
      <p className="mt-1 text-xs text-muted">
        A few quick questions about you and your goals, for sharper coaching.
      </p>
    </div>
  )
}

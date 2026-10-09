// Home cards for features that are not built yet. They show the final layout
// in a dimmed state so the page looks complete, and each one gets switched on
// when its feature ships (badges, goals, profile onboarding).

function SoonTag() {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      Coming soon
    </span>
  )
}

export function BadgesPlaceholder() {
  return (
    <div className="glass-card p-5 opacity-60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Badges</p>
        <SoonTag />
      </div>
      <div className="mt-4 flex gap-3">
        {['First workout', 'First PR', 'Full week', '3 weeks'].map((name) => (
          <div key={name} className="w-16 text-center text-[10px] text-muted">
            <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-glass-hover text-lg">
              &#9733;
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
    <div className="glass-card p-5 opacity-60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Goal</p>
        <SoonTag />
      </div>
      <p className="mt-2 text-base font-semibold text-ink">Set a goal and track it here</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full w-0 rounded-full bg-accent" />
      </div>
      <p className="mt-2 text-xs text-muted">Pick a lift, a body weight or a weekly target.</p>
    </div>
  )
}

export function QuestPlaceholder() {
  return (
    <div className="glass-card p-5 opacity-60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Getting started</p>
        <SoonTag />
      </div>
      <p className="mt-2 text-base font-semibold text-ink">Finish your profile</p>
      <p className="mt-1 text-xs text-muted">
        A few quick questions about you and your goals, for sharper coaching.
      </p>
    </div>
  )
}

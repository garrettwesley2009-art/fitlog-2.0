import { getUserCached } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { getBadges, getSessions, type Badge } from '@/lib/training'

const TONE: Record<Badge['tone'], string> = {
  success: 'bg-success text-on-success',
  record: 'bg-record text-on-record',
  streak: 'bg-streak text-on-record',
  insight: 'bg-insight text-on-record',
}

export default async function BadgesPage() {
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const sessions = await getSessions(supabase, userData.user!.id)
  const badges = getBadges(sessions)
  const earned = badges.filter((b) => b.have >= b.need)
  const next = badges.filter((b) => b.have < b.need).sort((a, b) => b.have / b.need - a.have / a.need)[0]

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">Badges</h1>

      {next ? (
        <section className="card p-4" aria-label="Next badge">
          <div className="flex items-baseline justify-between">
            <p className="label-caps">Next up</p>
            <p className="text-sm text-muted tabular">{next.have} of {next.need}</p>
          </div>
          <p className="mt-1 font-display text-[28px] font-bold uppercase leading-tight text-ink">{next.title}</p>
          <p className="text-sm text-muted">{next.how}</p>
          <div className="mt-3 h-2.5 rounded-full bg-inset" role="presentation">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((next.have / next.need) * 100)}%` }} />
          </div>
        </section>
      ) : (
        <section className="card p-4 text-center">
          <p className="font-display text-2xl font-bold uppercase text-ink">You have them all</p>
          <p className="text-sm text-muted">More badges are coming.</p>
        </section>
      )}

      <p className="text-sm text-muted tabular">{earned.length} of {badges.length} earned</p>

      <ul className="grid grid-cols-3 gap-x-2 gap-y-5">
        {badges.map((b) => {
          const got = b.have >= b.need
          return (
            <li key={b.id} className="flex flex-col items-center text-center">
              <span
                className={`flex h-[68px] w-[68px] items-center justify-center rounded-full font-display text-[26px] font-extrabold ${
                  got ? TONE[b.tone] : 'border-2 border-dashed border-dash bg-inset text-muted'
                }`}
              >
                {b.glyph}
              </span>
              <span className="mt-1.5 text-[13px] font-semibold leading-tight text-ink">{b.title}</span>
              <span className="text-xs text-muted tabular">{got ? 'Earned' : `${b.have} of ${b.need}`}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import Link from 'next/link'
import { getUserCached } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { deleteGoal } from '@/app/actions/goals'
import { bestWeight, fmt, getSessions, weeksInARow } from '@/lib/training'

type Goal = { id: string; kind: 'lift' | 'weekly'; exercise_name: string | null; target: number; start_value: number }

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const user = userData.user!

  const { data, error: dbError } = await supabase
    .from('user_goals')
    .select('id, kind, exercise_name, target, start_value')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  const goals = (data ?? []) as Goal[]
  const sessions = goals.length > 0 ? await getSessions(supabase, user.id) : []

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">Goals</h1>

      {dbError && (
        <p className="card p-3.5 text-sm text-danger">Goals are not set up yet. Run add_user_goals.sql in Supabase first.</p>
      )}
      {error === 'limit' && <p className="card p-3.5 text-sm text-danger">You can keep up to 3 goals. Remove one to add another.</p>}

      {goals.length === 0 && !dbError ? (
        <>
          <section className="card p-5 text-center">
            <p className="font-display text-[30px] font-extrabold uppercase text-ink">No goals yet</p>
            <p className="mt-1 text-sm text-muted">Pick something to work toward and FitLog will track it for you.</p>
            <Link href="/you/goals/new" className="btn-accent mt-4 inline-flex w-full">Set your first goal</Link>
          </section>
          <p className="label-caps">Ideas</p>
          <ul className="space-y-2">
            {[
              ['Lift a target weight', 'lift'],
              ['Train 3 days a week', 'weekly'],
            ].map(([label, kind]) => (
              <li key={kind}>
                <Link href={`/you/goals/new?kind=${kind}`} className="card flex min-h-14 items-center justify-between px-4 text-[15px] text-ink">
                  {label}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted"><path d="M9 5l7 7-7 7" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <ul className="space-y-3">
            {goals.map((g) => {
              const target = Number(g.target)
              let now = 0
              let pct = 0
              let title: string
              let numbers: React.ReactNode
              let status: string
              if (g.kind === 'lift') {
                const start = Number(g.start_value)
                now = bestWeight(sessions, g.exercise_name ?? '')
                pct = target > start ? Math.max(0, Math.min(100, Math.round(((now - start) / (target - start)) * 100))) : now >= target ? 100 : 0
                if (now >= target) pct = 100
                title = `${g.exercise_name} ${fmt(target)} lb`
                numbers = (
                  <div className="mt-2 flex justify-between text-sm text-muted tabular">
                    <span>{fmt(start)}</span>
                    <span className="font-bold text-ink">{fmt(now)} now</span>
                    <span>{fmt(target)}</span>
                  </div>
                )
                status = now >= target ? 'Goal reached' : `${pct}% there, ${fmt(target - now)} lb to go`
              } else {
                now = weeksInARow(sessions, target)
                pct = now > 0 ? 100 : 0
                title = `${fmt(target)} workouts a week`
                numbers = null
                status = now > 0 ? `Reached · ${now} ${now === 1 ? 'week' : 'weeks'} in a row` : 'Not reached yet this week'
              }
              const done = pct >= 100
              return (
                <li key={g.id} className={`card p-4 ${done ? 'border-success' : ''}`}>
                  <h2 className="font-display text-[26px] font-extrabold uppercase leading-tight text-ink">{title}</h2>
                  <div className="mt-3 h-2.5 rounded-full bg-inset" role="presentation">
                    <div className={`h-full rounded-full ${done ? 'bg-success' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {numbers}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-sm text-muted">
                      {done && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-success"><path d="M5 12l5 5 9-10" /></svg>
                      )}
                      {status}
                    </p>
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={g.id} />
                      <button className="min-h-11 px-2 text-sm font-semibold text-muted underline">Remove</button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
          {goals.length < 3 && !dbError && (
            <>
              <Link href="/you/goals/new" className="btn-accent w-full">+ New goal</Link>
              <p className="text-center text-sm text-muted">You can keep up to 3 goals.</p>
            </>
          )}
        </>
      )}
    </div>
  )
}

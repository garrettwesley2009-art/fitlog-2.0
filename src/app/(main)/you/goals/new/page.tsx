import Link from 'next/link'
import { getUserCached } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { createGoal } from '@/app/actions/goals'
import { getSessions, trainedLifts } from '@/lib/training'

const ERRORS: Record<string, string> = {
  target: 'Enter a number above zero (up to 2000 lb, or up to 7 days).',
  exercise: 'Pick a lift.',
  save: 'Could not save. Run add_user_goals.sql in Supabase, then try again.',
}

export default async function NewGoalPage({ searchParams }: { searchParams: Promise<{ kind?: string; error?: string }> }) {
  const { kind, error } = await searchParams
  const weekly = kind === 'weekly'
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const lifts = trainedLifts(await getSessions(supabase, userData.user!.id))

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[34px] font-extrabold uppercase text-ink">New goal</h1>

      <div className="flex gap-2" role="tablist" aria-label="Goal type">
        <Link href="/you/goals/new?kind=lift" role="tab" aria-selected={!weekly} className={`flex min-h-11 flex-1 items-center justify-center rounded-full border text-[15px] font-semibold ${!weekly ? 'border-accent bg-accent text-white' : 'border-line-strong text-ink'}`}>Lift a weight</Link>
        <Link href="/you/goals/new?kind=weekly" role="tab" aria-selected={weekly} className={`flex min-h-11 flex-1 items-center justify-center rounded-full border text-[15px] font-semibold ${weekly ? 'border-accent bg-accent text-white' : 'border-line-strong text-ink'}`}>Days a week</Link>
      </div>

      {error && <p className="card p-3.5 text-sm text-danger" role="alert">{ERRORS[error] ?? 'Something went wrong.'}</p>}

      <form action={createGoal} className="card space-y-4 p-4">
        <input type="hidden" name="kind" value={weekly ? 'weekly' : 'lift'} />
        {!weekly && (
          <div>
            <label htmlFor="exercise" className="label-caps">Lift</label>
            {lifts.length > 0 ? (
              <select id="exercise" name="exercise" className="input-field mt-1.5 w-full" defaultValue={lifts[0].name}>
                {lifts.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
              </select>
            ) : (
              <input id="exercise" name="exercise" className="input-field mt-1.5 w-full" placeholder="For example Back Squat" />
            )}
          </div>
        )}
        <div>
          <label htmlFor="target" className="label-caps">{weekly ? 'Workouts per week' : 'Target weight (lb)'}</label>
          <input id="target" name="target" type="number" inputMode={weekly ? 'numeric' : 'decimal'} min="1" max={weekly ? 7 : 2000} step={weekly ? 1 : 'any'} required defaultValue={weekly ? 3 : undefined} className="input-field mt-1.5 w-full" />
        </div>
        <button className="btn-accent w-full">Save goal</button>
      </form>

      <Link href="/you/goals" className="btn-ghost w-full">Cancel</Link>
    </div>
  )
}

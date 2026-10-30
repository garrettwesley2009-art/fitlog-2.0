import { getUserCached } from '@/lib/supabase/get-user'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: userData } = await getUserCached()
  const user = userData.user!

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, date, user_program_days(day_label), sets(id, weight, reps, rpe, set_index, exercises(name))')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[34px] font-extrabold text-ink">History</h1>
        <p className="mt-1 text-sm text-muted">Every workout you have logged, newest first.</p>
      </div>

      {workouts && workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((w) => {
            const byExercise = new Map<string, { weight: number | null; reps: number | null; rpe: number | null; set_index: number }[]>()
            let volume = 0
            for (const s of w.sets ?? []) {
              const name = (s as unknown as { exercises: { name: string } | null }).exercises?.name ?? 'Unknown'
              const list = byExercise.get(name) ?? []
              list.push({ weight: s.weight, reps: s.reps, rpe: s.rpe, set_index: s.set_index })
              byExercise.set(name, list)
              volume += (Number(s.weight) || 0) * (s.reps ?? 0)
            }
            const label = (w as unknown as { user_program_days: { day_label: string } | null }).user_program_days?.day_label ?? 'Workout'
            const d = new Date(`${w.date}T12:00:00Z`)
            const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
            const day = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })

            return (
              <section key={w.id} className="card p-3.5">
                <div className="flex items-center gap-3.5">
                  <span className="w-[52px] flex-none rounded-xl bg-inset py-1.5 text-center" aria-label={w.date}>
                    <span className="block text-xs font-semibold text-accent-text">{month}</span>
                    <span className="block font-display text-[26px] font-extrabold leading-none">{day}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-bold leading-tight text-ink">{label}</h2>
                    <p className="text-sm text-muted tabular">
                      {(w.sets ?? []).length} sets · {Math.round(volume).toLocaleString('en-US')} lb
                    </p>
                  </div>
                </div>
                {byExercise.size > 0 && (
                  <ul className="mt-3">
                    {[...byExercise.entries()].map(([name, sets]) => (
                      <li key={name} className="flex gap-3 border-t border-line py-2 text-[15px]">
                        <span className="min-w-0 flex-1 text-ink">{name}</span>
                        <span className="text-right text-muted tabular">
                          {sets
                            .sort((a, b) => a.set_index - b.set_index)
                            .map((s) => `${s.weight ?? '—'}×${s.reps ?? '—'}`)
                            .join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-dash p-5 text-center">
          <p className="font-semibold text-ink">No workouts yet. Your first one will show up here.</p>
          <Link href="/log" className="btn-ghost mt-3 inline-flex">Start a workout</Link>
        </div>
      )}
    </div>
  )
}

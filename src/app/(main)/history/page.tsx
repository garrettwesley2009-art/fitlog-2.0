import { createClient } from '@/lib/supabase/server'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, date, sets(id, weight, reps, rpe, set_index, exercises(name))')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">History</h1>
        <p className="mt-1 text-sm text-muted">Your full log, pulled straight from the cloud.</p>
      </div>

      {workouts && workouts.length > 0 ? (
        <div className="space-y-4">
          {workouts.map((w) => {
            const byExercise = new Map<string, { weight: number | null; reps: number | null; rpe: number | null; set_index: number }[]>()
            for (const s of w.sets ?? []) {
              const name = (s as unknown as { exercises: { name: string } | null }).exercises?.name ?? 'Unknown'
              const list = byExercise.get(name) ?? []
              list.push({ weight: s.weight, reps: s.reps, rpe: s.rpe, set_index: s.set_index })
              byExercise.set(name, list)
            }

            return (
              <div key={w.id} className="glass-card p-4">
                <p className="font-medium text-ink">{w.date}</p>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  {[...byExercise.entries()].map(([name, sets]) => (
                    <p key={name}>
                      <span className="font-medium text-ink">{name}:</span>{' '}
                      {sets
                        .sort((a, b) => a.set_index - b.set_index)
                        .map((s) => `${s.weight ?? '—'}x${s.reps ?? '—'}`)
                        .join(', ')}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">Nothing logged yet.</p>
      )}
    </div>
  )
}
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram } from '@/lib/data'
import { WorkoutLogger } from '@/components/workout-logger'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Log a workout</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {program ? `Following: ${program.name}` : 'No program set -- logging freeform.'}{' '}
          {!program && (
            <Link href="/templates" className="underline">
              pick a template
            </Link>
          )}
        </p>
      </div>

      <WorkoutLogger
        days={
          program?.days.map((d) => ({
            id: d.id,
            day_label: d.day_label,
            exercises: d.exercises.map((e) => ({
              exercise_name: e.exercise_name,
              target_sets: e.target_sets,
              target_reps: e.target_reps,
            })),
          })) ?? []
        }
      />
    </div>
  )
}

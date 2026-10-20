import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProgram } from '@/lib/data'
import { ProgramBuilder } from '@/components/program-builder'
import { BackButton } from '@/components/back-button'

// Edit the program you are on right now, in place. Your progress and logged
// workouts stay attached to your days.
export default async function EditCurrentProgramPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user!

  const program = await getCurrentProgram(supabase, user.id)
  if (!program) redirect('/programs/new')

  const draft = {
    name: program.name,
    total_weeks: program.total_weeks,
    days: program.days.map((d, i) => ({
      id: d.id,
      day_label: d.day_label,
      order_index: i,
      exercises: d.exercises.map((e, j) => ({
        id: e.id,
        exercise_name: e.exercise_name,
        order_index: j,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        notes: e.notes,
      })),
    })),
  }

  return (
    <div className="space-y-6">
      <BackButton href="/workout/program" label="My Program" />
      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit your program</h1>
        <p className="mt-1 text-sm text-muted">
          Change exercises, sets, reps, notes, day names or the length. Your progress is kept. Days you have
          already trained can&apos;t be removed, and a day you add shows up in the weeks still ahead.
        </p>
      </div>
      <ProgramBuilder initial={draft} programId={program.id} />
    </div>
  )
}

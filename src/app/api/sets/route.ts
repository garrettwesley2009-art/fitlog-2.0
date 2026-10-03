import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateExercise } from '@/lib/data'

type SetPayload = {
  workoutId: string
  exerciseName: string
  setIndex: number
  weight: number | null
  reps: number | null
  rpe: number | null
  notes: string | null
}

// Saves one logged set immediately -- this is the "constant log" that
// persists to the cloud as the user trains, not a batch save at the end.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const body = (await request.json()) as SetPayload

  if (!body.workoutId || !body.exerciseName) {
    return NextResponse.json({ error: 'workoutId and exerciseName are required' }, { status: 400 })
  }

  try {
    const exerciseId = await getOrCreateExercise(supabase, user.id, body.exerciseName)

    const { data: created, error } = await supabase
      .from('sets')
      .insert({
        workout_id: body.workoutId,
        exercise_id: exerciseId,
        set_index: body.setIndex,
        weight: body.weight,
        reps: body.reps,
        rpe: body.rpe,
        notes: body.notes,
      })
      .select('id, created_at')
      .single()

    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? 'Failed to save set' }, { status: 500 })
    }

    return NextResponse.json({ id: created.id, savedAt: created.created_at })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save set' },
      { status: 500 }
    )
  }
}

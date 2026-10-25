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

// Saves one logged set. Sending the same set again REPLACES it (same workout, exercise and set
// number) instead of adding a second copy, so a retry after a bad connection can never double up.
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

    // Only touches this person's own workout (row level security enforces it too).
    const { data: workout } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', body.workoutId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    await supabase
      .from('sets')
      .delete()
      .eq('workout_id', body.workoutId)
      .eq('exercise_id', exerciseId)
      .eq('set_index', body.setIndex)

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

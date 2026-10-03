import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Finds today's workout for a given program day, or creates one.
// Called when someone opens the logger -- a set can be saved to the cloud
// the moment it's entered, with no "save" button at the end of the session.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { programDayId } = (await request.json()) as { programDayId: string | null }
  const today = new Date().toISOString().slice(0, 10)

  const existingQuery = supabase
    .from('workouts')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)

  const { data: existing } = programDayId
    ? await existingQuery.eq('user_program_day_id', programDayId).maybeSingle()
    : await existingQuery.is('user_program_day_id', null).maybeSingle()

  if (existing) {
    return NextResponse.json({ workoutId: existing.id })
  }

  const { data: created, error } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, user_program_day_id: programDayId, date: today })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Failed to start workout' }, { status: 500 })
  }

  return NextResponse.json({ workoutId: created.id })
}

// Returns the sets already logged today for a workout, so re-opening the
// logger mid-session shows what's already saved.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const workoutId = new URL(request.url).searchParams.get('workoutId')
  if (!workoutId) {
    return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
  }

  const { data: sets } = await supabase
    .from('sets')
    .select('id, exercise_id, set_index, weight, reps, rpe, notes, exercises(name)')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ sets: sets ?? [] })
}

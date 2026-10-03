import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertProgramFromDraft } from '@/lib/data'
import type { ProgramDraft } from '@/lib/types'

// Creates a manually-built program for the signed-in user.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const draft = (await request.json()) as ProgramDraft

  if (!draft?.name || !Array.isArray(draft.days) || draft.days.length === 0) {
    return NextResponse.json({ error: 'A program needs a name and at least one day.' }, { status: 400 })
  }

  try {
    const programId = await insertProgramFromDraft(supabase, user.id, draft, 'manual')
    return NextResponse.json({ programId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create program' },
      { status: 500 }
    )
  }
}

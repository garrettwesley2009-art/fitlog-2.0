import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertProgramFromDraft } from '@/lib/data'
import type { ProgramDraft } from '@/lib/types'

// Applies a program draft the AI assistant proposed. Deliberately a separate,
// explicit step from the chat reply itself -- the assistant never silently
// changes a user's program; this route only runs when the user clicks "Apply."
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const draft = (await request.json()) as ProgramDraft

  if (!draft?.name || !Array.isArray(draft.days) || draft.days.length === 0) {
    return NextResponse.json({ error: 'That suggestion is missing a name or days.' }, { status: 400 })
  }

  try {
    const programId = await insertProgramFromDraft(supabase, user.id, draft, 'ai_customized')
    return NextResponse.json({ programId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to apply program' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProgramFromDraft, type EditDraft } from '@/lib/program-edit'

// Saves edits to one of the signed-in user's own programs, in place.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const draft = (await request.json()) as EditDraft

  try {
    const result = await updateProgramFromDraft(supabase, user.id, id, draft)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save changes' },
      { status: 500 }
    )
  }

  revalidatePath('/dashboard')
  revalidatePath('/log')
  revalidatePath('/workout/program')
  return NextResponse.json({ ok: true })
}

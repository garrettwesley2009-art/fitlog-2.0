import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Every exercise name the Build page can offer in its picker.
export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('exercises')
    .select('name')
    .order('name', { ascending: true })
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const names = Array.from(new Set((data ?? []).map((e) => (e.name as string).trim()).filter(Boolean)))
  return NextResponse.json({ names })
}

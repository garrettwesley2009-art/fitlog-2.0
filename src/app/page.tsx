import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  redirect(data.user ? '/dashboard' : '/login')
}

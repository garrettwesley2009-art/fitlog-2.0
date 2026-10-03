import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client -- use inside Client Components.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

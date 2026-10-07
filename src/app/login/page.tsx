import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth-shell'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <AuthShell title="Log in" subtitle="Welcome back.">
      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form action={login} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted">Email</label>
          <input name="email" type="email" required className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted">Password</label>
          <input name="password" type="password" required className="input-field mt-1" />
        </div>
        <button type="submit" className="btn-accent w-full">
          Log in
        </button>
      </form>

      <p className="text-sm text-muted">
        No account?{' '}
        <Link href="/signup" className="font-medium text-ink underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  )
}
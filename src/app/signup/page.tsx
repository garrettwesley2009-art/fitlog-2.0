import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth-shell'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <AuthShell title="Create your account" subtitle="One account, just for you.">
      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form action={signup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted">Display name</label>
          <input name="displayName" type="text" required className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted">Email</label>
          <input name="email" type="email" required className="input-field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="input-field mt-1"
          />
        </div>
        <button type="submit" className="btn-accent w-full">
          Sign up
        </button>
      </form>

      <p className="text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-ink underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  )
}

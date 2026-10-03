import Link from 'next/link'
import { login } from '@/app/actions/auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Log in</h1>
          <p className="mt-1 text-sm text-neutral-500">Welcome back.</p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Password</label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Log in
          </button>
        </form>

        <p className="text-sm text-neutral-500">
          No account?{' '}
          <Link href="/signup" className="font-medium text-neutral-900 underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

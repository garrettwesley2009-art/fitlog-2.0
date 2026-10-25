import Link from 'next/link'
import { resendConfirmation } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth-shell'

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string; error?: string; unconfirmed?: string }>
}) {
  const { email, sent, error, unconfirmed } = await searchParams

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        unconfirmed
          ? 'You need to confirm your email before you can log in.'
          : 'One quick step to finish your account.'
      }
    >
      <p className="text-sm text-ink">
        We sent a confirmation link to{' '}
        <b className="break-all">{email || 'your email'}</b>. Open it on this phone, then come back and log in.
      </p>

      {sent && (
        <p className="rounded-xl border border-line bg-glass px-3 py-2 text-sm text-ink">
          Sent again. It can take a minute or two to show up.
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <ul className="space-y-1 text-xs text-muted">
        <li>Look in your spam or promotions folder.</li>
        <li>Make sure the email above is spelled right.</li>
      </ul>

      {email && (
        <form action={resendConfirmation}>
          <input type="hidden" name="email" value={email} />
          <button type="submit" className="btn-ghost w-full">
            Send the email again
          </button>
        </form>
      )}

      <p className="text-sm text-muted">
        Already confirmed?{' '}
        <Link href="/login" className="font-medium text-ink underline">
          Log in
        </Link>
        {' '}&middot;{' '}
        <Link href="/signup" className="font-medium text-ink underline">
          Wrong email? Start over
        </Link>
      </p>
    </AuthShell>
  )
}

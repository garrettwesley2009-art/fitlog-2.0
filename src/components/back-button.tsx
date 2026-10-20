import Link from 'next/link'

// Small "back" link for the top left of any page that opens from another page
// (a template, an edit screen). It goes to a fixed parent page, so it always
// lands somewhere sensible no matter how the person arrived.
export function BackButton({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.5 4.5 7.5 10l5 5.5" />
      </svg>
      {label}
    </Link>
  )
}

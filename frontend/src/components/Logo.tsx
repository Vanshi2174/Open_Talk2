import { Link } from 'react-router-dom'

type LogoProps = {
  to?: string
}

export function Logo({ to = '/' }: LogoProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2.5 rounded-lg text-ink no-underline"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M6 9.2C6 7.4 7.8 6 10 6h4c2.2 0 4 1.4 4 3.2v3.1c0 1.8-1.8 3.2-4 3.2h-.8L10.4 18c-.4.35-1 .08-1-.42V15.5C7.6 15.5 6 14.1 6 12.3V9.2Z"
            fill="#6B9EFF"
          />
        </svg>
      </span>
      <span className="font-serif text-xl tracking-tight">Open Talk</span>
    </Link>
  )
}

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed shadow-sm',
  secondary: 'bg-soft text-ink hover:bg-[#dceeff] border border-transparent',
  ghost: 'bg-transparent text-ink hover:bg-soft',
  outline:
    'bg-surface text-ink border border-line hover:border-primary hover:text-primary',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
} as const

const sizes = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[0.95rem]',
} as const

type Variant = keyof typeof variants
type Size = keyof typeof sizes

type SharedProps = {
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
}

type ButtonAsButton = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { to?: undefined }

type ButtonAsLink = SharedProps & { to: string }

function classNames(variant: Variant, size: Size, className: string) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export function Button(props: ButtonAsButton | ButtonAsLink) {
  if ('to' in props && props.to) {
    const { to, children, variant = 'primary', size = 'md', className = '' } = props
    return (
      <Link to={to} className={classNames(variant, size, className)}>
        {children}
      </Link>
    )
  }

  const {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    ...rest
  } = props as ButtonAsButton

  return (
    <button type={type} className={classNames(variant, size, className)} {...rest}>
      {children}
    </button>
  )
}

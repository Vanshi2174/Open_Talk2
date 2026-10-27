import type { InputHTMLAttributes, ReactNode } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  trailing?: ReactNode
}

export function TextField({
  id,
  label,
  hint,
  error,
  trailing,
  className = '',
  ...inputProps
}: TextFieldProps) {
  const fieldId = id ?? inputProps.name
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span className="relative block">
        <input
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[
            'h-12 w-full rounded-xl border bg-surface px-4 text-[0.95rem] text-ink placeholder:text-muted/80 transition-colors duration-150',
            error
              ? 'border-danger focus:border-danger'
              : 'border-line focus:border-primary',
            trailing ? 'pr-11' : '',
            className,
          ].join(' ')}
          {...inputProps}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>
        ) : null}
      </span>
      {error ? (
        <span id={`${fieldId}-error`} role="alert" className="mt-1.5 block text-sm text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${fieldId}-hint`} className="mt-1.5 block text-sm text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  )
}

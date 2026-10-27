import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: 'div' | 'article' | 'section'
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
  ...rest
}: CardProps) {
  return (
    <Tag
      className={[
        'rounded-[1.25rem] border border-line bg-surface shadow-[0_8px_24px_-16px_rgb(36_59_90_/_0.18)]',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
}

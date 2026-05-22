import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: 'teal' | 'green' | 'amber' | 'coral' | 'violet' | 'slate'
  hover?: boolean
}

const accentBar: Record<NonNullable<CardProps['accent']>, string> = {
  teal: 'border-l-pk-primary',
  green: 'border-l-emerald-500',
  amber: 'border-l-pk-sun',
  coral: 'border-l-pk-accent',
  violet: 'border-l-violet-500',
  slate: 'border-l-pk-border',
}

export function Card({ className, accent, hover, children, ...props }: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-2xl border border-pk-border bg-pk-surface shadow-card',
        accent && ['border-l-4', accentBar[accent]],
        hover && 'transition-shadow duration-200 hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('border-b border-pk-border px-5 py-4', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h3 className={cn('text-lg font-bold tracking-tight text-pk-ink', className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return <p className={cn('text-sm text-pk-sub', className)} {...props} />
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('p-5', className)} {...props} />
}

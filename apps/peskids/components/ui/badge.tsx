import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'teal' | 'green' | 'amber' | 'coral' | 'violet'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-pk-muted text-pk-sub',
  teal: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200/80',
  green: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
  amber: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80',
  coral: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/80',
  violet: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200/80',
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}

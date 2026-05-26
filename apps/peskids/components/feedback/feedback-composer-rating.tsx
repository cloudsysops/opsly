'use client'

import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FeedbackComposerRatingProps {
  value: number
  onChange: (value: number) => void
}

function getRatingLabel(rating: number): string {
  if (rating >= 5) return 'Excelente'
  if (rating === 4) return 'Muy bien'
  if (rating === 3) return 'Bien'
  if (rating === 2) return 'Necesita ajustes'
  return 'Requiere atención'
}

export function FeedbackComposerRating({ value, onChange }: FeedbackComposerRatingProps): React.ReactElement {
  const ratingLabel = getRatingLabel(value)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-pk-ink">Valoración</label>
        <Badge tone={value >= 4 ? 'green' : value === 3 ? 'amber' : 'coral'}>{ratingLabel}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => index + 1).map((num) => {
          const active = value === num
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition',
                active
                  ? 'border-pk-primary bg-pk-primary text-white shadow-sm'
                  : 'border-pk-border bg-white text-pk-sub hover:border-pk-primary/40 hover:text-pk-ink'
              )}
              aria-label={`Valoración ${num} de 5`}
            >
              <Star className={cn('h-4 w-4', active && 'fill-current')} aria-hidden />
            </button>
          )
        })}
      </div>
    </div>
  )
}

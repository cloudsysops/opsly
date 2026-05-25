'use client'

import {
  Compass,
  Flame,
  Sparkles,
  Target,
  Trophy,
  BadgeCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type GrowthWidgetProps = {
  eyebrow: string
  title: string
  description: string
  mission: string
  vision: string
  objectives: string[]
  achievements: string[]
  streakLabel: string
  streakValue: string
  progressLabel: string
  progressPercent: number
  accent?: 'teal' | 'amber' | 'violet' | 'coral'
  className?: string
}

const accentStyles: Record<
  NonNullable<GrowthWidgetProps['accent']>,
  { badge: 'teal' | 'amber' | 'violet' | 'coral'; ring: string; bar: string }
> = {
  teal: { badge: 'teal', ring: 'ring-teal-200/70', bar: 'from-pk-primary to-[#72D8E4]' },
  amber: { badge: 'amber', ring: 'ring-amber-200/70', bar: 'from-pk-sun to-[#FFD85C]' },
  violet: { badge: 'violet', ring: 'ring-violet-200/70', bar: 'from-violet-500 to-violet-300' },
  coral: { badge: 'coral', ring: 'ring-rose-200/70', bar: 'from-pk-accent to-[#FF9E8C]' },
}

export function GrowthWidget({
  eyebrow,
  title,
  description,
  mission,
  vision,
  objectives,
  achievements,
  streakLabel,
  streakValue,
  progressLabel,
  progressPercent,
  accent = 'teal',
  className,
}: GrowthWidgetProps): React.ReactElement {
  const accentStyle = accentStyles[accent]
  const normalizedProgress = Math.max(0, Math.min(100, progressPercent))

  return (
    <Card className={cn('overflow-hidden border-pk-border bg-white shadow-card', className)}>
      <CardHeader className="border-b border-pk-border bg-pk-snow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pk-mutedText">
              {eyebrow}
            </p>
            <CardTitle className="mt-1 text-lg">{title}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">{description}</CardDescription>
          </div>
          <Badge tone={accentStyle.badge}>XP {streakValue}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-pk-primary" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">
                Misión
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-pk-ink">{mission}</p>
          </div>

          <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-pk-primary" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">
                Visión
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-pk-ink">{vision}</p>
          </div>

          <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-pk-primary" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">
                Constancia
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-pk-ink">{streakLabel}</p>
            <div className="mt-3 h-2 rounded-full bg-pk-muted">
              <div
                className={cn('h-2 rounded-full bg-gradient-to-r', accentStyle.bar)}
                style={{ width: `${normalizedProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-pk-mutedText">{progressLabel}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-pk-border bg-pk-muted/25 p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-pk-primary" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">
                Objetivos
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {objectives.map((objective) => (
                <Badge key={objective} tone={accentStyle.badge}>
                  {objective}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-pk-border bg-pk-muted/25 p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-pk-primary" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">
                Logros
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {achievements.map((achievement) => (
                <span
                  key={achievement}
                  className="inline-flex items-center gap-1 rounded-full border border-pk-border bg-white px-3 py-1 text-xs font-semibold text-pk-ink"
                >
                  <Sparkles className="h-3.5 w-3.5 text-pk-primary" aria-hidden />
                  {achievement}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

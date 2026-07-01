'use client'

import { useMemo, useState } from 'react'
import { BadgeCheck, ChevronRight, Sparkles } from 'lucide-react'
import { SWIM_LEVELS } from '@/lib/brand'
import { cn } from '@/lib/utils'

type MascotOption = {
  id: string
  name: string
  emoji: string
  subtitle: string
  tone: 'teal' | 'amber' | 'violet' | 'coral' | 'green'
}

const mascotOptions: MascotOption[] = [
  { id: 'bubble', name: 'Burbuja', emoji: '💧', subtitle: 'Primer contacto', tone: 'teal' },
  { id: 'fish', name: 'Peces', emoji: '🐠', subtitle: 'Flota y juega', tone: 'green' },
  { id: 'dolphin', name: 'Delfín', emoji: '🐬', subtitle: 'Coordina y avanza', tone: 'amber' },
  { id: 'shark', name: 'Tiburón', emoji: '🦈', subtitle: 'Fuerza y control', tone: 'violet' },
  { id: 'trophy', name: 'Campeón', emoji: '🏆', subtitle: 'Meta superada', tone: 'coral' },
]

const toneStyles: Record<MascotOption['tone'], string> = {
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  coral: 'border-rose-200 bg-rose-50 text-rose-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export function MascotPathWidget({
  title = 'Elige tu mascota',
  description = 'Tu peque puede escoger su avatar y verlo crecer con cada etapa.',
  className,
}: {
  title?: string
  description?: string
  className?: string
}): React.ReactElement {
  const [selectedMascotId, setSelectedMascotId] = useState(mascotOptions[1]?.id ?? mascotOptions[0].id)

  const selectedMascot = useMemo(
    () => mascotOptions.find((option) => option.id === selectedMascotId) ?? mascotOptions[0],
    [selectedMascotId]
  )

  const currentLevel = useMemo(() => {
    const index = mascotOptions.findIndex((option) => option.id === selectedMascot.id)
    return Math.min(SWIM_LEVELS.length, Math.max(1, index + 2))
  }, [selectedMascot.id])

  return (
    <section className={cn('overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-card', className)}>
      <div className="border-b border-pk-border bg-pk-snow px-5 py-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pk-mutedText">
          Mascota y avatar
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-pk-ink">{title}</h3>
            <p className="mt-1 text-sm text-pk-sub">{description}</p>
          </div>
          <div className="rounded-full bg-pk-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-pk-primary">
            Etapa {currentLevel}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[1.75rem] border border-pk-border bg-pk-deep p-5 text-white">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
            Avatar activo
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/10 text-5xl shadow-inner">
              {selectedMascot.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight">{selectedMascot.name}</p>
              <p className="mt-1 text-sm text-white/75">{selectedMascot.subtitle}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-pk-sun" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                Crecimiento por etapas
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {SWIM_LEVELS.map((level) => {
                const active = level.n <= currentLevel
                const reached = level.n === currentLevel
                return (
                  <div
                    key={level.n}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3 py-2',
                      active ? 'border-white/15 bg-white/10' : 'border-white/10 bg-white/5'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl text-lg',
                        active ? 'bg-white/15' : 'bg-white/10'
                      )}
                    >
                      {level.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{level.name}</p>
                      <p className="text-[11px] text-white/70">{level.desc}</p>
                    </div>
                    {reached ? (
                      <span className="rounded-full bg-pk-sun px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pk-ink">
                        Hoy
                      </span>
                    ) : active ? (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                        En camino
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-pk-border bg-pk-snow p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pk-mutedText">
                  Selección
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">Toca un avatar para elegirlo</p>
              </div>
              <Sparkles className="h-5 w-5 text-pk-primary" aria-hidden />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {mascotOptions.map((option) => {
                const active = option.id === selectedMascotId
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedMascotId(option.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                      active
                        ? `${toneStyles[option.tone]} ring-2 ring-pk-primary/30`
                        : 'border-pk-border bg-white hover:border-pk-primary/30 hover:bg-pk-bg'
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                      {option.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-pk-ink">{option.name}</p>
                      <p className="text-xs text-pk-mutedText">{option.subtitle}</p>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 shrink-0', active ? 'text-pk-primary' : 'text-pk-mutedText')} aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-pk-border bg-white p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pk-mutedText">
              Cómo crece
            </p>
            <p className="mt-1 text-sm text-pk-sub">
              El avatar cambia de forma con el avance del niño: primero aprende, luego flota,
              después coordina y finalmente domina la etapa.
            </p>

            <div className="mt-4 grid grid-cols-6 gap-2">
              {SWIM_LEVELS.map((level) => {
                const active = level.n <= currentLevel
                return (
                  <div
                    key={level.n}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-2xl border text-xl',
                      active ? 'border-pk-primary bg-pk-primary/10' : 'border-pk-border bg-pk-snow'
                    )}
                  >
                    {level.emoji}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

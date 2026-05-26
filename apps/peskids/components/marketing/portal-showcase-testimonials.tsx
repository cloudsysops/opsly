import { Bell } from 'lucide-react'
import { StarBurst } from '@/components/brand/peskids-logo'
import { GrowthWidget } from '@/components/progress/growth-widget'
import { peskidsColorTokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

const parentActions = [
  { icon: null, label: 'Reservar' },
  { icon: null, label: 'Pagar' },
  { icon: null, label: 'Mensaje' },
  { icon: null, label: 'Progreso' },
]

const week = [
  { day: 'Lun', date: 18, has: false },
  { day: 'Mar', date: 19, has: true, attended: true },
  { day: 'Mié', date: 20, has: false },
  { day: 'Jue', date: 21, has: true, today: true },
  { day: 'Vie', date: 22, has: false },
  { day: 'Sáb', date: 23, has: true },
  { day: 'Dom', date: 24, has: false },
]

function HomePreview(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-hero">
      <div className="bg-pk-surface/80 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-pk-mutedText">Hola</p>
            <h3 className="text-xl font-bold tracking-tight text-pk-ink">Camila</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pk-bg text-lg">
            <Bell className="h-4 w-4 text-pk-ink" aria-hidden />
          </div>
        </div>
      </div>

      <div className="p-5">
        <div
          className="rounded-[1.75rem] p-5 text-white shadow-card-hover"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.primary.teal}, ${peskidsColorTokens.secondary.lightTeal})`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
                Próxima clase
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight">3:30 pm</p>
              <p className="mt-2 text-sm text-white/90">Hoy · 2 h 14 min</p>
            </div>
            <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Confirmada
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-white/20 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-pk-ink">
              SR
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Santiago R.</p>
              <p className="text-xs text-white/85">Llanogrande · Piscina 1</p>
            </div>
            <div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-pk-ink">
              Detalles
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {parentActions.map(({ label }) => (
            <div key={label} className="rounded-2xl border border-pk-border bg-pk-surface py-3 text-center">
              <p className="mt-2 text-[11px] font-semibold text-pk-ink">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
                  Mateo · 5 años
                </p>
                <h4 className="mt-1 text-lg font-bold tracking-tight text-pk-ink">Delfines</h4>
              </div>
              <div className="font-mono text-[11px] font-bold text-pk-ink">62%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-pk-border">
              <div
                className="h-2 w-[62%] rounded-full"
                style={{
                  backgroundImage: `linear-gradient(to right, ${peskidsColorTokens.primary.teal}, ${peskidsColorTokens.secondary.lightTeal})`,
                }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-pk-sub">
              Próximo logro · <span className="font-semibold text-pk-ink">Clavado de salida</span>
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
                  Esta semana
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">Registro de asistencia</p>
              </div>
              <div className="rounded-full border border-pk-border bg-pk-bg px-2 py-1 text-[10px] font-bold text-pk-mutedText">
                3 clases
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {week.map((day) => (
                <div
                  key={day.day}
                  className={cn(
                    'flex-1 rounded-2xl border px-0 py-2 text-center',
                    day.today ? 'border-pk-deep bg-pk-deep text-white' : 'border-pk-border bg-white'
                  )}
                >
                  <p
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-[0.08em]',
                      day.today ? 'text-white/70' : 'text-pk-mutedText'
                    )}
                  >
                    {day.day}
                  </p>
                  <p className={cn('mt-1 text-[14px] font-bold', day.today ? 'text-white' : 'text-pk-ink')}>
                    {day.date}
                  </p>
                  <div
                    className={cn(
                      'mx-auto mt-1 h-1.5 w-1.5 rounded-full',
                      day.has
                        ? day.attended
                          ? 'bg-emerald-500'
                          : day.today
                            ? 'bg-pk-sun'
                            : 'bg-pk-primary'
                        : 'bg-transparent'
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PortalShowcaseTestimonials(): React.ReactElement {
  return (
    <div className="relative">
      <div className="relative">
        <HomePreview />
        <div className="absolute -right-3 top-6">
          <StarBurst size={26} />
        </div>
        <div className="absolute -left-4 bottom-8 max-w-[250px] rounded-[1.25rem] border border-pk-border bg-pk-surface p-4 shadow-card-hover">
          <div className="flex gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{
                backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.secondary.lightYellow}, #FFC20E)`,
              }}
            >
              🦈
            </span>
            <div>
              <p className="text-sm font-medium leading-snug text-pk-ink">
                &quot;Mateo pasó del miedo al agua a un clavado de salida en 6 meses.&quot;
              </p>
              <p className="mt-1 text-xs text-pk-mutedText">— Camila, mamá de Mateo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <GrowthWidget
          eyebrow="Metas y logros"
          title="Progreso que se entiende de un vistazo"
          description="Cada familia ve qué se logró, qué sigue y qué necesita constancia para avanzar sin perder tiempo."
          mission="Acompañar al niño con claridad, constancia y señales simples para que toda la familia vea el avance."
          vision="Un peque autónomo en el agua y una familia que entiende el camino sin fricción."
          objectives={['Asistencia', 'Confianza', 'Técnica']}
          achievements={['Primera clase completada', 'Burbujas', 'Flotación dorsal']}
          streakLabel="Racha familiar"
          streakValue="8"
          progressLabel="Progreso hacia el siguiente nivel"
          progressPercent={62}
          accent="amber"
        />
      </div>
    </div>
  )
}

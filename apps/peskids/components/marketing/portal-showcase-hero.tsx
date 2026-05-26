import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function MetricCard({
  value,
  label,
  compact,
}: {
  value: string
  label: string
  compact?: boolean
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-pk-surface p-4 shadow-card">
      <p
        className={cn(
          'font-bold tracking-tight text-pk-ink',
          compact ? 'text-sm' : 'text-2xl'
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-pk-mutedText">{label}</p>
    </div>
  )
}

export function PortalShowcaseHero(): React.ReactElement {
  return (
    <div className="relative z-10">
      <p className="pk-eyebrow">Portal de familias</p>
      <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-tight text-pk-ink sm:text-5xl lg:text-[4.5rem]">
        Todo lo importante de Peskids, en un solo lugar.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-pk-sub">
        Reservas, progreso, mensajes y pagos para familias y staff.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/#contacto"
          className={cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md shadow-pk-primary/30 transition-all duration-150 hover:bg-pk-primary-dark active:scale-[0.99]'
          )}
        >
          Reservar clase
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/familias/login"
          className={cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-pk-primary/20 bg-white px-6 text-sm font-bold text-pk-ink transition-all duration-150 hover:border-pk-primary/40 hover:bg-pk-snow'
          )}
        >
          Acceso familias
        </Link>
        <Link
          href="/admin"
          className={cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-pk-border bg-pk-surface px-6 text-sm font-bold text-pk-ink transition-all duration-150 hover:border-pk-primary/40 hover:bg-pk-snow'
          )}
        >
          Ver panel admin
        </Link>
      </div>

      <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
        <MetricCard value="1" label="portal" />
        <MetricCard value="5" label="flujos" />
        <MetricCard value="Tiempo real" label="mensajes" compact />
      </div>
    </div>
  )
}

import Link from 'next/link'
import { PeskidsBrush, StarBurst, WiggleLine } from '@/components/brand/peskids-logo'
import { LeadCaptureForm } from '@/components/forms/lead-capture-form'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { peskidsColorTokens } from '@/lib/tokens'

const stats = [
  { num: '14', label: 'años enseñando' },
  { num: '2 800+', label: 'niños certificados' },
  { num: '6', label: 'niveles graduados' },
]

export function HeroSection(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-bg">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-14 lg:py-20">
        <div className="relative z-10">
          <span className="pk-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Cupos abiertos · ciclo junio
          </span>

          <h1 className="mt-5 text-5xl font-bold leading-[0.98] tracking-tight text-pk-ink sm:text-6xl lg:text-[5.25rem]">
            Aprenden.
            <br />
            Se divierten.
            <br />
            Son{' '}
            <PeskidsBrush color={peskidsColorTokens.primary.teal} size={56} tilt={-3} className="sm:text-[4.5rem]">
              Pes
            </PeskidsBrush>
            <PeskidsBrush color={peskidsColorTokens.secondary.orange} size={56} tilt={-3} className="sm:text-[4.5rem]">
              kids
            </PeskidsBrush>
            <span className="text-pk-ink">.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-pk-sub">
            Academia de natación para niños desde{' '}
            <strong className="text-pk-ink">3 meses hasta 15 años</strong>. Clases en{' '}
            <strong className="text-pk-ink">sede Llanogrande</strong> o{' '}
            <strong className="text-pk-ink">a domicilio</strong> en el área metropolitana.
          </p>

          <WiggleLine width={120} className="mt-4" />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <WhatsAppLink
              variant="hero"
              label="Escribir por WhatsApp"
              prefill="Hola Peskids, quiero reservar una clase de prueba de natación."
            />
            <Link
              href="#contacto"
              className="inline-flex h-12 items-center justify-center rounded-full border-2 border-pk-primary bg-pk-surface px-6 text-sm font-bold text-pk-primary transition hover:bg-pk-primary/5"
            >
              O reserva con el formulario ↓
            </Link>
          </div>
          <p className="mt-3 text-sm text-pk-sub">
            <Link href="/familias" className="font-semibold text-pk-primary hover:underline">
              Portal de familias
            </Link>
            {' · '}
            Respuesta habitual en menos de 48 h
          </p>
          <div className="mt-10 flex flex-wrap gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-pk-ink">{s.num}</p>
                <p className="text-xs text-pk-mutedText">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:sticky lg:top-24">
          <LeadCaptureForm />
          <StarBurst size={24} className="pointer-events-none absolute -right-2 -top-3 hidden lg:block" />
        </div>
      </div>
    </section>
  )
}

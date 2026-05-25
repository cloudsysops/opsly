import Link from 'next/link'
import { Waves } from 'lucide-react'
import { PeskidsBrush, StarBurst, WiggleLine } from '@/components/brand/peskids-logo'
import { HeroChatCard } from '@/components/chat/hero-chat-card'
import { HeroChatCta } from '@/components/chat/hero-chat-cta'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { peskidsColorTokens } from '@/lib/tokens'

const stats = [
  { num: '14', label: 'años enseñando' },
  { num: '2 800+', label: 'niños certificados' },
  { num: '6', label: 'niveles graduados' },
]

export function HeroSection(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(76,184,176,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,177,67,0.14),_transparent_32%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-14 lg:py-20">
        <div className="relative z-10">
          <span className="pk-pill border-white/10 bg-white/10 text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Cupos abiertos · ciclo junio
          </span>

          <h1 className="mt-5 text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-[5.2rem]">
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
            <span className="text-white">.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
            Academia de natación para niños desde{' '}
            <strong className="text-white">3 meses hasta 15 años</strong>. Clases en{' '}
            <strong className="text-white">sede Llanogrande</strong> o{' '}
            <strong className="text-white">a domicilio</strong> en el área metropolitana.
          </p>

          <WiggleLine width={120} color="rgba(76,184,176,0.95)" className="mt-4" />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <HeroChatCta />
            <WhatsAppLink variant="hero" label="Escribir por WhatsApp" />
            <Link
              href="#niveles"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/15"
            >
              <Waves className="h-5 w-5" aria-hidden />
              Ver niveles
            </Link>
          </div>

          <p className="mt-3 text-sm text-white/60">
            <Link href="/familias" className="font-semibold text-pk-primary hover:underline">
              Portal de familias
            </Link>
            {' · '}
            Reserva guiada por chat en menos de 2 minutos
          </p>

          <div className="mt-10 flex flex-wrap gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-white">{s.num}</p>
                <p className="text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:sticky lg:top-24">
          <HeroChatCard />
          <StarBurst size={24} className="pointer-events-none absolute -right-2 -top-3 hidden lg:block" />
        </div>
      </div>
    </section>
  )
}

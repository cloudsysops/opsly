import Link from 'next/link'
import { Mail, Waves } from 'lucide-react'
import { PeskidsBrush, StarBurst, WiggleLine } from '@/components/brand/peskids-logo'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { peskidsColorTokens } from '@/lib/tokens'

const stats = [
  { num: '14', label: 'años enseñando' },
  { num: '2 800+', label: 'niños certificados' },
  { num: '2', label: 'modalidades: sede y domicilio' },
]

export function HeroSection(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(76,184,176,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,177,67,0.14),_transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-14 sm:px-8 lg:px-14 lg:py-20">
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

        <WiggleLine width={120} color="rgba(76,184,176,0.95)" className="mt-8" />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <WhatsAppLink variant="hero" label="Reservar por WhatsApp" />
          <Link
            href="#redes"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/15"
          >
            <Waves className="h-5 w-5" aria-hidden />
            Ver clases en Instagram
          </Link>
        </div>

        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/65">
          Reservas y consultas por WhatsApp. El portal de familias es{' '}
          <strong className="font-semibold text-white/85">solo por invitación</strong> cuando ya
          tienes clase o reserva activa con nosotros.
        </p>

        <Link
          href="/familias/login"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
        >
          <Mail className="h-4 w-4 text-pk-primary" aria-hidden />
          Ya tengo invitación — ingresar con mi correo
        </Link>

        <div className="relative mt-10 flex flex-wrap gap-10">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-white">{s.num}</p>
              <p className="text-xs text-white/60">{s.label}</p>
            </div>
          ))}
          <StarBurst size={24} className="pointer-events-none absolute -right-2 top-0 hidden sm:block" />
        </div>
      </div>
    </section>
  )
}

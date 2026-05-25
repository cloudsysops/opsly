import Link from 'next/link'
import { ExternalLink, Instagram, Mail, MessageCircle, Waves } from 'lucide-react'
import { PeskidsLockup, PeskidsBrush, StarBurst, WiggleLine } from '@/components/brand/peskids-logo'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { PESKIDS_CONTACT, buildWhatsAppUrl } from '@/lib/contact-channels'
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed'
import { peskidsColorTokens } from '@/lib/tokens'

const stats = [
  { num: '14', label: 'años enseñando' },
  { num: '2 800+', label: 'niños certificados' },
  { num: '6', label: 'niveles graduados' },
]

const socialLinks = [
  {
    href: PESKIDS_INSTAGRAM.profileUrl,
    label: 'Instagram',
    icon: Instagram,
    external: true,
  },
  {
    href: buildWhatsAppUrl(),
    label: 'WhatsApp',
    icon: MessageCircle,
    external: true,
  },
  {
    href: `mailto:${PESKIDS_CONTACT.email}`,
    label: PESKIDS_CONTACT.email,
    icon: Mail,
    external: false,
  },
] as const

export function HeroSection(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(76,184,176,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,177,67,0.14),_transparent_32%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-14 lg:py-20">
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
            <Link
              href="#niveles"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md transition hover:bg-pk-primary/90"
            >
              <Waves className="h-5 w-5" aria-hidden />
              Ver niveles
            </Link>
            <WhatsAppLink variant="hero" label="Reserva tu clase" />
            <Link
              href="/familias"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/15"
            >
              Portal de familias
            </Link>
            <Link
              href={PESKIDS_INSTAGRAM.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/15"
            >
              <Instagram className="h-5 w-5" aria-hidden />
              Seguir
            </Link>
          </div>

          <p className="mt-3 text-sm text-white/60">Reserva guiada por WhatsApp y noticias en nuestras redes.</p>

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
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(76,184,176,0.16),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,177,67,0.12),_transparent_28%)]" />

            <div className="relative flex h-full flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <PeskidsLockup height={76} color="#ffffff" tag="LLANOGRANDE · MEDELLÍN" />
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">
                  Redes
                </span>
              </div>

              <p className="max-w-md text-sm leading-relaxed text-white/75">
                Seguimos el día a día de la piscina, los niveles y las familias. Aquí está la
                marca, el contacto y el acceso directo a nuestras superficies principales.
              </p>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {socialLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/15"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{link.label}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
                    </Link>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={PESKIDS_INSTAGRAM.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-pk-deep transition hover:bg-white/90"
                >
                  <Instagram className="h-5 w-5" aria-hidden />
                  Seguir en Instagram
                </Link>
                <Link
                  href="/familias"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Portal de familias
                </Link>
              </div>
            </div>
          </div>

          <StarBurst size={24} className="pointer-events-none absolute -right-2 -top-3 hidden lg:block" />
        </div>
      </div>
    </section>
  )
}

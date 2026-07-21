import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { PeskidsBrush, WiggleLine } from '@/components/brand/peskids-logo'
import { GatedWhatsAppLink } from '@/components/marketing/gated-whatsapp-link'
import { PESKIDS_RESERVATION_FORM_HREF } from '@/lib/peskids-landing-config'
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed'
import { peskidsColorTokens } from '@/lib/tokens'

const instagramButtonClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] px-6 text-sm font-bold text-white shadow-sm transition hover:opacity-95'

export function HeroSection(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(76,184,176,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(255,177,67,0.14),_transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-14 sm:px-8 lg:px-14 lg:py-20">
        <span className="pk-pill border-white/10 bg-white/10 text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Cupos abiertos · segundo semestre
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
          <Link
            href={PESKIDS_RESERVATION_FORM_HREF}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md transition hover:bg-pk-primary/90"
          >
            Reservar clase gratuita
          </Link>
          <GatedWhatsAppLink variant="onDark" label="WhatsApp" />
          <Link
            href={PESKIDS_INSTAGRAM.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={instagramButtonClass}
            aria-label="Ver perfil de Peskids en Instagram"
          >
            <Instagram className="h-5 w-5 shrink-0 text-white" aria-hidden />
            Ver Instagram
          </Link>
        </div>

        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/65">
          Primero completa el formulario con tus datos; después podrás continuar por WhatsApp si lo
          prefieres.
        </p>
      </div>
    </section>
  )
}

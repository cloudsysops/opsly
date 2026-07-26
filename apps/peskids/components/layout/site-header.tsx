import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { GatedWhatsAppLink } from '@/components/marketing/gated-whatsapp-link'
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed'

interface SiteHeaderProps {
  variant?: 'marketing' | 'minimal'
}

const instagramButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-95'

export function SiteHeader({ variant = 'marketing' }: SiteHeaderProps): React.ReactElement {
  return (
    <header className="sticky top-0 z-40 border-b border-pk-border/90 bg-pk-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-14">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <PeskidsLockup height={40} />
        </Link>
        {variant === 'marketing' ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-5 text-sm font-semibold md:flex">
              <Link
                href="/familias/login"
                className="text-[#004C63] transition hover:text-[#2DB7B0]"
              >
                Acceso familias
              </Link>
            </nav>
            <GatedWhatsAppLink
              variant="pill"
              label="WhatsApp"
              className="hidden h-10 border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15 sm:inline-flex"
            />
            <Link
              href={PESKIDS_INSTAGRAM.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={instagramButtonClass}
              aria-label="Ver perfil de Peskids en Instagram"
            >
              <Instagram className="h-4 w-4 shrink-0 text-white" aria-hidden />
              <span>Ver Instagram</span>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  )
}

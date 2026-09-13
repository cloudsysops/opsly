import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
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
          <PeskidsLockup height={56} />
        </Link>
        {variant === 'marketing' ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-4">
              <Link
                href="/games"
                className="inline-flex min-h-10 items-center rounded-full bg-[#E9F8F5] px-4 font-extrabold text-[#087D78] transition hover:bg-[#D6F1EC]"
              >
                Juegos
              </Link>
              <Link
                href="/familias/login"
                className="hidden text-[#004C63] transition hover:text-[#2DB7B0] md:inline-flex"
              >
                Acceso familias
              </Link>
            </nav>
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

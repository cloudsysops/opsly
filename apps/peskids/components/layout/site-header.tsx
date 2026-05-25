import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed'

interface SiteHeaderProps {
  variant?: 'marketing' | 'minimal'
}

export function SiteHeader({ variant = 'marketing' }: SiteHeaderProps): React.ReactElement {
  return (
    <header className="sticky top-0 z-40 border-b border-pk-border/90 bg-pk-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-14">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <PeskidsLockup height={40} />
        </Link>
        {variant === 'marketing' ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-6 text-sm font-semibold text-pk-sub md:flex">
              <a href="#niveles" className="hover:text-pk-primary">
                Niveles
              </a>
              <a href="#redes" className="hover:text-pk-primary">
                Redes
              </a>
              <Link href="/familias" className="hover:text-pk-primary">
                Familias
              </Link>
            </nav>
            <Link
              href="/familias/login"
              className="hidden h-10 items-center justify-center rounded-full border border-pk-border bg-white px-4 text-xs font-bold text-pk-ink transition hover:border-pk-primary/40 hover:bg-pk-snow sm:inline-flex"
            >
              Acceso familias
            </Link>
            <Link
              href={PESKIDS_INSTAGRAM.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-pk-primary px-4 text-xs font-bold text-white shadow-sm transition hover:bg-pk-primary/90 sm:hidden"
            >
              <Instagram className="h-4 w-4" aria-hidden />
              Seguir
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  )
}

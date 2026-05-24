import Link from 'next/link'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'

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
              <a href="#contacto" className="hover:text-pk-primary">
                Reservar
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
            <WhatsAppLink variant="button" label="WhatsApp" className="shrink-0" />
            <a
              href="#contacto"
              className="inline-flex h-10 items-center justify-center rounded-full bg-pk-primary px-4 text-xs font-bold text-white shadow-sm sm:hidden"
            >
              Reservar
            </a>
          </div>
        ) : null}
      </div>
    </header>
  )
}

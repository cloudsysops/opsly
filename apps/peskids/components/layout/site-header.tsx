import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-6 text-sm font-semibold text-pk-sub md:flex">
              <Link href="/familias/login" className="hover:text-pk-primary">
                Acceso
              </Link>
            </nav>

            {/* Desktop WhatsApp Button */}
            <WhatsAppLink
              variant="button"
              label="WhatsApp"
              className="hidden h-10 px-4 text-xs sm:inline-flex"
            />

            {/* Desktop Instagram Button */}
            <Link
              href={PESKIDS_INSTAGRAM.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 text-xs font-bold text-white shadow-sm transition hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 sm:inline-flex"
            >
              <Instagram className="h-4 w-4" aria-hidden />
              Instagram
            </Link>

            {/* Mobile: WhatsApp + Instagram + Acceso */}
            <div className="flex items-center gap-2 sm:hidden">
              <WhatsAppLink
                variant="button"
                label="WhatsApp"
                className="inline-flex h-10 px-3 text-xs"
              />
              <Link
                href={PESKIDS_INSTAGRAM.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-3 text-xs font-bold text-white shadow-sm transition"
              >
                <Instagram className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/familias/login"
                className="inline-flex h-10 items-center justify-center rounded-full border border-pk-primary px-3 text-xs font-bold text-pk-primary transition hover:bg-pk-primary/10"
              >
                Acceso
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}

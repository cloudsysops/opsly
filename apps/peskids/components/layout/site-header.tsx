import Link from 'next/link'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { Button } from '@/components/ui/button'

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
          <nav className="hidden items-center gap-8 text-sm font-semibold text-pk-sub md:flex">
            <a href="#metodo" className="hover:text-pk-primary">
              Método
            </a>
            <a href="#niveles" className="hover:text-pk-primary">
              Niveles
            </a>
            <a href="#contacto" className="hover:text-pk-primary">
              Contacto
            </a>
            <Link href="/admin">
              <Button variant="deep" size="sm">
                Panel admin
              </Button>
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  )
}

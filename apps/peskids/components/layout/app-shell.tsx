'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  Home,
  LogOut,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { RoleSwitcher } from '@/components/admin/role-switcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  variant: 'teacher' | 'support';
  title?: string;
}

const NAV_ITEMS = {
  teacher: [
    { href: '/teacher/dashboard', label: 'Dashboard', icon: Home },
    { href: '/teacher/submissions', label: 'Entregas', icon: ClipboardList },
  ],
  support: [
    { href: '/support/dashboard', label: 'Dashboard', icon: Home },
  ],
} as const;

export function AppShell({ children, variant, title }: AppShellProps): React.ReactElement {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = NAV_ITEMS[variant] || [];

  return (
    <div className="flex min-h-screen flex-col bg-pk-bg">
      {/* Skip link */}
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-pk-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-pk-ink focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-pk-border/90 bg-pk-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 min-w-11 md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
            >
              <span className="flex h-4 w-4 flex-col justify-center gap-0.5" aria-hidden>
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </Button>

            <Link href="/" className="transition-opacity hover:opacity-90">
              <PeskidsLogo size={36} />
            </Link>
            <div>
              <p className="text-sm font-semibold text-pk-ink">Peskids</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
                {variant === 'teacher' ? 'Profesores' : 'Soporte'}
              </p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-pk px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-primary/40 focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-pk-primary/10 text-pk-primary-dark'
                      : 'text-pk-sub hover:bg-pk-muted hover:text-pk-ink'
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <RoleSwitcher />
            <Link
              href="/"
              className="hidden text-pk-mutedText transition hover:text-pk-ink sm:inline"
              aria-label="Volver al sitio"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar menú"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-pk-sidebar text-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <PeskidsLogo size={28} />
                <div>
                  <p className="text-sm font-semibold">Peskids</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                    {variant === 'teacher' ? 'Profesores' : 'Soporte'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-11 text-white hover:bg-white/10"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Cerrar navegación"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menú móvil">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/70 hover:bg-white/7 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4 opacity-80" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}

      {/* Main content */}
      <main id="app-main" className="min-h-0 flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          {title ? (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-pk-ink">{title}</h1>
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminNavLink } from '@/components/admin-nav-link';
import { SkipLink } from '@/components/ui/accessibility';
import { Button } from '@/components/ui/button';
import { PORTAL_DEMO_COOKIE, PORTAL_DEMO_MODE_COOKIE } from '@/lib/demo-tenant';
import { createClient } from '@/lib/supabase';

export function PortalShell({
  title,
  children,
  showModeLink,
  tenantSlug,
}: {
  title: string;
  children: ReactNode;
  showModeLink?: boolean;
  tenantSlug?: string;
}) {
  const router = useRouter();

  async function signOut() {
    const hasDemoSession =
      document.cookie.includes(`${PORTAL_DEMO_COOKIE}=1`) &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (hasDemoSession) {
      document.cookie = `${PORTAL_DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${PORTAL_DEMO_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = 'opsly_portal_demo_tenant=; path=/; max-age=0; SameSite=Lax';
      router.push('/login');
      router.refresh();
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = `${PORTAL_DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${PORTAL_DEMO_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = 'opsly_portal_demo_tenant=; path=/; max-age=0; SameSite=Lax';
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ops-bg">
      <SkipLink />
      <header className="sticky top-0 z-10 border-b border-ops-border/80 bg-ops-bg/80 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-ops-bg/70 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="shrink-0 font-mono text-lg font-semibold tracking-tight text-ops-green transition-colors hover:text-ops-green/90"
            >
              Opsly
            </Link>
            <span className="min-w-0 max-w-[min(12rem,40vw)] truncate font-sans text-sm text-neutral-400 sm:max-w-xs">
              {title}
            </span>
            <AdminNavLink />
          </div>
          <nav className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
            {tenantSlug !== undefined && tenantSlug.length > 0 ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/managed">Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/${tenantSlug}/workflows`}>Workflows</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/${tenantSlug}/subscriptions`}>Planes</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/${tenantSlug}/invoices`}>Facturas</Link>
                </Button>
              </>
            ) : null}
            {showModeLink === true ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Cambiar modo</Link>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" type="button" onClick={() => void signOut()}>
              Salir
            </Button>
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10"
        tabIndex={-1}
      >
        {children}
      </main>
      <footer className="border-t border-ops-border px-6 py-4 text-center font-mono text-[11px] text-ops-gray">
        {(() => {
          const d = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim();
          return d && d.length > 0 ? `Opsly · ${d}` : 'Opsly';
        })()}
      </footer>
    </div>
  );
}

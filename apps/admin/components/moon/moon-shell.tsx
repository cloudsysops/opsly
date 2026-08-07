'use client';

import { usePathname } from 'next/navigation';
import { MoonSidebar } from '@/components/moon/moon-sidebar';
import { MoonHeader } from '@/components/moon/moon-header';
import { CapacityAlertBanner } from '@/components/layout/CapacityAlertBanner';

/**
 * Opsly Moon chrome — evolves apps/admin without a second app.
 */
export function MoonShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  if (pathname === '/login' || pathname.startsWith('/invite')) {
    return <div className="min-h-screen bg-[#050914]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100">
      <a
        href="#moon-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Saltar al contenido
      </a>
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(109,40,217,0.12),transparent_50%)]"
        aria-hidden
      />
      <MoonSidebar />
      <div className="relative ml-0 flex min-h-screen min-w-0 flex-1 flex-col md:ml-[248px]">
        <MoonHeader />
        <CapacityAlertBanner />
        <main id="moon-main" tabIndex={-1} className="flex-1 overflow-auto p-4 sm:p-6 outline-none">
          {children}
        </main>
        <footer className="mx-4 mb-4 rounded-xl border border-white/10 px-4 py-3 font-mono text-[11px] text-slate-500 sm:mx-6">
          Opsly Moon · v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0'} ·{' '}
          {process.env.NEXT_PUBLIC_ENV ?? 'staging'} ·{' '}
          {process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'op-sly.com'} · sin MRR ficticio · dry-run
          default
        </footer>
      </div>
    </div>
  );
}

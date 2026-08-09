'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isNavActive,
  type MissionControlProfile,
} from '@intcloudsysops/mission-control-kit';

export function McShell({
  profile,
  children,
  ungatedWarning,
}: {
  profile: MissionControlProfile;
  children: React.ReactNode;
  ungatedWarning?: boolean;
}): React.ReactElement {
  const pathname = usePathname();
  const { brand, nav, basePath } = profile;

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${brand.colors.accent}33, transparent), ${brand.colors.background}`,
        color: brand.colors.text,
      }}
    >
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col border-r border-white/10 bg-black/40 backdrop-blur md:flex">
        <div className="border-b border-white/10 px-4 py-4">
          <Link href={basePath} className="block">
            <span className="block text-sm font-semibold tracking-tight">{brand.productName}</span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
              {brand.shortName} · {profile.mode}
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-3 overflow-y-auto p-2" aria-label="Mission Control">
          {nav.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href, basePath, item.legacyHref);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className={
                          active
                            ? 'block rounded-lg px-3 py-2 text-sm ring-1'
                            : 'block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100'
                        }
                        style={
                          active
                            ? {
                                backgroundColor: `${brand.colors.primary}22`,
                                color: brand.colors.text,
                                boxShadow: `inset 0 0 0 1px ${brand.colors.primary}55`,
                              }
                            : undefined
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3 text-[11px] text-slate-500">
          Kit: @intcloudsysops/mission-control-kit
        </div>
      </aside>

      <div className="md:ml-[240px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {brand.tagline ?? 'Mission Control'}
            </p>
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-100">
              ← Sitio público
            </Link>
          </div>
          {ungatedWarning ? (
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Acceso sin token (dev). En prod define <code>ICSO_MC_ACCESS_TOKEN</code>.
            </p>
          ) : null}
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function McCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function McPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.ReactElement {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

export function McEmpty({ title, description }: { title: string; description: string }): React.ReactElement {
  return (
    <McCard className="border-dashed text-center">
      <p className="font-semibold text-slate-100">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </McCard>
  );
}

export function McBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'healthy' | 'warning' | 'critical' | 'unknown';
}): React.ReactElement {
  const map = {
    healthy: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    warning: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
    critical: 'border-red-500/40 bg-red-500/15 text-red-200',
    unknown: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
  } as const;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MoonCommandBar } from '@/components/moon/moon-command-bar';
import { createClient } from '@/lib/supabase/client';
import { Separator } from '@/components/ui/separator';

const AUTH_TIMEOUT_MS = 1_500;

const labels: Record<string, string> = {
  moon: 'Moon',
  dashboard: 'Dashboard',
  clients: 'Clientes',
  tenants: 'Tenants',
  agents: 'Agentes',
  tasks: 'Tasks',
  queue: 'Queue',
  approvals: 'Approvals',
  automations: 'Automatizaciones',
  integrations: 'Integraciones',
  deployments: 'Deployments',
  health: 'Health',
  usage: 'Usage',
  costs: 'Costos',
  billing: 'Billing',
  ventures: 'Ventures',
  blueprints: 'Blueprints',
  modules: 'Módulos',
  support: 'Soporte',
  settings: 'Settings',
  command: 'Command',
  reports: 'Reportes',
  'approval-decisions': 'Approvals',
  'mission-control': 'Runtime MC',
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('auth timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function envBadgeLabel(): string {
  const env = (process.env.NEXT_PUBLIC_ENV ?? 'staging').toLowerCase();
  if (env === 'production' || env === 'prod' || env === 'prd') return 'Producción';
  if (env === 'staging' || env === 'stg') return 'Staging';
  return env;
}

export function MoonHeader(): React.ReactElement {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const [email, setEmail] = useState('');
  const badge = envBadgeLabel();
  const isProd = badge === 'Producción';

  useEffect(() => {
    const supabase = createClient();
    void withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS)
      .then(({ data }) => {
        setEmail(data.user?.email ?? '');
      })
      .catch(() => {
        setEmail('');
      });
  }, []);

  const crumbs = segments.map((seg, i) => {
    const path = `/${segments.slice(0, i + 1).join('/')}`;
    return { path, label: labels[seg] ?? seg };
  });

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070d18]/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <nav
          className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-slate-500 md:flex"
          aria-label="Breadcrumb"
        >
          {crumbs.length === 0 ? (
            <span className="text-violet-200">Inicio</span>
          ) : (
            crumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-2">
                {i > 0 ? <span className="text-slate-600">/</span> : null}
                <span className={i === crumbs.length - 1 ? 'text-slate-200' : ''}>{c.label}</span>
              </span>
            ))
          )}
        </nav>
        <MoonCommandBar />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <span
            className={
              isProd
                ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-200'
                : 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-100'
            }
          >
            <span
              className={isProd ? 'h-1.5 w-1.5 rounded-full bg-emerald-400' : 'h-1.5 w-1.5 rounded-full bg-amber-400'}
              aria-hidden
            />
            {badge}
          </span>
          <span className="max-w-[160px] truncate text-xs text-slate-400">{email || '—'}</span>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
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

export function MoonHeader(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split('/').filter(Boolean);
  const [email, setEmail] = useState('');
  const [command, setCommand] = useState('');

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
        <nav className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-slate-500 md:flex">
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
        <form
          className="relative flex min-w-0 flex-1 items-center md:max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            const q = command.trim();
            if (!q) return;
            router.push(`/moon/command?q=${encodeURIComponent(q)}`);
            setCommand('');
          }}
        >
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-500" aria-hidden />
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="¿Qué quieres revisar? (dry-run)"
            className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none"
            aria-label="Command Center dry-run"
          />
          <kbd className="absolute right-2 hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
            ⌘K
          </kbd>
        </form>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Producción
          </span>
          <span className="max-w-[160px] truncate text-xs text-slate-400">{email || '—'}</span>
        </div>
      </div>
    </header>
  );
}

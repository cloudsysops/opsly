'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Separator } from '@/components/ui/separator';

const AUTH_TIMEOUT_MS = 1_500;

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  tenants: 'Tenants',
  settings: 'Settings',
  login: 'Login',
  feedback: 'Feedback',
  invitations: 'Invitations',
  metrics: 'Metrics',
  agents: 'Agent Teams',
  costs: 'Costos',
  'api-surface': 'API Surface',
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

export function Topbar() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const [email, setEmail] = useState<string>('');

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
    const label = labels[seg] ?? seg;
    return { path, label };
  });

  return (
    <header className="holo-border neon-glow sticky top-0 z-30 mx-6 mt-4 flex h-12 items-center gap-3 rounded-xl bg-ops-bg/85 px-6 backdrop-blur">
      <nav className="flex flex-1 items-center gap-2 font-sans text-xs text-ops-gray">
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-2">
            {i > 0 ? <span className="text-ops-purple">/</span> : null}
            <span className={i === crumbs.length - 1 ? 'text-ops-cyan' : 'text-ops-gray'}>
              {c.label}
            </span>
          </span>
        ))}
      </nav>
      <Separator orientation="vertical" className="h-6" />
      <div className="digital-readout max-w-[220px] truncate text-xs text-ops-magenta">{email || '—'}</div>
    </header>
  );
}

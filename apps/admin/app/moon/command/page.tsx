'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonSkeleton,
} from '@/components/moon/primitives';

function CommandBody(): React.ReactElement {
  const search = useSearchParams();
  const q = (search.get('q') ?? '').trim();

  const suggestions = [
    { href: '/moon/clients', label: 'Listar clientes' },
    { href: '/moon/health', label: 'Inspeccionar health / VPS' },
    { href: '/moon/tasks', label: 'Resumir tasks / cola' },
    { href: '/moon/agents', label: 'Revisar agent fleet' },
    { href: '/moon/usage', label: 'Comparar usage (sin MRR)' },
    { href: '/moon/approvals', label: 'Approvals pendientes' },
    { href: '/moon/deployments', label: 'Deployments (doc only)' },
  ];

  const matched = q
    ? suggestions.filter(
        (s) =>
          s.label.toLowerCase().includes(q.toLowerCase()) ||
          s.href.includes(q.toLowerCase())
      )
    : suggestions;

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Command Center"
        subtitle="Dry-run · read-only · sin deploy · sin mensajes · sin gasto LLM no autorizado."
      />
      <MoonCard className="space-y-3 p-5">
        <p className="text-sm text-slate-300">
          Consulta: <span className="font-mono text-violet-200">{q || '(vacía)'}</span>
        </p>
        <p className="text-xs text-slate-500">
          Flujo futuro: Command → policy → router → orchestrator → LLM Gateway → resultado
          sanitizado. Esta versión solo enruta a vistas Moon existentes.
        </p>
      </MoonCard>
      {matched.length === 0 ? (
        <MoonEmptyState
          title="Sin coincidencias"
          description="Prueba: clientes degradados, health, tasks, agents, usage, approvals."
        />
      ) : (
        <ul className="space-y-2">
          {matched.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm hover:border-violet-400/30 hover:bg-violet-500/10"
              >
                {s.label}
                <span className="ml-2 font-mono text-[10px] text-slate-500">{s.href}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MoonCommandPage(): React.ReactElement {
  return (
    <Suspense fallback={<MoonSkeleton className="h-40" />}>
      <CommandBody />
    </Suspense>
  );
}

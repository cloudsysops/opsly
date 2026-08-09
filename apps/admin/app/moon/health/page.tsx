'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { getSystemMetrics } from '@/lib/api-client';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

const SERVICES = [
  { id: 'orchestrator', label: 'Orchestrator' },
  { id: 'llm-gateway', label: 'LLM Gateway' },
  { id: 'redis', label: 'Redis / queues' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'n8n', label: 'n8n (tenants)' },
  { id: 'traefik', label: 'Traefik' },
  { id: 'vps', label: 'VPS host' },
  { id: 'workers', label: 'Workers' },
] as const;

export default function MoonHealthPage(): React.ReactElement {
  const { data, error, isLoading } = useSWR('moon-health-system', () => getSystemMetrics(), {
    revalidateOnFocus: false,
  });
  const live = data?.mock !== true;
  const ramTone: MoonHealthTone =
    data && data.ram_total_gb > 0 && data.ram_used_gb / data.ram_total_gb > 0.85
      ? 'critical'
      : data && data.ram_total_gb > 0 && data.ram_used_gb / data.ram_total_gb > 0.7
        ? 'warning'
        : 'healthy';

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Health"
        subtitle="Señales reales donde existan. Resto = unknown hasta probe."
        actions={
          <Link
            href="/machines"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs"
          >
            Legacy machines
          </Link>
        }
      />
      {isLoading ? <MoonSkeleton /> : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}
      {data ? (
        <MoonCard className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-sm font-semibold">Host</h2>
            <MoonConfidenceBadge confidence={live ? 'REAL' : 'ESTIMADO'} />
            <MoonStatusBadge tone={ramTone}>RAM</MoonStatusBadge>
          </div>
          <p className="font-mono text-sm">
            CPU {data.cpu_percent.toFixed(1)}% · RAM {data.ram_used_gb.toFixed(1)}/
            {data.ram_total_gb.toFixed(1)} GiB · containers {data.containers_running}
          </p>
        </MoonCard>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SERVICES.map((s) => (
          <MoonCard key={s.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">{s.label}</p>
              <MoonStatusBadge tone={s.id === 'vps' && data ? ramTone : 'unknown'}>
                {s.id === 'vps' && data ? 'probed' : 'unknown'}
              </MoonStatusBadge>
            </div>
          </MoonCard>
        ))}
      </div>
    </div>
  );
}

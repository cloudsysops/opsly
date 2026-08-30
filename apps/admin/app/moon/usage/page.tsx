'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
} from '@/components/moon/primitives';
import { getMetrics } from '@/lib/api-client';
import { omitMrrUntilCommercialSource } from '@/lib/moon/data-label';

export default function MoonUsagePage(): React.ReactElement {
  const { data, error, isLoading } = useSWR('moon-usage-metrics', () => getMetrics(), {
    revalidateOnFocus: false,
  });
  const mrr = omitMrrUntilCommercialSource();

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Usage"
        subtitle="Agregados de plataforma. Detalle por tenant en ficha cliente. Sin MRR ficticio."
        actions={
          <Link href="/metrics/llm" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs">
            Legacy LLM metrics
          </Link>
        }
      />
      {isLoading ? <MoonSkeleton /> : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <MoonCard className="p-4">
            <div className="flex justify-between">
              <p className="text-xs text-slate-500">Active tenants</p>
              <MoonConfidenceBadge confidence="REAL" />
            </div>
            <p className="mt-2 font-display text-2xl">{data.active_tenants}</p>
          </MoonCard>
          <MoonCard className="p-4">
            <div className="flex justify-between">
              <p className="text-xs text-slate-500">Total tenants</p>
              <MoonConfidenceBadge confidence="REAL" />
            </div>
            <p className="mt-2 font-display text-2xl">{data.total_tenants}</p>
          </MoonCard>
          <MoonCard className="p-4">
            <div className="flex justify-between">
              <p className="text-xs text-slate-500">MRR</p>
              <MoonConfidenceBadge confidence="PROYECTADO" />
            </div>
            <p className="mt-2 font-display text-2xl">—</p>
            <p className="mt-1 text-[10px] text-slate-500">{mrr.omittedReason}</p>
          </MoonCard>
        </div>
      ) : !isLoading && !error ? (
        <MoonEmptyState title="Sin usage" description="GET /api/metrics no disponible." />
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { getHealthTravelRuntimeSummary, getSystemMetrics, syncHealthTravelCatalog } from '@/lib/api-client';
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
  const {
    data: healthTravel,
    error: healthTravelError,
    isLoading: healthTravelLoading,
    mutate: refreshHealthTravel,
  } = useSWR('moon-health-health-travel', () => getHealthTravelRuntimeSummary(30), {
    revalidateOnFocus: false,
  });
  const [catalogSync, setCatalogSync] = useState<
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'success'; message: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  async function handleCatalogSync(): Promise<void> {
    setCatalogSync({ status: 'running' });
    try {
      const result = await syncHealthTravelCatalog();
      setCatalogSync({
        status: 'success',
        message: `providers +${result.providers.created}/~${result.providers.updated} · offers +${result.offers.created}/~${result.offers.updated} · skipped ${result.offers.skipped_unassigned}`,
      });
      await refreshHealthTravel();
    } catch (syncError) {
      setCatalogSync({
        status: 'error',
        message: syncError instanceof Error ? syncError.message : String(syncError),
      });
    }
  }
  const live = data?.mock !== true;
  const ramTone: MoonHealthTone =
    data && data.ram_total_gb > 0 && data.ram_used_gb / data.ram_total_gb > 0.85
      ? 'critical'
      : data && data.ram_total_gb > 0 && data.ram_used_gb / data.ram_total_gb > 0.7
        ? 'warning'
        : 'healthy';
  const healthTravelTone: MoonHealthTone =
    healthTravel?.connectivity.status === 'healthy'
      ? 'healthy'
      : healthTravel?.connectivity.status === 'unavailable'
        ? 'critical'
        : 'unknown';
  const healthTravelActivityTone: MoonHealthTone =
    healthTravel?.activity.status === 'recent'
      ? 'healthy'
      : healthTravel?.activity.status === 'quiet'
        ? 'warning'
        : 'unknown';

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
      {healthTravelLoading ? <MoonSkeleton /> : null}
      {healthTravelError ? (
        <MoonErrorState message={`Health Travel: ${String(healthTravelError.message)}`} />
      ) : null}
      {healthTravel ? (
        <MoonCard className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-sm font-semibold">Health Travel Colombia</h2>
            <MoonConfidenceBadge confidence="REAL" />
            <MoonStatusBadge tone={healthTravelTone}>
              {healthTravel.connectivity.status}
            </MoonStatusBadge>
            <MoonStatusBadge tone={healthTravelActivityTone}>
              activity: {healthTravel.activity.status}
            </MoonStatusBadge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Runtime connectivity and business activity are separate signals. No patient PII or
              clinical records are read by Moon.
            </p>
            <button
              type="button"
              onClick={() => void handleCatalogSync()}
              disabled={catalogSync.status === 'running'}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {catalogSync.status === 'running' ? 'Syncing catalog…' : 'Sync catalog'}
            </button>
          </div>
          {catalogSync.status === 'success' || catalogSync.status === 'error' ? (
            <p
              className={
                catalogSync.status === 'success'
                  ? 'text-xs text-emerald-300'
                  : 'text-xs text-red-300'
              }
            >
              {catalogSync.message}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {[
              ['Leads', healthTravel.counts.leads],
              ['Consults scheduled', healthTravel.counts.consultations_scheduled],
              ['Consults completed', healthTravel.counts.consultations_completed],
              ['Quotes', healthTravel.counts.quotes_sent],
              ['Bookings', healthTravel.counts.bookings_started],
              ['Deposits', healthTravel.counts.deposits_paid],
              ['Completed', healthTravel.counts.journeys_completed],
              ['Reconcile', healthTravel.counts.reconciliation_required],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-white/10 p-3">
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-lg">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>
              Last event: {healthTravel.activity.last_event_type ?? 'none'} ·{' '}
              {healthTravel.activity.last_event_at ?? 'never'}
            </span>
            <span>
              Probe: {healthTravel.connectivity.http_status ?? 'n/a'}
              {healthTravel.connectivity.latency_ms !== null
                ? ` · ${healthTravel.connectivity.latency_ms}ms`
                : ''}
            </span>
            <span>Window: {healthTravel.window_days}d</span>
          </div>
        </MoonCard>
      ) : null}
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

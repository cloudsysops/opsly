'use client';

import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { useTenants } from '@/hooks/useTenants';
import { sanitizeTenantForMoonCard } from '@/lib/moon/tenant-card';

type ConfigSummary = {
  slug: string;
  vertical: string | null;
  modules_enabled: string[];
  public_url: string | null;
};

export function MoonClientsClient({
  configSummaries,
}: {
  configSummaries: ConfigSummary[];
}): React.ReactElement {
  const { data, error, isLoading } = useTenants({ page: 1, limit: 100 });
  const configBySlug = new Map(configSummaries.map((c) => [c.slug, c]));
  const cards = (data?.data ?? []).map((t) => ({
    ...sanitizeTenantForMoonCard(t),
    config: configBySlug.get(t.slug),
  }));

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Clientes"
        subtitle="Fuente: platform.tenants. Enriquecimiento opcional desde config/tenants/*. Sin owner_email ni PII."
      />
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <MoonSkeleton />
          <MoonSkeleton />
        </div>
      ) : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}
      {!isLoading && !error && cards.length === 0 ? (
        <MoonEmptyState
          title="No hay clientes"
          description="Registra un tenant en platform.tenants. Los stacks VPS solos no cuentan como cliente."
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <MoonCard key={c.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-base font-semibold">{c.name}</p>
                <p className="font-mono text-xs text-slate-500">{c.slug}</p>
              </div>
              <MoonStatusBadge tone={c.health.tone}>{c.health.label}</MoonStatusBadge>
            </div>
            <p className="text-xs text-slate-400">
              Blueprint: {c.config?.vertical ?? '—'} · Módulos:{' '}
              {c.config?.modules_enabled?.length ?? 0} · Plan: {c.plan}
            </p>
            <div className="mt-auto flex gap-2">
              <Link
                href={`/moon/clients/${encodeURIComponent(c.slug)}`}
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5"
              >
                Ver detalle
              </Link>
              {c.config?.public_url ? (
                <a
                  href={c.config.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-100"
                >
                  Abrir panel
                </a>
              ) : null}
            </div>
          </MoonCard>
        ))}
      </div>
    </div>
  );
}

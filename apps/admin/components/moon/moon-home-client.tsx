'use client';

import Link from 'next/link';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { useTenants } from '@/hooks/useTenants';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { getAdminCosts, getMetrics, getTeamMetrics } from '@/lib/api-client';
import { sanitizeTenantForMoonCard } from '@/lib/moon/tenant-card';
import { omitMrrUntilCommercialSource } from '@/lib/moon/data-label';
import useSWR from 'swr';

type ConfigSummary = {
  slug: string;
  vertical: string | null;
  modules_enabled: string[];
  public_url: string | null;
};

export function MoonHomeClient({
  configSummaries,
}: {
  configSummaries: ConfigSummary[];
}): React.ReactElement {
  const {
    data: tenantsData,
    error: tenantsError,
    isLoading: tenantsLoading,
  } = useTenants({
    page: 1,
    limit: 50,
  });
  const { data: system, error: systemError, isLoading: systemLoading } = useSystemMetrics();
  const { data: metrics } = useSWR('moon-metrics', () => getMetrics(), {
    revalidateOnFocus: false,
  });
  const { data: teams } = useSWR('moon-teams', () => getTeamMetrics(), {
    revalidateOnFocus: false,
  });
  const { data: costs } = useSWR('moon-costs', () => getAdminCosts(), {
    revalidateOnFocus: false,
  });

  const configBySlug = new Map(configSummaries.map((c) => [c.slug, c]));
  const cards = (tenantsData?.data ?? []).map((t) => {
    const safe = sanitizeTenantForMoonCard(t);
    const cfg = configBySlug.get(t.slug);
    return { ...safe, config: cfg };
  });
  const mrrPolicy = omitMrrUntilCommercialSource();
  const liveSystem = system?.mock !== true;

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Control Center"
        subtitle="Clientes reales, salud de plataforma y costos etiquetados. Sin MRR ficticio ni PII de tenants."
        actions={
          <Link
            href="/moon/clients"
            className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-sm text-violet-100 hover:bg-violet-500/25"
          >
            Ver clientes
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Tenants activos"
          value={metrics?.active_tenants ?? '—'}
          confidence="REAL"
          source="GET /api/metrics"
        />
        <Kpi
          label="Tenants totales"
          value={metrics?.total_tenants ?? '—'}
          confidence="REAL"
          source="GET /api/metrics"
        />
        <Kpi
          label="Agentes (teams)"
          value={teams?.teams?.length ?? '—'}
          confidence="REAL"
          source="GET /api/metrics/teams"
        />
        <Kpi
          label="MRR"
          value="—"
          confidence="PROYECTADO"
          source={mrrPolicy.omittedReason ?? 'omitido'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MoonCard className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-100">Salud VPS / host</h2>
            <MoonConfidenceBadge confidence={liveSystem ? 'REAL' : 'ESTIMADO'} />
          </div>
          {systemLoading ? <MoonSkeleton className="h-20" /> : null}
          {systemError ? <MoonErrorState message={String(systemError.message)} /> : null}
          {system ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">CPU</dt>
                <dd className="font-mono text-slate-100">{system.cpu_percent.toFixed(1)}%</dd>
              </div>
              <div>
                <dt className="text-slate-500">RAM</dt>
                <dd className="font-mono text-slate-100">
                  {system.ram_used_gb.toFixed(1)} / {system.ram_total_gb.toFixed(1)} GiB
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Contenedores</dt>
                <dd className="font-mono text-slate-100">{system.containers_running}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Fuente</dt>
                <dd className="text-xs text-slate-400">
                  {liveSystem ? 'Prometheus / system' : 'mock (no producción)'}
                </dd>
              </div>
            </dl>
          ) : null}
        </MoonCard>

        <MoonCard className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-100">Costos plataforma</h2>
            <MoonConfidenceBadge confidence="ESTIMADO" />
          </div>
          {costs ? (
            <p className="text-sm text-slate-300">
              Catálogo admin costs cargado ·{' '}
              <span className="font-mono text-xs text-slate-400">
                {costs.lastUpdated ? `updated ${costs.lastUpdated}` : 'sin timestamp'}
              </span>
              . Cifras del catálogo = ESTIMADO hasta factura proveedor.
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Costos no disponibles aún. Legacy:{' '}
              <Link href="/costs" className="text-violet-300 underline">
                /costs
              </Link>
            </p>
          )}
        </MoonCard>
      </div>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-slate-100">
          Clientes prioritarios
        </h2>
        {tenantsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <MoonSkeleton />
            <MoonSkeleton />
          </div>
        ) : null}
        {tenantsError ? <MoonErrorState message={String(tenantsError.message)} /> : null}
        {!tenantsLoading && !tenantsError && cards.length === 0 ? (
          <MoonEmptyState
            title="Sin tenants registrados"
            description="Los clientes Moon vienen de platform.tenants (+ config/tenants). No se muestran mocks."
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.slice(0, 6).map((c) => (
            <MoonCard key={c.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-base font-semibold text-slate-50">{c.name}</p>
                  <p className="font-mono text-xs text-slate-500">{c.slug}</p>
                </div>
                <MoonStatusBadge tone={c.health.tone}>{c.health.label}</MoonStatusBadge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <dt>Plan</dt>
                  <dd className="text-slate-200">{c.plan}</dd>
                </div>
                <div>
                  <dt>Blueprint</dt>
                  <dd className="text-slate-200">{c.config?.vertical ?? '—'}</dd>
                </div>
                <div>
                  <dt>Módulos</dt>
                  <dd className="text-slate-200">{c.config?.modules_enabled?.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Actualizado</dt>
                  <dd className="font-mono text-slate-200">
                    {new Date(c.updated_at).toLocaleDateString('es')}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  href={`/moon/clients/${encodeURIComponent(c.slug)}`}
                  className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                >
                  Ver detalle
                </Link>
                {c.config?.public_url ? (
                  <a
                    href={c.config.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-100 hover:bg-violet-500/20"
                  >
                    Abrir panel
                  </a>
                ) : (
                  <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-500">
                    Panel no configurado
                  </span>
                )}
              </div>
            </MoonCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  confidence,
  source,
}: {
  label: string;
  value: string | number;
  confidence: 'REAL' | 'ESTIMADO' | 'PROYECTADO';
  source: string;
}): React.ReactElement {
  return (
    <MoonCard className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <MoonConfidenceBadge confidence={confidence} />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-slate-50">{value}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-slate-500" title={source}>
        {source}
      </p>
    </MoonCard>
  );
}

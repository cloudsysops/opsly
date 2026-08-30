'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { getTenant, getTenantUsageMetrics } from '@/lib/api-client';
import { healthFromTenantStatus } from '@/lib/moon/tenant-card';
import { cn } from '@/lib/utils';

const TABS = [
  'overview',
  'modules',
  'agents',
  'automations',
  'integrations',
  'deployments',
  'usage',
  'costs',
  'support',
  'audit',
  'settings',
] as const;

type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as readonly string[]).includes(value);
}

export function MoonClientDetailClient({
  slug,
  config,
}: {
  slug: string;
  config: {
    vertical: string | null;
    modules_enabled: string[];
    public_url: string | null;
    stack_type: string | null;
  } | null;
}): React.ReactElement {
  const search = useSearchParams();
  const tabParam = search.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'overview';

  const { data, error, isLoading } = useSWR(['moon-tenant', slug], () => getTenant(slug), {
    revalidateOnFocus: false,
  });
  const { data: usage } = useSWR(
    tab === 'usage' || tab === 'overview' ? ['moon-usage', slug] : null,
    () => getTenantUsageMetrics(slug, 'month'),
    { revalidateOnFocus: false }
  );

  const tenant = data?.tenant;
  const health = tenant ? healthFromTenantStatus(tenant.status) : null;

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title={tenant?.name ?? slug}
        subtitle={`Detalle read-only · sin PII operativa · slug ${slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/moon/clients"
              className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5"
            >
              Volver
            </Link>
            {config?.public_url ? (
              <a
                href={config.public_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-100"
              >
                Abrir panel tenant
              </a>
            ) : null}
            <Link
              href={`/tenants/${encodeURIComponent(slug)}`}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400"
            >
              Legacy /tenants
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/moon/clients/${encodeURIComponent(slug)}?tab=${t}`}
            role="tab"
            aria-selected={tab === t}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs capitalize',
              tab === t
                ? 'bg-violet-500/20 text-violet-100'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
            )}
          >
            {t}
          </Link>
        ))}
      </div>

      {isLoading ? <MoonSkeleton className="h-40" /> : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}

      {tenant && tab === 'overview' ? (
        <MoonCard className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {health ? <MoonStatusBadge tone={health.tone}>{health.label}</MoonStatusBadge> : null}
            <span className="font-mono text-xs text-slate-500">{tenant.plan}</span>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Field label="Slug" value={tenant.slug} />
            <Field label="Blueprint / vertical" value={config?.vertical ?? '—'} />
            <Field label="Stack" value={config?.stack_type ?? '—'} />
            <Field label="Entorno" value={process.env.NEXT_PUBLIC_ENV ?? 'staging'} />
            <Field
              label="Módulos (config)"
              value={String(config?.modules_enabled?.length ?? 0)}
            />
            <Field
              label="Actualizado"
              value={new Date(tenant.updated_at).toLocaleString('es')}
            />
          </dl>
          <p className="text-xs text-slate-500">
            No se muestra owner_email ni leads/estudiantes. Uso operativo detallado vive en el panel
            del tenant (p. ej. Peskids Mission Control).
          </p>
          {usage ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">Usage mes</span>
                <MoonConfidenceBadge confidence="REAL" />
              </div>
              <p className="font-mono text-sm text-slate-200">
                req {usage.requests} · tokens in/out {usage.tokens_input}/{usage.tokens_output} · $
                {usage.cost_usd.toFixed(4)}
              </p>
            </div>
          ) : null}
        </MoonCard>
      ) : null}

      {tenant && tab === 'modules' ? (
        <MoonCard className="p-5">
          {(config?.modules_enabled?.length ?? 0) === 0 ? (
            <MoonEmptyState
              title="Sin módulos en config"
              description="Entitlements editables dependen de PRs de módulos (#881/#882). Vista read-only."
            />
          ) : (
            <ul className="space-y-2">
              {config?.modules_enabled.map((m) => (
                <li key={m} className="rounded-lg border border-white/10 px-3 py-2 font-mono text-sm">
                  {m}
                </li>
              ))}
            </ul>
          )}
        </MoonCard>
      ) : null}

      {tenant && tab !== 'overview' && tab !== 'modules' && tab !== 'usage' ? (
        <MoonEmptyState
          title={`${tab} — read-only pendiente`}
          description="La pestaña está reservada en el mapa Moon. Se conectará a APIs reales sin inventar datos ni mezclar Peskids PII."
        />
      ) : null}

      {tenant && tab === 'usage' ? (
        <MoonCard className="p-5">
          {usage ? (
            <div className="space-y-2">
              <MoonConfidenceBadge confidence="REAL" />
              <p className="font-mono text-sm">
                period={usage.period} · requests={usage.requests} · cost_usd={usage.cost_usd} ·
                cache_hit_rate={usage.cache_hit_rate}
              </p>
              <p className="text-xs text-slate-500">Fuente: GET /api/metrics/tenant/:slug</p>
            </div>
          ) : (
            <MoonEmptyState
              title="Usage no disponible"
              description="La API de métricas por tenant no respondió o no hay eventos."
            />
          )}
        </MoonCard>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-100">{value}</dd>
    </div>
  );
}

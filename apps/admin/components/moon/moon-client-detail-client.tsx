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
import { omitMrrUntilCommercialSource } from '@/lib/moon/data-label';
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
    tab === 'usage' || tab === 'overview' || tab === 'costs' ? ['moon-usage', slug] : null,
    () => getTenantUsageMetrics(slug, 'month'),
    { revalidateOnFocus: false }
  );

  const tenant = data?.tenant;
  const health = tenant ? healthFromTenantStatus(tenant.status) : null;
  const mrr = omitMrrUntilCommercialSource();

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
              'rounded-lg px-2.5 py-1.5 text-xs capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50',
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
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Slug" value={tenant.slug} />
            <Field label="Blueprint / vertical" value={config?.vertical ?? '—'} />
            <Field label="Stack" value={config?.stack_type ?? '—'} />
            <Field label="Entorno" value={process.env.NEXT_PUBLIC_ENV ?? 'staging'} />
            <Field label="Módulos (config)" value={String(config?.modules_enabled?.length ?? 0)} />
            <Field label="Actualizado" value={new Date(tenant.updated_at).toLocaleString('es')} />
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

      {tenant && tab === 'costs' ? (
        <MoonCard className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <MoonConfidenceBadge confidence="REAL" />
            <span className="text-xs text-slate-400">LLM usage mes (proxy de costo tenant)</span>
          </div>
          {usage ? (
            <p className="font-mono text-lg text-slate-100">${usage.cost_usd.toFixed(4)}</p>
          ) : (
            <p className="text-sm text-slate-400">Sin usage_events para este slug.</p>
          )}
          <div className="rounded-xl border border-dashed border-white/10 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">MRR tenant</span>
              <MoonConfidenceBadge confidence="PROYECTADO" />
            </div>
            <p className="mt-1 font-display text-xl">—</p>
            <p className="text-[10px] text-slate-500">{mrr.omittedReason}</p>
          </div>
          <Link href="/moon/costs" className="text-xs text-violet-300 underline">
            Costos plataforma (catálogo ESTIMADO)
          </Link>
        </MoonCard>
      ) : null}

      {tenant && tab === 'agents' ? (
        <MoonCard className="space-y-3 p-5 text-sm text-slate-300">
          <p>
            Fleet de plataforma es global. No se inventan agentes por tenant. Ver{' '}
            <Link href="/moon/agents" className="text-violet-300 underline">
              /moon/agents
            </Link>
            .
          </p>
          <p className="text-xs text-slate-500">
            Heartbeats no simulados. Tenant allowlists viven en registries cuando existan.
          </p>
        </MoonCard>
      ) : null}

      {tenant && tab === 'automations' ? (
        <MoonCard className="space-y-2 p-5 text-sm text-slate-300">
          <p>
            Stack: <span className="font-mono">{config?.stack_type ?? '—'}</span> · vertical{' '}
            <span className="font-mono">{config?.vertical ?? '—'}</span>
          </p>
          <p className="text-xs text-slate-500">
            Runs n8n: consultar panel tenant / Uptime. Moon no activa workflows. Ver{' '}
            <Link href="/moon/automations" className="text-violet-300 underline">
              /moon/automations
            </Link>
            .
          </p>
        </MoonCard>
      ) : null}

      {tenant && tab === 'integrations' ? (
        <MoonCard className="space-y-2 p-5 text-sm text-slate-300">
          <p>Integraciones son config-dependent (Supabase, n8n, email, payments…). Sin secretos.</p>
          <Link href="/moon/integrations" className="text-xs text-violet-300 underline">
            Catálogo plataforma
          </Link>
        </MoonCard>
      ) : null}

      {tenant && tab === 'deployments' ? (
        <MoonEmptyState
          title="Deploy UI no habilitada para tenant"
          description="Sin contrato approval + rollback en Moon. Usar Actions/runbooks. Ver /moon/deployments."
        />
      ) : null}

      {tenant && tab === 'support' ? (
        <MoonCard className="space-y-3 p-5 text-sm">
          <p className="text-slate-300">
            Soporte plataforma (feedback) sin embeber PII de leads/familias del tenant.
          </p>
          <Link
            href="/feedback"
            className="inline-flex rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5"
          >
            Abrir /feedback
          </Link>
        </MoonCard>
      ) : null}

      {tenant && tab === 'audit' ? (
        <MoonEmptyState
          title="Audit trail tenant — pendiente API"
          description="No se inventan eventos. Cuando exista audit admin scoped, se conectará aquí sin PII operativa."
        />
      ) : null}

      {tenant && tab === 'settings' ? (
        <MoonCard className="space-y-3 p-5 text-sm text-slate-300">
          <p>Settings mutables vía legacy tenant detail + approvals. Esta pestaña es read-only.</p>
          <Link
            href={`/tenants/${encodeURIComponent(slug)}`}
            className="inline-flex rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5"
          >
            Legacy tenant settings
          </Link>
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

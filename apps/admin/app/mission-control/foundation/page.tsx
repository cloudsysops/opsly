'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo } from 'react';

import { getBaseUrl } from '@/lib/api-client';
import type { MissionControlFoundationSnapshot } from '@/lib/mission-control-types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SignalPill({
  label,
  tone,
}: {
  label: string;
  tone: 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const classes =
    tone === 'emerald'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : tone === 'amber'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : tone === 'rose'
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          : 'border-slate-600 bg-slate-900 text-slate-300';
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] ${classes}`}>{label}</span>;
}

function StatusTone(status: string): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (status === 'healthy' || status === 'ready' || status === 'up') {
    return 'emerald';
  }
  if (status === 'degraded' || status === 'blocked' || status === 'down') {
    return 'rose';
  }
  return 'amber';
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{hint}</p>
    </div>
  );
}

export default function MissionControlFoundationPage() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const { data, error, isLoading } = useSWR<MissionControlFoundationSnapshot>(
    `${baseUrl}/api/admin/mission-control`,
    fetcher,
    { refreshInterval: 8000 }
  );

  const tenants = data?.tenants.items ?? [];
  const agents = data?.ai_agents.items ?? [];
  const services = data?.uptime.services ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.9),_#050505_65%)] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-400">Incubation Platform</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Mission Control Foundation</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Read-only operating truth for the incubation platform: tenants, agents, approvals,
              extraction readiness, and core service health.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mission-control"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-cyan-500/50"
            >
              Back to Mission Control
            </Link>
            <Link
              href="/tenants"
              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/15"
            >
              Tenants
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            Failed to load mission control foundation.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="VPS"
            value={data?.vps.status ?? (isLoading ? 'loading' : 'unknown')}
            hint={`api ${data?.vps.api_connectivity ?? '—'} · orch ${data?.vps.orchestrator_connectivity ?? '—'} · llm ${data?.vps.llm_gateway_connectivity ?? '—'} · redis ${data?.vps.redis_connectivity ?? '—'}`}
          />
          <StatCard
            label="Tenants"
            value={data?.tenants.total ?? 0}
            hint={`${data?.tenants.extraction_ready ?? 0} extraction-ready`}
          />
          <StatCard
            label="Approvals"
            value={data?.pending_approvals.count ?? 0}
            hint={`${data?.pending_approvals.queues?.[0]?.waiting ?? 0} waiting · ${data?.pending_approvals.queues?.[0]?.active ?? 0} active`}
          />
          <StatCard
            label="Agents"
            value={data?.ai_agents.total ?? 0}
            hint={`${data?.ai_agents.healthy ?? 0} healthy · ${data?.ai_agents.degraded ?? 0} degraded · ${data?.ai_agents.blocked ?? 0} blocked`}
          />
          <StatCard
            label="Workflows"
            value={data?.workflows.total ?? 0}
            hint={`${data?.workflows.bootstrap_ready ?? 0} bootstrap-ready`}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">Tenant Registry</p>
                <p className="text-xs text-zinc-500">
                  Canonical lifecycle model: incubated, MVP validation, operational stabilization,
                  dedicated VPS, independent platform, connected client platform.
                </p>
              </div>
              <SignalPill label={data?.ssl.wildcard_domain ?? '*.op-sly.com'} tone="slate" />
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                <div>Tenant</div>
                <div>Stage</div>
                <div>Status</div>
                <div>Extraction</div>
                <div>Signals</div>
              </div>
              {tenants.map((tenant) => (
                <div
                  key={tenant.slug}
                  className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-2 border-b border-zinc-900 px-3 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-zinc-100">{tenant.name}</div>
                    <div className="text-xs text-zinc-500">{tenant.slug}</div>
                  </div>
                  <div className="text-zinc-300">{tenant.lifecycle_label}</div>
                  <div>
                    <SignalPill label={tenant.operational_status} tone={StatusTone(tenant.operational_status)} />
                  </div>
                  <div>
                    <SignalPill
                      label={tenant.extraction_ready ? 'ready' : 'blocked'}
                      tone={tenant.extraction_ready ? 'emerald' : 'rose'}
                    />
                    <div className="mt-1 text-xs text-zinc-500">{tenant.extraction_reason ?? '—'}</div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    <div>workflows {tenant.workflows_count}</div>
                    <div>backup {tenant.backup_ready ? 'yes' : 'no'}</div>
                    <div>ssl {tenant.ssl_ready ? 'yes' : 'no'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
              <p className="text-sm font-medium text-zinc-100">Core Signals</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 px-3 py-2">
                  <span className="text-zinc-400">Backups</span>
                  <SignalPill label={data?.backups.status ?? 'unknown'} tone={StatusTone(data?.backups.status ?? 'unknown')} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 px-3 py-2">
                  <span className="text-zinc-400">SSL</span>
                  <SignalPill label={data?.ssl.status ?? 'unknown'} tone={StatusTone(data?.ssl.status ?? 'unknown')} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 px-3 py-2">
                  <span className="text-zinc-400">Workflows</span>
                  <SignalPill label={data?.workflows.status ?? 'unknown'} tone={StatusTone(data?.workflows.status ?? 'unknown')} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 px-3 py-2">
                  <span className="text-zinc-400">Uptime</span>
                  <SignalPill label={data?.uptime.status ?? 'unknown'} tone={StatusTone(data?.uptime.status ?? 'unknown')} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
              <p className="text-sm font-medium text-zinc-100">AI Agents</p>
              <div className="mt-3 space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-xl border border-zinc-800/70 bg-zinc-900/50 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">{agent.name}</div>
                        <div className="text-xs text-zinc-500">
                          {agent.role} · {agent.tenant_scope}
                        </div>
                      </div>
                      <SignalPill
                        label={agent.health.status}
                        tone={StatusTone(agent.health.status)}
                      />
                    </div>
                    <div className="mt-2 text-[11px] text-zinc-500">
                      permissions: {agent.permissions.join(', ') || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Uptime Services</p>
              <p className="text-xs text-zinc-500">
                Read-only service posture for platform and AI dependencies.
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              generated {data?.generated_at ?? '—'}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <div key={service.name} className="rounded-xl border border-zinc-800/70 bg-zinc-900/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-100">{service.name}</div>
                  <SignalPill label={service.status} tone={StatusTone(service.status)} />
                </div>
                <div className="mt-2 break-all text-xs text-zinc-500">{service.url ?? '—'}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

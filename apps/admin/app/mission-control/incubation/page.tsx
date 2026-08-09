'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

import { getBaseUrl } from '@/lib/api-client';
import type { IncubationMachineSnapshot } from '@/lib/mission-control-types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toneForStatus(status: string): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (status === 'completed' || status === 'ready' || status === 'healthy') {
    return 'emerald';
  }
  if (status === 'blocked' || status === 'degraded') {
    return 'rose';
  }
  return 'amber';
}

function Pill({ label, tone }: { label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' }) {
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

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{hint}</p>
    </div>
  );
}

export default function MissionControlIncubationPage() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const [tenantSlug, setTenantSlug] = useState('peskids');

  const { data, error, isLoading } = useSWR<IncubationMachineSnapshot>(
    `${baseUrl}/api/admin/mission-control/incubation?slug=${encodeURIComponent(tenantSlug)}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const selectedTenant = data?.selected_tenant;
  const candidates = data?.candidates ?? [];
  const currentStage = data?.lifecycle.current_stage?.label ?? 'Unknown';
  const nextStage = data?.lifecycle.next_stage?.label ?? '—';
  const healthyAgents = data?.agent_governance.healthy ?? 0;
  const readyGates = data?.gates.filter((gate) => gate.satisfied).length ?? 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,24,39,0.95),_#050505_68%)] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-400">Incubation Machine</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Project Incubation Control
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              One read model for incubating projects inside Opsly: tenant selection, workflow
              bootstrap, agent governance, and extraction readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mission-control/foundation"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-cyan-500/50"
            >
              Foundation
            </Link>
            <Link
              href="/mission-control"
              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/15"
            >
              Mission Control
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            Failed to load the incubation machine.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Tenant"
            value={selectedTenant?.name ?? (isLoading ? 'loading' : 'unknown')}
            hint={selectedTenant?.slug ?? 'select a tenant to generate a plan'}
          />
          <StatCard label="Stage" value={currentStage} hint={data?.summary ?? 'waiting for data'} />
          <StatCard
            label="Extraction"
            value={selectedTenant?.extraction_ready ? 'ready' : 'blocked'}
            hint={selectedTenant?.extraction_reason ?? 'No extraction reason yet'}
          />
          <StatCard
            label="Agent health"
            value={healthyAgents}
            hint={`${data?.agent_governance.degraded ?? 0} degraded · ${data?.agent_governance.blocked ?? 0} blocked`}
          />
          <StatCard
            label="Approval gates"
            value={readyGates}
            hint={`${data?.gates.length ?? 0} total gates · next ${nextStage}`}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-100">Incubation Plan</p>
                <p className="text-xs text-zinc-500">
                  Standardized path from incubated tenant to extraction-ready platform.
                </p>
              </div>
              <div className="min-w-[220px]">
                <label className="mb-1 block text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Tenant selector
                </label>
                <select
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500/60"
                >
                  {candidates.map((candidate) => (
                    <option key={candidate.slug} value={candidate.slug}>
                      {candidate.name} ({candidate.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {data?.steps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-zinc-800/70 bg-zinc-900/45 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{step.label}</div>
                      <div className="mt-1 text-xs text-zinc-500">{step.purpose}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Pill label={step.status} tone={toneForStatus(step.status)} />
                      <Pill
                        label={step.approval_required ? 'approval' : 'auto'}
                        tone={step.approval_required ? 'amber' : 'emerald'}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                    owner: {step.owner} · reversible: {step.reversible ? 'yes' : 'no'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
              <p className="text-sm font-medium text-zinc-100">Execution Summary</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="rounded-xl border border-zinc-800/70 px-3 py-2 text-zinc-300">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Next action
                  </div>
                  <div className="mt-1">{data?.next_action ?? 'Loading...'}</div>
                </div>
                <div className="rounded-xl border border-zinc-800/70 px-3 py-2 text-zinc-300">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Current stage
                  </div>
                  <div className="mt-1">
                    {currentStage} {nextStage !== '—' ? `→ ${nextStage}` : ''}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800/70 px-3 py-2 text-zinc-300">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Bundle</div>
                  <div className="mt-1">{data?.bundle.name ?? '—'}</div>
                </div>
                <div className="rounded-xl border border-zinc-800/70 px-3 py-2 text-zinc-300">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Generated</div>
                  <div className="mt-1">{data?.generated_at ?? '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
              <p className="text-sm font-medium text-zinc-100">Standard Bundle</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data?.bundle.components.map((component) => (
                  <Pill key={component} label={component} tone="slate" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
              <p className="text-sm font-medium text-zinc-100">Approval Gates</p>
              <div className="mt-3 space-y-2">
                {data?.gates.map((gate) => (
                  <div
                    key={gate.id}
                    className="rounded-xl border border-zinc-800/70 bg-zinc-900/45 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-zinc-100">{gate.label}</div>
                      <Pill
                        label={gate.satisfied ? 'satisfied' : 'pending'}
                        tone={gate.satisfied ? 'emerald' : 'rose'}
                      />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{gate.reason ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Tenant Candidates</p>
              <p className="text-xs text-zinc-500">
                Projects already known to Opsly and ready to be put through the same machine.
              </p>
            </div>
            <p className="text-xs text-zinc-500">generated {data?.generated_at ?? '—'}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.slug}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-zinc-100">{candidate.name}</div>
                    <div className="text-xs text-zinc-500">{candidate.slug}</div>
                  </div>
                  <Pill
                    label={candidate.stage_label}
                    tone={toneForStatus(candidate.operational_status)}
                  />
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  <div>plan: {candidate.plan}</div>
                  <div>workflows: {candidate.workflows_count}</div>
                  <div>extraction: {candidate.extraction_ready ? 'ready' : 'blocked'}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

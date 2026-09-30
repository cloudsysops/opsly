'use client';

import { useMemo } from 'react';
import useSWR from 'swr';

import { getBaseUrl } from '@/lib/api-client';
import { getSessionAuthToken } from '@/lib/session-auth';
import { buildMissionControlExecutionProjectionV1 } from '@/lib/mission-control-execution-activity-v1';
import { buildStreamSafeMissionControlProjection } from '@/lib/mission-control-stream-safe-v1';

type ExecutionSourcesPayload = {
  schema_version: 'MissionControlExecutionSourcesV1';
  observed_at: string;
  registry_driven_admission: boolean;
  handoff_available: boolean;
  registered_workers: Array<{ id: string; enabled: boolean; opsly_job_type: string | null }>;
  error?: string;
};

type FactoryWorkstreamsPayload = {
  schema_version: 'MissionControlFactoryWorkstreamsV1';
  observed_at: string;
  claims_observed: boolean;
  github_observed: boolean;
  github_evidence_complete: boolean;
  runtime_sessions_observed: boolean;
  active_claims: Array<{
    claim_id: string;
    work_id: string;
    workstream: string | null;
    owner: string | null;
    state: 'active';
    conflict_key: string | null;
    semantic_scope: string | null;
    affected_paths: string[];
  }>;
  completed_claim_tombstones: number;
  pull_requests: Array<{
    work_id: string;
    agent_id: string | null;
    workstream: string | null;
    conflict_key: string | null;
    transport: 'autonomous' | 'human_relay' | 'unknown';
    pr_number: number;
    pr_url: string;
    branch: string;
    head_sha: string;
    title: string;
    draft: boolean;
    verifier: 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN';
    merge_readiness: 'READY' | 'BLOCKED' | 'UNKNOWN';
    check_state: 'PASS' | 'FAIL' | 'PENDING' | 'UNKNOWN';
    mergeable: boolean | null;
    blocker: string | null;
  }>;
  runtime_sessions: Array<{
    session_id: string;
    work_id: string | null;
    agent_id: string;
    status: 'created' | 'running' | 'checkpointed' | 'waiting_approval' | 'stopped' | 'failed' | 'resumable' | 'unknown';
    branch: string | null;
    last_seen_at: string | null;
  }>;
  errors: string[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const token = await getSessionAuthToken();
  if (!token) throw new Error('authenticated admin session required');
  const response = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

function stateClasses(state: string): string {
  if (state === 'RUNNING') return 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200';
  if (state === 'MERGE_READY') return 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100';
  if (state === 'REVIEW') return 'border-amber-400/60 bg-amber-400/10 text-amber-100';
  if (state === 'BLOCKED' || state === 'ERROR') return 'border-rose-400/60 bg-rose-400/10 text-rose-100';
  if (state === 'CLAIMED') return 'border-sky-400/50 bg-sky-400/10 text-sky-100';
  return 'border-slate-700 bg-slate-900/60 text-slate-300';
}

function avatarLabel(agent: string): string {
  const normalized = agent.toLowerCase();
  if (normalized.includes('opencode')) return 'OC';
  if (normalized.includes('qwen')) return 'QW';
  if (normalized.includes('hermes')) return 'HM';
  if (normalized.includes('review')) return 'RV';
  if (normalized.includes('doctor')) return 'DR';
  if (normalized.includes('janitor')) return 'SJ';
  if (normalized.includes('claude')) return 'CL';
  if (normalized.includes('chatgpt')) return 'GPT';
  return agent.slice(0, 3).toUpperCase();
}

export function MissionControlLiveBoard() {
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const { data: sources, error: sourcesError } = useSWR<ExecutionSourcesPayload>(
    `${baseUrl}/api/admin/mission-control/execution-sources`,
    fetchJson,
    { refreshInterval: 5000 }
  );
  const { data: factory, error: factoryError } = useSWR<FactoryWorkstreamsPayload>(
    `${baseUrl}/api/admin/mission-control/factory-workstreams`,
    fetchJson,
    { refreshInterval: 5000 }
  );

  const projection = useMemo(
    () =>
      buildStreamSafeMissionControlProjection(
        buildMissionControlExecutionProjectionV1({
        execution_sources:
          sources && !sources.error
            ? {
                registry_driven_admission: sources.registry_driven_admission,
                handoff_available: sources.handoff_available,
                registered_workers: sources.registered_workers,
              }
            : undefined,
        active_claims: factory?.active_claims,
        runtime_sessions: factory?.runtime_sessions,
        pull_requests: factory?.pull_requests,
        })
      ),
    [factory, sources]
  );

  const live = projection.activities.filter((a) => a.state === 'RUNNING').length;
  const blocked = projection.activities.filter((a) => a.state === 'BLOCKED' || a.state === 'ERROR').length;
  const review = projection.activities.filter((a) => a.state === 'REVIEW').length;
  const ready = projection.activities.filter((a) => a.state === 'MERGE_READY').length;
  const activities = projection.activities.slice(0, 8);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.16),_transparent_28%),linear-gradient(180deg,#020611_0%,#050914_55%,#02040a_100%)] p-4 lg:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1920px] flex-col gap-4">
        <header className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-5 py-4 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-400/70">OPS AFTER DARK</div>
            <h1 className="text-2xl font-semibold tracking-[0.12em] text-cyan-50 lg:text-3xl">MISSION CONTROL · LIVE</h1>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">AI SOFTWARE FACTORY · LIVE · evidence first</div>
          </div>
          <div className="flex gap-2 text-[10px] uppercase tracking-[0.14em]">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-200">Live {live}</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-amber-200">Review {review}</span>
            <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-rose-200">Blocked {blocked}</span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-cyan-100">Ready {ready}</span>
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-violet-100">Stream Safe ON</span>
          </div>
        </header>

        <section className="grid flex-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {activities.length ? activities.map((activity) => (
              <article key={`${activity.transport}:${activity.work_id}`} className={`relative overflow-hidden rounded-2xl border p-4 shadow-[0_0_30px_rgba(15,23,42,0.4)] ${stateClasses(activity.state)}`}>
                <div className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-current opacity-80" />
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-current/30 bg-black/20 font-mono text-sm font-black tracking-wider">{avatarLabel(activity.agent_id)}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{activity.agent_id}</div>
                    <div className="truncate text-[10px] uppercase tracking-[0.14em] opacity-70">{activity.workstream ?? 'workstream unknown'}</div>
                  </div>
                  <div className="ml-auto rounded-full border border-current/30 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em]">{activity.state}</div>
                </div>

                <div className="mt-4 min-h-12 text-xs text-slate-300">
                  <div className="truncate font-mono">{activity.work_id}</div>
                  <div className="mt-1 truncate text-[10px] text-slate-500">{activity.branch ?? 'branch unknown'}</div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px] uppercase tracking-[0.1em]">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2"><div className="text-slate-500">Verifier</div><div className="mt-1 font-semibold text-slate-200">{activity.verifier}</div></div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2"><div className="text-slate-500">Merge</div><div className="mt-1 font-semibold text-slate-200">{activity.merge_readiness}</div></div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2"><div className="text-slate-500">Mode</div><div className="mt-1 font-semibold text-slate-200">{activity.transport}</div></div>
                </div>
                {activity.blocker ? <div className="mt-3 line-clamp-2 rounded-lg border border-rose-400/10 bg-black/20 px-3 py-2 text-[10px] text-rose-200/80">{activity.blocker}</div> : null}
              </article>
            )) : (
              <div className="col-span-full grid min-h-72 place-items-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-500">No live execution evidence yet.</div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">Factory lanes</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {['Runtime','Reviewer','Reconciliation','QA / Evidence'].map((lane) => (
                  <div key={lane} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-slate-200">
                    <div className="mb-2 h-1 rounded-full bg-gradient-to-r from-cyan-400/70 via-violet-400/70 to-amber-300/70" />
                    {lane}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Control plane</div>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><dt className="text-slate-500">Claims</dt><dd className="font-mono text-slate-200">{factory?.active_claims.length ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Pull requests</dt><dd className="font-mono text-slate-200">{factory?.pull_requests.length ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Runtime sessions</dt><dd className="font-mono text-slate-200">{factory?.runtime_sessions.length ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Autonomous</dt><dd className="font-mono text-slate-200">{sources ? (sources.registry_driven_admission ? 'AVAILABLE' : 'NO') : 'UNKNOWN'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Human relay</dt><dd className="font-mono text-slate-200">{sources ? (sources.handoff_available ? 'AVAILABLE' : 'NO') : 'UNKNOWN'}</dd></div>
              </dl>
            </div>

            <div className="flex-1 rounded-2xl border border-violet-400/20 bg-slate-950/70 p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70">Agent crew</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {['ChatGPT · Director','Claude · Architect','OpenCode · Engineer','Qwen · Runtime','Hermes · Supervisor','PR Doctor · Repair','Reviewer · Verification','SRE Janitor · Cleanup'].map((agent) => (
                  <div key={agent} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[10px] text-slate-300">{agent}</div>
                ))}
              </div>
            </div>

            {(sourcesError || factoryError) ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[10px] text-rose-200">Data source degraded · showing last known/unknown-safe state</div> : null}
          </aside>
        </section>

        <footer className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-slate-600">
          <span>TaskGraph → DispatchClaim → Runtime → Review → Merge</span>
          <span>{factory?.observed_at ? `Observed ${new Date(factory.observed_at).toLocaleTimeString()}` : 'Waiting for evidence'}</span>
        </footer>
      </div>
    </div>
  );
}

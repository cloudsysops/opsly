'use client';

import { useMemo } from 'react';
import useSWR from 'swr';

import { getBaseUrl } from '@/lib/api-client';
import { buildMissionControlExecutionProjectionV1 } from '@/lib/mission-control-execution-activity-v1';

type ExecutionSourcesPayload = {
  schema_version: 'MissionControlExecutionSourcesV1';
  observed_at: string;
  registry_driven_admission: boolean;
  handoff_available: boolean;
  runtime_fleet_observed: boolean;
  runtime_fleet_error: string | null;
  registered_workers: Array<{
    id: string;
    enabled: boolean;
    opsly_job_type: string | null;
    runtime_state: 'LIVE' | 'UNHEALTHY' | 'UNREACHABLE' | 'UNKNOWN';
    dispatch_eligible: boolean;
    dispatch_blocker: string | null;
    health_source: string | null;
    observed_at: string | null;
  }>;
  error?: string;
};

type FactoryWorkstreamsPayload = {
  schema_version: 'MissionControlFactoryWorkstreamsV1';
  observed_at: string;
  claims_observed: boolean;
  github_observed: boolean;
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
    status:
      | 'created'
      | 'running'
      | 'checkpointed'
      | 'waiting_approval'
      | 'stopped'
      | 'failed'
      | 'resumable'
      | 'unknown';
    branch: string | null;
    last_seen_at: string | null;
  }>;
  errors: string[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const token = await getSessionAuthToken();
  const adminToken = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  const headers = new Headers({ Accept: 'application/json' });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`);
    headers.set('x-admin-token', adminToken);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function sourceTone(available: boolean, confidence: 'REAL' | 'UNKNOWN'): string {
  if (confidence === 'UNKNOWN') return 'border-slate-700 bg-slate-900/60 text-slate-400';
  return available
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    : 'border-amber-500/40 bg-amber-500/10 text-amber-200';
}

function stateTone(state: string): string {
  if (state === 'RUNNING' || state === 'MERGE_READY') return 'text-emerald-300';
  if (state === 'CLAIMED') return 'text-cyan-300';
  if (state === 'REVIEW') return 'text-amber-300';
  if (state === 'ERROR' || state === 'BLOCKED') return 'text-rose-300';
  if (state === 'IDLE') return 'text-slate-300';
  return 'text-slate-500';
}

function evidenceTone(value: string): string {
  if (value === 'PASS' || value === 'READY') return 'text-emerald-300';
  if (value === 'FAIL' || value === 'BLOCKED') return 'text-rose-300';
  return 'text-slate-500';
}

function runtimeTone(value: string): string {
  if (value === 'LIVE') return 'text-emerald-300';
  if (value === 'UNHEALTHY' || value === 'UNREACHABLE') return 'text-rose-300';
  return 'text-slate-500';
}

export function WorkstreamsExecutionPanel() {
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const {
    data: sourcesData,
    error: sourcesError,
  } = useSWR<ExecutionSourcesPayload>(
    `${baseUrl}/api/admin/mission-control/execution-sources`,
    fetchJson,
    { refreshInterval: 15000 },
  );

  const {
    data: factoryData,
    error: factoryError,
  } = useSWR<FactoryWorkstreamsPayload>(
    `${baseUrl}/api/admin/mission-control/factory-workstreams`,
    fetchJson,
    { refreshInterval: 15000 },
  );

  const projection = useMemo(
    () =>
      buildMissionControlExecutionProjectionV1({
        execution_sources: sourcesData
          ? {
              registry_driven_admission: sourcesData.registry_driven_admission,
              handoff_available: sourcesData.handoff_available,
              registered_workers: sourcesData.registered_workers,
            }
          : undefined,
        active_claims: factoryData?.active_claims,
        runtime_sessions: factoryData?.runtime_sessions,
        pull_requests: factoryData?.pull_requests,
      }),
    [factoryData, sourcesData],
  );

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Execution sources
          </h2>
          <p className="text-xs text-slate-500">
            Capability availability is separate from live session evidence.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {projection.sources.map((source) => (
            <div
              key={source.source_id}
              className={`rounded-xl border p-4 ${sourceTone(source.available, source.confidence)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-sm font-semibold">
                  {source.transport === 'autonomous'
                    ? 'Autonomous Harness'
                    : 'Human Relay Harness'}
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em]">
                  {source.confidence === 'UNKNOWN'
                    ? 'UNKNOWN'
                    : source.available
                      ? 'AVAILABLE'
                      : 'NOT IN CHECKOUT'}
                </span>
              </div>
              <div className="mt-2 text-xs opacity-80">{source.detail}</div>
            </div>
          ))}
        </div>

        {sourcesData ? (
          <div className="mt-3 text-[11px] text-slate-500">
            Registered workers:{' '}
            {sourcesData.registered_workers.filter((worker) => worker.enabled).length}
            {' · '}
            source probe {new Date(sourcesData.observed_at).toLocaleTimeString()}
          </div>
        ) : null}
        {sourcesError ? (
          <div className="mt-2 text-xs text-rose-300">
            Execution source probe unavailable: {sourcesError.message}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
              Agent fleet
            </h2>
            <p className="text-xs text-slate-500">
              Runtime health and autonomous dispatch policy are intentionally separate signals.
            </p>
          </div>
          {sourcesData ? (
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              runtime fleet {sourcesData.runtime_fleet_observed ? 'OBSERVED' : 'UNKNOWN'}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Job type</th>
                <th className="px-3 py-2 font-medium">Runtime</th>
                <th className="px-3 py-2 font-medium">Registry</th>
                <th className="px-3 py-2 font-medium">Dispatch</th>
                <th className="px-3 py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {sourcesData?.registered_workers.length ? (
                sourcesData.registered_workers.map((worker) => (
                  <tr key={worker.id} className="border-b border-slate-900 last:border-b-0">
                    <td className="px-3 py-3 font-mono text-slate-200">{worker.id}</td>
                    <td className="px-3 py-3 font-mono text-slate-400">
                      {worker.opsly_job_type ?? 'UNKNOWN'}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${runtimeTone(worker.runtime_state)}`}>
                      {worker.runtime_state}
                    </td>
                    <td className={`px-3 py-3 ${worker.enabled ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {worker.enabled ? 'ENABLED' : 'POLICY LOCK'}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${worker.dispatch_eligible ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {worker.dispatch_eligible ? 'ELIGIBLE' : 'BLOCKED'}
                      {!worker.dispatch_eligible && worker.dispatch_blocker ? (
                        <div className="mt-1 text-[10px] font-normal text-slate-600">
                          {worker.dispatch_blocker}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-slate-500">
                      {worker.health_source ?? 'UNKNOWN'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Agent fleet evidence is not available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sourcesData?.runtime_fleet_error ? (
          <div className="mt-2 text-xs text-amber-300">
            Runtime fleet degraded: {sourcesData.runtime_fleet_error}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
              Factory evidence
            </h2>
            <p className="text-xs text-slate-500">
              Dispatch claims, runtime telemetry and GitHub evidence are joined by canonical work identity.
            </p>
          </div>
          {factoryData ? (
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <span className="rounded border border-slate-800 px-2 py-1">
                claims {factoryData.active_claims.length}
              </span>
              <span className="rounded border border-slate-800 px-2 py-1">
                linked PRs {factoryData.pull_requests.length}
              </span>
              <span className="rounded border border-slate-800 px-2 py-1">
                completed {factoryData.completed_claim_tombstones}
              </span>
              <span className="rounded border border-slate-800 px-2 py-1">
                Redis {factoryData.claims_observed ? 'OBSERVED' : 'UNKNOWN'}
              </span>
              <span className="rounded border border-slate-800 px-2 py-1">
                Runtime {factoryData.runtime_sessions_observed ? 'OBSERVED' : 'UNKNOWN'}
              </span>
              <span className="rounded border border-slate-800 px-2 py-1">
                Live sessions{' '}
                {factoryData.runtime_sessions.filter(
                  (session) =>
                    session.status === 'running' || session.status === 'waiting_approval',
                ).length}
              </span>
              <span className="rounded border border-slate-800 px-2 py-1">
                GitHub {factoryData.github_observed ? 'OBSERVED' : 'UNKNOWN'}
              </span>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Work</th>
                <th className="px-3 py-2 font-medium">Workstream / lock</th>
                <th className="px-3 py-2 font-medium">Transport</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Branch / PR</th>
                <th className="px-3 py-2 font-medium">Verifier</th>
                <th className="px-3 py-2 font-medium">Merge</th>
              </tr>
            </thead>
            <tbody>
              {projection.activities.length ? (
                projection.activities.map((activity) => (
                  <tr
                    key={`${activity.transport}:${activity.work_id}`}
                    className="border-b border-slate-900 last:border-b-0"
                  >
                    <td className="px-3 py-3 font-mono text-slate-200">{activity.agent_id}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-slate-300">
                      {activity.work_id}
                    </td>
                    <td className="max-w-[240px] px-3 py-3">
                      <div className="truncate text-slate-300">
                        {activity.workstream ?? 'UNKNOWN'}
                      </div>
                      <div className="truncate font-mono text-[10px] text-slate-600">
                        {activity.conflict_key ?? 'lock UNKNOWN'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-cyan-300">{activity.transport}</td>
                    <td className={`px-3 py-3 font-semibold ${stateTone(activity.state)}`}>
                      {activity.state}
                    </td>
                    <td className="max-w-[240px] px-3 py-3">
                      <div className="truncate font-mono text-[10px] text-slate-400">
                        {activity.branch ?? 'UNKNOWN'}
                      </div>
                      {activity.pr_url ? (
                        <a
                          href={activity.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 hover:text-cyan-200"
                        >
                          PR evidence
                        </a>
                      ) : (
                        <span className="text-slate-600">PR UNKNOWN</span>
                      )}
                    </td>
                    <td className={`px-3 py-3 ${evidenceTone(activity.verifier)}`}>
                      {activity.verifier}
                    </td>
                    <td className={`px-3 py-3 ${evidenceTone(activity.merge_readiness)}`}>
                      <div>{activity.merge_readiness}</div>
                      {activity.blocker ? (
                        <div className="mt-1 max-w-[220px] text-[10px] normal-case text-slate-500">
                          {activity.blocker}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500">
                    No execution activity is currently evidenced by the canonical sources.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {factoryData ? (
          <div className="mt-2 text-[11px] text-slate-500">
            Factory evidence observed {new Date(factoryData.observed_at).toLocaleTimeString()}.
            Claims alone are shown as CLAIMED; only live runtime-session evidence becomes RUNNING.
          </div>
        ) : null}

        {factoryData?.errors.map((error) => (
          <div key={error} className="mt-2 text-xs text-amber-300">
            Factory evidence degraded: {error}
          </div>
        ))}
        {factoryError ? (
          <div className="mt-2 text-xs text-rose-300">
            Factory evidence unavailable: {factoryError.message}
          </div>
        ) : null}
      </section>
    </div>
  );
}

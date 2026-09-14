'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';

import { ComputeWorkersPanel } from '@/components/ComputeWorkersPanel';
import { SystemTopologyPanel } from '@/components/mission-control/SystemTopologyPanel';
import { WorkstreamsExecutionPanel } from '@/components/mission-control/WorkstreamsExecutionPanel';
import {
  LocalNodesPanel,
  type RuntimeNodesPayload,
} from '@/components/LocalNodesPanel';
import { getBaseUrl } from '@/lib/api-client';
import { buildMissionControlSnapshotV1 } from '@/lib/mission-control-read-model-v1';
import type {
  AgentTeamsResponse,
  OpenClawSnapshot,
  OrchestratorStatus,
} from '@/lib/mission-control-types';

type ComputeWorkerRow = {
  workerId: string;
  hostname: string;
  status: 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE';
  activeJobs: number;
  lastHeartbeat: string | null;
  gpuVendor?: string;
  gpuModel?: string;
  vramGb?: number;
};

type ComputeWorkersPayload = {
  workers?: ComputeWorkerRow[];
  queues?: Record<string, { waiting: number; active: number; failed: number }>;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }
  return (await response.json()) as T;
};

function tone(ok: boolean, warn = false): string {
  if (ok) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (warn) return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
}

function MetricCard({
  label,
  value,
  detail,
  accent = 'cyan',
}: {
  label: string;
  value: string | number;
  detail: string;
  accent?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
}) {
  const map = {
    cyan: 'text-cyan-300 border-cyan-500/30 shadow-cyan-950/30',
    emerald: 'text-emerald-300 border-emerald-500/30 shadow-emerald-950/30',
    violet: 'text-violet-300 border-violet-500/30 shadow-violet-950/30',
    amber: 'text-amber-300 border-amber-500/30 shadow-amber-950/30',
    rose: 'text-rose-300 border-rose-500/30 shadow-rose-950/30',
  }[accent];

  return (
    <div className={`rounded-xl border bg-slate-950/80 p-4 shadow-lg ${map}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function QueueRow({
  name,
  waiting,
  active,
  failed,
}: {
  name: string;
  waiting: number;
  active: number;
  failed: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-800/80 py-2 text-xs last:border-b-0">
      <span className="truncate font-mono text-slate-300">{name}</span>
      <span className="text-amber-300">W {waiting}</span>
      <span className="text-emerald-300">A {active}</span>
      <span className="text-rose-300">F {failed}</span>
    </div>
  );
}

export function MissionControlCockpit() {
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const { data: orchestratorData, error: orchestratorError } = useSWR<OrchestratorStatus>(
    `${baseUrl}/api/admin/mission-control/orchestrator`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const { data: openClawData, error: openClawError } = useSWR<OpenClawSnapshot>(
    `${baseUrl}/api/admin/mission-control/openclaw`,
    fetcher,
    { refreshInterval: 3000 },
  );
  const { data: teamsData, error: teamsError } = useSWR<AgentTeamsResponse>(
    `${baseUrl}/api/admin/mission-control/teams`,
    fetcher,
    { refreshInterval: 10000 },
  );
  const { data: runtimeData, error: runtimeError } = useSWR<RuntimeNodesPayload>(
    `${baseUrl}/api/runtime/nodes/status`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const { data: computeData, error: computeError } = useSWR<ComputeWorkersPayload>(
    `${baseUrl}/api/admin/compute-workers`,
    fetcher,
    { refreshInterval: 10000 },
  );

  const snapshot = useMemo(
    () =>
      buildMissionControlSnapshotV1({
        orchestrator: orchestratorData,
        teams: teamsData,
        openclaw: openClawData,
        runtime: runtimeData,
        compute: computeData,
        source_errors: {
          orchestrator: orchestratorError instanceof Error ? orchestratorError.message : undefined,
          teams: teamsError instanceof Error ? teamsError.message : undefined,
          openclaw: openClawError instanceof Error ? openClawError.message : undefined,
          runtime: runtimeError instanceof Error ? runtimeError.message : undefined,
          compute: computeError instanceof Error ? computeError.message : undefined,
        },
      }),
    [
      orchestratorData,
      teamsData,
      openClawData,
      runtimeData,
      computeData,
      orchestratorError,
      teamsError,
      openClawError,
      runtimeError,
      computeError,
    ],
  );

  const queueWaiting = snapshot.summary.queue_waiting;
  const queueActive = snapshot.summary.queue_active;
  const computeWorkers = computeData?.workers ?? [];
  const aiRuntimeCount = snapshot.summary.active_runtime_sessions;
  const tmuxSessionCount = runtimeData ? (runtimeData.sessionCount ?? 0) : null;
  const workerCount = Object.keys(orchestratorData?.workers ?? {}).length;
  const activeWorkerCount = Object.values(orchestratorData?.workers ?? {}).filter(
    (worker) => worker.active > 0,
  ).length;
  const teams = teamsData?.teams ?? [];
  const onlineTeams = snapshot.summary.agents_running;
  const openClawRunning = openClawData?.intents_in_progress.length ?? 0;
  const policyViolations = snapshot.summary.policy_violations;

  const healthyIdle = snapshot.summary.healthy_idle;
  const gamerOnline = computeWorkers.some((worker) => worker.status !== 'OFFLINE');
  const availableSources = snapshot.sources.filter((source) => source.available).length;
  const sourceCoverage = `${availableSources}/${snapshot.sources.length}`;
  const commandState =
    healthyIdle === null
      ? 'PARTIAL'
      : policyViolations > 0
        ? 'ATTENTION'
        : healthyIdle
          ? 'READY'
          : 'EXECUTING';

  const activity = [
    ...(openClawData?.intents ?? []).slice(0, 5).map((intent) => ({
      label: intent.intent ?? 'OpenClaw intent',
      meta: `${intent.status} · ${intent.current_stage ?? 'n/a'}`,
      when: intent.updated_at,
      tone: intent.last_error ? 'text-rose-300' : 'text-cyan-300',
    })),
    ...(teams ?? []).slice(0, 3).map((team) => ({
      label: team.lastTask ?? team.name,
      meta: `${team.status} · done ${team.completedTasks} · failed ${team.failedTasks}`,
      when: teamsData?.generated_at ?? null,
      tone: team.status === 'error' ? 'text-rose-300' : 'text-emerald-300',
    })),
  ].slice(0, 8);

  return (
    <div className="min-h-screen bg-[#02050d] text-slate-100 [background-image:radial-gradient(circle_at_20%_0%,rgba(34,211,238,.08),transparent_32%),radial-gradient(circle_at_85%_8%,rgba(139,92,246,.07),transparent_28%),linear-gradient(rgba(34,211,238,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.025)_1px,transparent_1px)] [background-size:auto,auto,32px_32px,32px_32px]">
      <div className="mx-auto max-w-[1900px] p-4 lg:p-6">
        <header className="mb-4 overflow-hidden rounded-2xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.12),transparent_34%),linear-gradient(135deg,rgba(2,6,23,.98),rgba(7,12,28,.96))] p-4 shadow-2xl shadow-cyan-950/20 lg:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                <span className="text-cyan-400">Opsly / Sierra Control</span>
                <span className="text-slate-700">•</span>
                <span className="text-violet-300">OpenClaw-style cockpit</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="digital-readout text-3xl font-semibold tracking-[0.14em] text-cyan-100 md:text-4xl">
                  MISSION CONTROL
                </h1>
                <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] ${
                  commandState === 'READY'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : commandState === 'EXECUTING'
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      : commandState === 'ATTENTION'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}>
                  {commandState}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-xs text-slate-400">
                One operational surface for factory progress, agents, queues, machines, Docker and runtime evidence.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-black/25 px-3 py-2">
                <div className="uppercase tracking-[0.14em] text-slate-600">sources</div>
                <div className="mt-1 font-mono text-cyan-200">{sourceCoverage}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-black/25 px-3 py-2">
                <div className="uppercase tracking-[0.14em] text-slate-600">queue</div>
                <div className="mt-1 font-mono text-violet-200">{queueWaiting + queueActive}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-black/25 px-3 py-2">
                <div className="uppercase tracking-[0.14em] text-slate-600">runtimes</div>
                <div className="mt-1 font-mono text-emerald-200">{aiRuntimeCount ?? 'UNKNOWN'}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-black/25 px-3 py-2">
                <div className="uppercase tracking-[0.14em] text-slate-600">violations</div>
                <div className={`mt-1 font-mono ${policyViolations ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {policyViolations}
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Mission Control command deck" className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['/mission-control/workstreams', 'WORKSTREAMS', 'claims · PRs · evidence', 'cyan'],
            ['/mission-control/system', 'SYSTEM', 'hosts · Docker · topology', 'violet'],
            ['/openclaw/ide', 'OPENCLAW IDE', 'sessions · terminal · MCP', 'emerald'],
            ['/mission-control/office', 'OFFICE', 'visual agent HQ', 'amber'],
            ['/mission-control/chat', 'CHAT', 'operator channel', 'cyan'],
          ].map(([href, label, detail, accent]) => (
            <Link
              key={href}
              href={href}
              className={`group rounded-xl border bg-slate-950/80 px-3 py-3 transition hover:-translate-y-0.5 ${
                accent === 'violet'
                  ? 'border-violet-500/25 hover:border-violet-400/60'
                  : accent === 'emerald'
                    ? 'border-emerald-500/25 hover:border-emerald-400/60'
                    : accent === 'amber'
                      ? 'border-amber-500/25 hover:border-amber-400/60'
                      : 'border-cyan-500/25 hover:border-cyan-400/60'
              }`}
            >
              <div className="font-mono text-xs font-semibold tracking-[0.12em] text-slate-200 group-hover:text-white">
                {label}
              </div>
              <div className="mt-1 text-[10px] text-slate-600">{detail}</div>
            </Link>
          ))}
        </nav>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <MetricCard label="Agents running" value={onlineTeams} detail={`${teams.length} historical team records`} accent="cyan" />
          <MetricCard
            label="AI runtimes"
            value={aiRuntimeCount ?? 'UNKNOWN'}
            detail={
              healthyIdle === null
                ? 'runtime evidence unavailable'
                : healthyIdle
                  ? 'healthy idle'
                  : 'runtime activity detected'
            }
            accent="emerald"
          />
          <MetricCard label="Tasks in queue" value={queueWaiting} detail={`${queueActive} active`} accent="violet" />
          <MetricCard label="Workers" value={workerCount} detail={`${activeWorkerCount} active now`} accent="amber" />
          <MetricCard label="tmux sessions" value={tmuxSessionCount ?? 'UNKNOWN'} detail="ephemeral runtime sessions" accent="cyan" />
          <MetricCard label="OpenClaw intents" value={openClawRunning} detail={`${policyViolations} recent violations`} accent={policyViolations > 0 ? 'rose' : 'emerald'} />
          <MetricCard
            label="System"
            value={healthyIdle === null ? 'UNKNOWN' : healthyIdle ? 'IDLE' : 'BUSY'}
            detail={
              healthyIdle === null
                ? 'insufficient runtime evidence'
                : healthyIdle
                  ? '0 AI runtimes is healthy'
                  : 'work in progress'
            }
            accent={healthyIdle === null ? 'amber' : healthyIdle ? 'emerald' : 'amber'}
          />
        </section>

        <div className="mb-5">
          <SystemTopologyPanel runtime={runtimeData} compute={computeData} compact />
        </div>

        <section className="mb-5 rounded-2xl border border-cyan-500/15 bg-slate-950/55 p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
                Software Factory
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">
                Audit & evolution
              </h2>
              <p className="text-xs text-slate-500">
                Workstreams, agent fleet, evidence, blockers and the next safe improvements.
              </p>
            </div>
            <Link
              href="/mission-control/workstreams"
              className="text-xs text-cyan-300 hover:text-cyan-200"
            >
              Full workstream view →
            </Link>
          </div>
          <WorkstreamsExecutionPanel />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-violet-500/20 bg-slate-950/75 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-violet-400/70">Execution</div>
                <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">Queue & runtimes</h2>
              </div>
              <span className="font-mono text-xs text-violet-300">{queueWaiting + queueActive} open</span>
            </div>
            {snapshot.queues.slice(0, 7).map((queue) => (
              <QueueRow key={queue.queue} name={queue.queue} waiting={queue.waiting} active={queue.active} failed={queue.failed} />
            ))}
            {snapshot.queues.length === 0 ? <div className="py-3 text-xs text-slate-500">Queue evidence UNKNOWN.</div> : null}
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/75 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/70">Runtime</div>
                <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">Health invariant</h2>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${tone(healthyIdle === true, healthyIdle === false)}`}>
                {healthyIdle === null ? 'UNKNOWN' : healthyIdle ? 'HEALTHY IDLE' : 'ACTIVE'}
              </span>
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-500">AI runtimes</span><span className="font-mono text-slate-200">{aiRuntimeCount ?? 'UNKNOWN'}</span></div>
              <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-500">tmux sessions</span><span className="font-mono text-slate-200">{tmuxSessionCount ?? 'UNKNOWN'}</span></div>
              <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-500">OpenClaw intents</span><span className="font-mono text-slate-200">{openClawRunning}</span></div>
              <div className="flex justify-between py-2"><span className="text-slate-500">policy violations</span><span className={`font-mono ${policyViolations ? 'text-rose-300' : 'text-emerald-300'}`}>{policyViolations}</span></div>
            </div>
            <Link href="/openclaw/ide" className="mt-4 block rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-emerald-300 hover:border-emerald-400/50">
              Open runtime console →
            </Link>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/75 p-4">
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/70">Feed</div>
              <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">System activity</h2>
            </div>
            <div className="space-y-2">
              {activity.length ? activity.map((row, index) => (
                <div key={`${row.label}-${index}`} className="rounded-lg border border-slate-800/80 bg-black/20 p-2 text-xs">
                  <div className={`font-mono ${row.tone}`}>{row.label}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{row.meta}</div>
                  {row.when ? <div className="text-[10px] text-slate-600">{new Date(row.when).toLocaleTimeString()}</div> : null}
                </div>
              )) : <div className="text-xs text-slate-500">No live activity reported yet.</div>}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-950/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Node detail</h2>
                <p className="text-xs text-slate-500">Live local runtime and capability registry.</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{runtimeData?.timestamp ? new Date(runtimeData.timestamp).toLocaleTimeString() : 'waiting'}</span>
            </div>
            <LocalNodesPanel />
          </div>

          <div className="rounded-2xl border border-violet-500/15 bg-slate-950/70 p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Compute detail</h2>
              <p className="text-xs text-slate-500">PC Gamer / GPU workers and media queue.</p>
            </div>
            <ComputeWorkersPanel />

            <div className="mt-4 rounded-xl border border-slate-800 bg-black/20 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Real runtimes</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {[
                  ['Hermes', 'planning'],
                  ['OpenCode', 'implementation'],
                  ['Codex CLI', 'debug/integration'],
                  ['Claude Code', 'review/architecture'],
                  ['Goose', 'fallback/tools'],
                  ['OpenClaw', 'auxiliary'],
                ].map(([name, role]) => (
                  <div key={name} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                    <div className="font-mono text-slate-200">{name}</div>
                    <div className="text-[10px] text-slate-500">{role}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600">
                Catalog only. These are not counted as running unless runtime/session telemetry reports them.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-5 flex flex-col gap-2 border-t border-cyan-500/10 py-4 text-[10px] uppercase tracking-[0.16em] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Multi-cloud · multi-runtime · one control plane</span>
          <span>
            {gamerOnline ? 'compute online' : 'compute not reporting'} ·{' '}
            {healthyIdle === null ? 'runtime state unknown' : healthyIdle ? 'ready for work' : 'work executing'}
          </span>
        </footer>
      </div>
    </div>
  );
}

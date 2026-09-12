'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';

import { ComputeWorkersPanel } from '@/components/ComputeWorkersPanel';
import {
  LocalNodesPanel,
  type RuntimeNodesPayload,
} from '@/components/LocalNodesPanel';
import { getBaseUrl } from '@/lib/api-client';
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

function NodeChip({
  name,
  role,
  online,
  detail,
}: {
  name: string;
  role: string;
  online: boolean;
  detail: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone(online)}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-semibold text-slate-100">{name}</div>
          <div className="text-[11px] text-slate-500">{role}</div>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      </div>
      <div className="mt-2 text-[11px] text-slate-400">{detail}</div>
    </div>
  );
}

function CloudChip({
  name,
  role,
  state,
}: {
  name: string;
  role: string;
  state: 'connected' | 'configured' | 'planned';
}) {
  const connected = state === 'connected';
  const configured = state === 'configured';
  return (
    <div
      className={`rounded-xl border p-3 ${
        connected
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : configured
            ? 'border-cyan-500/30 bg-cyan-500/10'
            : 'border-slate-700 bg-slate-900/70'
      }`}
    >
      <div className="font-mono text-sm text-slate-100">{name}</div>
      <div className="text-[11px] text-slate-500">{role}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">{state}</div>
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

  const { data: orchestratorData } = useSWR<OrchestratorStatus>(
    `${baseUrl}/api/admin/mission-control/orchestrator`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const { data: openClawData } = useSWR<OpenClawSnapshot>(
    `${baseUrl}/api/admin/mission-control/openclaw`,
    fetcher,
    { refreshInterval: 3000 },
  );
  const { data: teamsData } = useSWR<AgentTeamsResponse>(
    `${baseUrl}/api/admin/mission-control/teams`,
    fetcher,
    { refreshInterval: 10000 },
  );
  const { data: runtimeData } = useSWR<RuntimeNodesPayload>(
    `${baseUrl}/api/runtime/nodes/status`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const { data: computeData } = useSWR<ComputeWorkersPayload>(
    `${baseUrl}/api/admin/compute-workers`,
    fetcher,
    { refreshInterval: 10000 },
  );

  const queueWaiting = orchestratorData?.queue.waiting ?? 0;
  const queueActive = orchestratorData?.queue.active ?? 0;
  const queueFailed = orchestratorData?.queue.failed ?? 0;
  const nodes = runtimeData?.nodes ?? [];
  const computeWorkers = computeData?.workers ?? [];
  const aiRuntimeCount = runtimeData?.sessionSummary?.running ?? 0;
  const tmuxSessionCount = runtimeData?.sessionCount ?? 0;
  const workerCount = Object.keys(orchestratorData?.workers ?? {}).length;
  const activeWorkerCount = Object.values(orchestratorData?.workers ?? {}).filter(
    (worker) => worker.active > 0,
  ).length;
  const teams = teamsData?.teams ?? [];
  const onlineTeams = teams.filter((team) => team.status === 'active').length;
  const openClawRunning = openClawData?.intents_in_progress.length ?? 0;
  const policyViolations = openClawData?.recent_policy_violations.length ?? 0;

  const healthyIdle =
    aiRuntimeCount === 0 &&
    tmuxSessionCount === 0 &&
    queueActive === 0 &&
    policyViolations === 0;

  const runtimeQueues = runtimeData?.queues ?? [];
  const totalDepth = runtimeQueues.reduce((sum, q) => sum + q.depth, 0);
  const localNodeOnline = nodes.length > 0 && nodes.every((node) => node.redisConnected);
  const gamerOnline = computeWorkers.some((worker) => worker.status !== 'OFFLINE');

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
    <div className="min-h-screen bg-[#030712] text-slate-100">
      <div className="mx-auto max-w-[1800px] p-4 lg:p-6">
        <header className="mb-5 flex flex-col gap-4 border-b border-cyan-500/15 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="digital-readout text-3xl font-semibold tracking-[0.16em] text-cyan-100 md:text-4xl">
                MISSION CONTROL
              </h1>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                LIVE
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-cyan-400/80">
              Opsly · real runtime orchestration · OpenClaw compatible
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/mission-control/office" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 hover:border-cyan-500/50">
              Office
            </Link>
            <Link href="/mission-control/chat" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 hover:border-cyan-500/50">
              Chat
            </Link>
            <Link href="/mission-control/foundation" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 hover:border-cyan-500/50">
              Foundation
            </Link>
            <Link href="/mission-control/incubation" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 hover:border-cyan-500/50">
              Incubation
            </Link>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <MetricCard label="Agents online" value={onlineTeams} detail={`${teams.length} team records`} accent="cyan" />
          <MetricCard label="AI runtimes" value={aiRuntimeCount} detail={healthyIdle ? 'healthy idle' : 'runtime activity detected'} accent="emerald" />
          <MetricCard label="Tasks in queue" value={queueWaiting + totalDepth} detail={`${queueActive} active`} accent="violet" />
          <MetricCard label="Workers" value={workerCount} detail={`${activeWorkerCount} active now`} accent="amber" />
          <MetricCard label="tmux sessions" value={tmuxSessionCount} detail="ephemeral runtime sessions" accent="cyan" />
          <MetricCard label="OpenClaw intents" value={openClawRunning} detail={`${policyViolations} recent violations`} accent={policyViolations > 0 ? 'rose' : 'emerald'} />
          <MetricCard label="System" value={healthyIdle ? 'IDLE' : 'BUSY'} detail={healthyIdle ? '0 AI runtimes is healthy' : 'work in progress'} accent={healthyIdle ? 'emerald' : 'amber'} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/75 p-4 shadow-2xl shadow-cyan-950/20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Live topology</h2>
                <p className="text-xs text-slate-500">Only current API/runtime evidence is shown as connected.</p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${tone(localNodeOnline)}`}>
                {localNodeOnline ? 'control path healthy' : 'partial telemetry'}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
              <div className="space-y-3">
                <NodeChip
                  name="VPS / Control Plane"
                  role="BullMQ · policy · orchestrator"
                  online={Boolean(orchestratorData)}
                  detail={orchestratorData ? `mode ${orchestratorData.mode} · role ${orchestratorData.role}` : 'not reporting'}
                />
                {nodes.map((node) => (
                  <NodeChip
                    key={node.id}
                    name={node.hostname}
                    role="Mac/local execution node"
                    online={node.redisConnected}
                    detail={`CPU ${node.cpuPercent}% · RAM ${node.ramPercent}% · tmux ${node.tmuxSessions.length}`}
                  />
                ))}
                {computeWorkers.map((worker) => (
                  <NodeChip
                    key={worker.workerId}
                    name={worker.hostname}
                    role="PC Gamer / compute worker"
                    online={worker.status !== 'OFFLINE'}
                    detail={`${worker.status} · active jobs ${worker.activeJobs}${worker.gpuModel ? ` · ${worker.gpuModel}` : ''}`}
                  />
                ))}
              </div>

              <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_38%),linear-gradient(180deg,rgba(15,23,42,.9),rgba(2,6,23,.95))]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.1)_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="absolute h-72 w-72 rounded-full border border-cyan-500/20" />
                <div className="absolute h-56 w-56 rounded-full border border-violet-500/20" />
                <div className="absolute h-40 w-40 rounded-full border border-emerald-500/20" />
                <div className="relative z-10 w-44 rounded-2xl border border-cyan-400/50 bg-slate-950/95 p-5 text-center shadow-[0_0_60px_rgba(34,211,238,.2)]">
                  <div className="digital-readout text-lg text-cyan-200">OPSLY</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Control Plane</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded border border-violet-500/30 bg-violet-500/10 p-2 text-violet-200">BullMQ</div>
                    <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-200">Policy</div>
                    <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-200">Session Mgr</div>
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">Evidence</div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-center gap-2 text-[10px] text-slate-500">
                  <span>AgentTaskEnvelopeV1</span><span>→</span><span>tmux ephemeral</span><span>→</span><span>real runtime</span><span>→</span><span>teardown</span>
                </div>
              </div>

              <div className="space-y-3">
                <CloudChip name="Supabase" role="transactional data" state="connected" />
                <CloudChip name="Cloudflare R2" role="evidence / artifacts" state="planned" />
                <CloudChip name="GCP BigQuery" role="analytics / telemetry" state="planned" />
                <CloudChip name="GCP Cloud Run" role="stateless integrations" state="planned" />
                <CloudChip name="Oracle DR" role="backup observer" state="planned" />
                <CloudChip name="AWS" role="optional integrations" state="planned" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-violet-500/20 bg-slate-950/75 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Queue & runtimes</h2>
                  <p className="text-xs text-slate-500">BullMQ and ephemeral execution state.</p>
                </div>
                <span className="font-mono text-xs text-violet-300">{queueWaiting + queueActive} open</span>
              </div>
              <QueueRow name="orchestrator" waiting={queueWaiting} active={queueActive} failed={queueFailed} />
              {runtimeQueues.slice(0, 6).map((queue) => (
                <QueueRow key={queue.name} name={queue.name} waiting={queue.waiting} active={queue.active} failed={queue.failed} />
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/75 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Runtime health</h2>
                  <p className="text-xs text-slate-500">Healthy idle is a first-class invariant.</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${tone(healthyIdle, !healthyIdle)}`}>
                  {healthyIdle ? 'HEALTHY IDLE' : 'ACTIVE'}
                </span>
              </div>
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-500">AI runtimes</span><span className="font-mono text-slate-200">{aiRuntimeCount}</span></div>
                <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-500">tmux sessions</span><span className="font-mono text-slate-200">{tmuxSessionCount}</span></div>
                <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-500">OpenClaw in progress</span><span className="font-mono text-slate-200">{openClawRunning}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-500">policy violations</span><span className={`font-mono ${policyViolations ? 'text-rose-300' : 'text-emerald-300'}`}>{policyViolations}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/75 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">System activity</h2>
              <div className="mt-3 space-y-2">
                {activity.length ? activity.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="rounded-lg border border-slate-800/80 bg-black/20 p-2 text-xs">
                    <div className={`font-mono ${row.tone}`}>{row.label}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{row.meta}</div>
                    {row.when ? <div className="text-[10px] text-slate-600">{new Date(row.when).toLocaleTimeString()}</div> : null}
                  </div>
                )) : <div className="text-xs text-slate-500">No live activity reported yet.</div>}
              </div>
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
          <span>{gamerOnline ? 'compute online' : 'compute not reporting'} · {healthyIdle ? 'ready for work' : 'work executing'}</span>
        </footer>
      </div>
    </div>
  );
}

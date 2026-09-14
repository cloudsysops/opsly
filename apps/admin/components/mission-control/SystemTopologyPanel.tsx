'use client';

import Link from 'next/link';
import useSWR from 'swr';

import {
  getAdminOverview,
  getDockerContainers,
  getDockerResources,
  getMissionControlComputeWorkers,
  getMissionControlExecutionSources,
  getMissionControlRuntimeNodes,
} from '@/lib/api-client';
import type { RuntimeNodesPayload } from '@/components/LocalNodesPanel';

type ComputeWorker = {
  workerId: string;
  hostname: string;
  status: 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE';
  activeJobs: number;
  lastHeartbeat: string | null;
  gpuModel?: string;
  vramGb?: number;
  dockerContainers?: number;
};

type ComputePayload = {
  workers?: ComputeWorker[];
};

type ExecutionSourcesPayload = {
  registered_workers?: Array<{
    id: string;
    enabled: boolean;
    opsly_job_type: string | null;
    runtime_state?: string;
    dispatch_eligible?: boolean;
    dispatch_blocker?: string | null;
  }>;
  runtime_fleet_observed?: boolean;
};

type Props = {
  runtime?: RuntimeNodesPayload;
  compute?: ComputePayload;
  compact?: boolean;
};

const architecture = [
  { id: 'traefik', label: 'Traefik', role: 'edge / TLS / routing', match: ['traefik'] },
  { id: 'admin', label: 'Admin', role: 'Mission Control UI', match: ['opsly_admin', 'intcloudsysops-admin'] },
  { id: 'api', label: 'API', role: 'platform BFF / read models', match: ['infra-app-', 'intcloudsysops-api'] },
  { id: 'orchestrator', label: 'Orchestrator', role: 'claims / queues / runtime', match: ['opsly_orchestrator', 'intcloudsysops-orchestrator'] },
  { id: 'redis', label: 'Redis', role: 'BullMQ / claims / heartbeats', match: ['infra-redis-', 'redis:7-alpine'] },
  { id: 'llm', label: 'LLM Gateway', role: 'models / usage / routing', match: ['opsly_llm_gateway', 'intcloudsysops-llm-gateway'] },
  { id: 'mcp', label: 'MCP', role: 'tool bridge / integrations', match: ['opsly_mcp', 'intcloudsysops-mcp'] },
  { id: 'context', label: 'Context Builder', role: 'context assembly', match: ['opsly_context_builder', 'intcloudsysops-context-builder'] },
  { id: 'portal', label: 'Portal', role: 'tenant/user surface', match: ['opsly_portal', 'intcloudsysops-portal'] },
  { id: 'prometheus', label: 'Prometheus', role: 'metrics TSDB', match: ['opsly_prometheus', 'prometheus'] },
  { id: 'node-exporter', label: 'Node Exporter', role: 'host metrics', match: ['node_exporter', 'node-exporter'] },
];

function statusTone(state: string) {
  if (/RUNNING|ONLINE|BUSY/.test(state)) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (/STOPPED|EXITED|DEAD|ERROR|OFFLINE/.test(state)) {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  }
  return 'border-slate-700 bg-slate-900/70 text-slate-400';
}

function pct(value: number | null | undefined) {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : 'UNKNOWN';
}

export function SystemTopologyPanel({ runtime, compute, compact = false }: Props) {
  const { data: runtimeFetched } = useSWR<RuntimeNodesPayload>(
    runtime ? null : 'mission-control-system-runtime',
    () => getMissionControlRuntimeNodes<RuntimeNodesPayload>(),
    { refreshInterval: 5000 },
  );
  const { data: computeFetched } = useSWR<ComputePayload>(
    compute ? null : 'mission-control-system-compute',
    () => getMissionControlComputeWorkers<ComputePayload>(),
    { refreshInterval: 5000 },
  );
  const { data: executionSources, error: executionSourcesError } = useSWR<ExecutionSourcesPayload>(
    'mission-control-system-execution-sources',
    () => getMissionControlExecutionSources<ExecutionSourcesPayload>(),
    { refreshInterval: 5000 },
  );
  const runtimeData = runtime ?? runtimeFetched;
  const computeData = compute ?? computeFetched;

  const { data: overview, error: overviewError } = useSWR('mission-control-overview', getAdminOverview, {
    refreshInterval: 5000,
  });
  const { data: docker, error: dockerError } = useSWR(
    'mission-control-docker',
    getDockerContainers,
    { refreshInterval: 5000 },
  );
  const { data: resources, error: resourcesError } = useSWR(
    'mission-control-docker-resources',
    getDockerResources,
    { refreshInterval: 5000 },
  );

  const resourceByName = new Map(
    (resources?.containers ?? []).map((row) => [row.name.replace(/^\//, ''), row]),
  );
  const containers = docker?.containers ?? [];
  const observed = docker?.docker_available === true;

  const architectureRows = architecture.map((service) => {
    const container = containers.find((row) => {
      const names = row.names.map((name) => name.toLowerCase());
      const image = row.image.toLowerCase();
      return service.match.some((needle) => {
        const key = needle.toLowerCase();
        return names.some((name) => name.includes(key)) || image.includes(key);
      });
    });
    const name = container?.names[0] ?? null;
    const resource = name ? resourceByName.get(name) : undefined;
    return {
      ...service,
      container,
      resource,
      state: !observed ? 'UNKNOWN' : container ? container.state.toUpperCase() : 'UNKNOWN',
    };
  });

  const machines = [
    ...(runtimeData?.nodes ?? []).map((node) => ({
      id: node.id,
      host: node.hostname,
      type: 'runtime node',
      state: node.redisConnected ? 'ONLINE' : 'DEGRADED',
      detail: `CPU ${node.cpuPercent}% · RAM ${node.ramPercent}% · tmux ${node.tmuxSessions.length}`,
    })),
    ...(computeData?.workers ?? []).map((worker) => ({
      id: worker.workerId,
      host: worker.hostname,
      type: 'compute worker',
      state: worker.status,
      detail: `${worker.activeJobs} jobs · Docker ${worker.dockerContainers ?? 'UNKNOWN'}${worker.gpuModel ? ` · ${worker.gpuModel}` : ''}`,
    })),
  ];

  const vps = overview?.vps_host;
  const vpsObserved = Boolean(vps && vps.mock !== true);
  const degraded = Boolean(
    overviewError ||
      dockerError ||
      resourcesError ||
      docker?.error ||
      resources?.error ||
      (vps && vps.mock === true) ||
      executionSourcesError,
  );
  const runningContainers = containers.filter((row) => row.state === 'running').length;

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-950/75 p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
            Sierra Control · System topology
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">
            Software + machines + Docker
          </h2>
          <p className="text-xs text-slate-500">
            One read-only operational view across control-plane services, hosts and containers.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/mission-control/system"
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200"
          >
            Full system view
          </Link>
          <Link
            href="/openclaw/ide"
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300"
          >
            OpenClaw IDE
          </Link>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">VPS CPU</div>
          <div className="mt-1 font-mono text-xl text-cyan-200">
            {vpsObserved && vps ? pct(vps.cpu_percent) : 'UNKNOWN'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">VPS RAM</div>
          <div className="mt-1 font-mono text-xl text-cyan-200">
            {vpsObserved && vps ? `${vps.ram_used_gb.toFixed(1)}/${vps.ram_total_gb.toFixed(1)} GB` : 'UNKNOWN'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">VPS disk</div>
          <div className="mt-1 font-mono text-xl text-cyan-200">
            {vpsObserved && vps ? `${vps.disk_used_gb.toFixed(0)}/${vps.disk_total_gb.toFixed(0)} GB` : 'UNKNOWN'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Containers</div>
          <div className="mt-1 font-mono text-xl text-emerald-300">
            {observed ? `${runningContainers}/${containers.length}` : 'UNKNOWN'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Machines</div>
          <div className="mt-1 font-mono text-xl text-violet-300">{machines.length}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
          <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Evidence</div>
          <div className={`mt-1 font-mono text-xl ${degraded ? 'text-amber-300' : 'text-emerald-300'}`}>
            {degraded ? 'PARTIAL' : 'LIVE'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Software architecture
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {architectureRows.map((service) => (
              <div
                key={service.id}
                className={`rounded-xl border p-3 ${statusTone(service.state)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-sm text-slate-100">{service.label}</div>
                    <div className="text-[10px] text-slate-500">{service.role}</div>
                  </div>
                  <span className="text-[10px] font-semibold">{service.state}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <span>CPU {pct(service.resource?.cpu_percent)}</span>
                  <span>RAM {pct(service.resource?.memory_percent)}</span>
                  <span>PIDs {service.resource?.pids ?? 'UNKNOWN'}</span>
                  <span className="truncate">{service.container?.image ?? 'not observed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Machines
          </div>
          <div className="space-y-2">
            {machines.length ? (
              machines.map((machine) => (
                <div key={machine.id} className="rounded-xl border border-slate-800 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm text-slate-200">{machine.host}</div>
                      <div className="text-[10px] text-slate-600">{machine.type}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[10px] ${statusTone(machine.state)}`}>
                      {machine.state}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">{machine.detail}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-800 bg-black/20 p-4 text-xs text-slate-500">
                Machine evidence UNKNOWN.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Agent runtimes
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(executionSources?.registered_workers ?? []).map((agent) => {
            const runtimeState = agent.runtime_state ?? 'UNKNOWN';
            const dispatchState =
              agent.dispatch_eligible === true
                ? 'ELIGIBLE'
                : agent.dispatch_eligible === false
                  ? 'BLOCKED'
                  : 'UNKNOWN';
            return (
              <div key={agent.id} className="rounded-xl border border-slate-800 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-sm text-slate-200">{agent.id}</div>
                    <div className="text-[10px] text-slate-600">
                      {agent.opsly_job_type ?? 'job type UNKNOWN'}
                    </div>
                  </div>
                  <span className={`rounded border px-2 py-1 text-[10px] ${statusTone(runtimeState)}`}>
                    {runtimeState}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                  <span>{agent.enabled ? 'REGISTRY ENABLED' : 'POLICY LOCKED'}</span>
                  <span>{dispatchState}</span>
                </div>
                {agent.dispatch_blocker ? (
                  <div className="mt-1 text-[10px] text-amber-300">{agent.dispatch_blocker}</div>
                ) : null}
              </div>
            );
          })}
          {!executionSources?.registered_workers?.length ? (
            <div className="rounded-xl border border-slate-800 bg-black/20 p-4 text-xs text-slate-500">
              Agent runtime evidence UNKNOWN.
            </div>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-black/20">
          <table className="min-w-[1000px] w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Container</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Image</th>
                <th className="px-3 py-2">CPU</th>
                <th className="px-3 py-2">Memory</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">PIDs</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => {
                const name = container.names[0] ?? container.id;
                const resource = resourceByName.get(name);
                return (
                  <tr key={container.id} className="border-b border-slate-900 last:border-b-0">
                    <td className="px-3 py-2 font-mono text-slate-200">{name}</td>
                    <td className="px-3 py-2">{container.state}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{container.image}</td>
                    <td className="px-3 py-2">{pct(resource?.cpu_percent)}</td>
                    <td className="px-3 py-2">
                      {resource?.memory_usage || 'UNKNOWN'}
                      {resource?.memory_percent != null ? ` · ${pct(resource.memory_percent)}` : ''}
                    </td>
                    <td className="px-3 py-2">{resource?.net_io || 'UNKNOWN'}</td>
                    <td className="px-3 py-2">{resource?.pids ?? 'UNKNOWN'}</td>
                  </tr>
                );
              })}
              {!containers.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Docker evidence is not available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {degraded ? (
        <div className="mt-3 text-xs text-amber-300">
          Some system sources are degraded. Missing evidence remains UNKNOWN.
        </div>
      ) : null}
    </section>
  );
}

'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { getBaseUrl } from '@/lib/api-client';
import type {
  PoppingSubagentCatalog,
  PoppingSubagentPlanStage,
  PoppingSubagentRole,
} from '@/lib/mission-control-types';

export interface RuntimeTmuxSession {
  name: string;
  running: boolean;
}

export interface RuntimeLocalNode {
  id: string;
  hostname: string;
  os: string;
  cpuCores: number;
  cpuPercent: number;
  ramGb: number;
  ramPercent: number;
  diskFreeGb: number;
  diskPercent: number;
  gpuAvailable: boolean;
  tmuxSessions: RuntimeTmuxSession[];
  redisConnected: boolean;
  workers: {
    label: string;
    pid: number;
    uptimeSec: number;
    lastJobTime: string | null;
    memoryMb: number;
  }[];
}

export interface RuntimeQueueSnapshot {
  name: string;
  waiting: number;
  active: number;
  depth: number;
  completed: number;
  failed: number;
}

export interface RuntimeCapability {
  id: string;
  label: string;
  category: 'opsly' | 'runtime' | 'editor' | 'agent' | 'coordination';
  presence: 'available' | 'unavailable' | 'unknown';
  recommended: boolean;
  reason: string;
  evidence: string[];
}

export interface RuntimeCapabilityRegistry {
  generatedAt: string;
  summary: string;
  machine: {
    os: string;
    cpuCores: number;
    ramGb: number;
    gpuAvailable: boolean;
    topologyType: string;
    dockerEngine: string;
    maxLocalWorkers: number;
    cloudRole: string;
  };
  capabilities: RuntimeCapability[];
  detectedEditors: string[];
  detectedAgents: string[];
}

export interface RuntimeSessionSummary {
  total: number;
  created: number;
  running: number;
  checkpointed: number;
  waitingApproval: number;
  stopped: number;
  failed: number;
  resumable: number;
}

export interface RuntimeNodesPayload {
  ok: boolean;
  timestamp: string;
  nodes: RuntimeLocalNode[];
  queues: RuntimeQueueSnapshot[];
  sessionCount: number;
  sessionSummary: RuntimeSessionSummary;
  capabilities: RuntimeCapabilityRegistry;
  dryRun: boolean;
  error?: string;
}

export interface RuntimePoppingSubagentsPayload {
  ok: boolean;
  generated_at: string;
  catalog: PoppingSubagentCatalog;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return (await response.json()) as T;
}

const runtimeNodesFetcher = (url: string) => fetchJson<RuntimeNodesPayload>(url);
const poppingSubagentsFetcher = (url: string) => fetchJson<RuntimePoppingSubagentsPayload>(url);

function metricTone(percent: number): string {
  if (percent >= 85) return 'bg-red-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function MetricBar({ label, percent }: { label: string; percent: number }) {
  const tone = metricTone(percent);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="font-mono">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div
          className={`h-2 rounded-full ${tone}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
      }`}
    >
      {label}
    </span>
  );
}

function TmuxSection({ sessions }: { sessions: RuntimeTmuxSession[] }) {
  return (
    <section>
      <p className="mb-1 text-xs font-medium text-zinc-400">tmux sessions</p>
      <div className="flex flex-wrap gap-2">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <StatusPill key={session.name} ok={session.running} label={session.name} />
          ))
        ) : (
          <span className="text-xs text-zinc-500">No tmux sessions reported</span>
        )}
      </div>
    </section>
  );
}

function WorkersSection({ workers }: { workers: RuntimeLocalNode['workers'] }) {
  return (
    <section>
      <p className="mb-1 text-xs font-medium text-zinc-400">Workers</p>
      <ul className="space-y-1 font-mono text-xs text-zinc-300">
        {workers.length > 0 ? (
          workers.map((worker) => (
            <li key={`${worker.label}-${worker.pid}`}>
              {worker.label} pid={worker.pid} uptime={worker.uptimeSec}s mem={worker.memoryMb}MB
            </li>
          ))
        ) : (
          <li className="text-zinc-500">No workers reported</li>
        )}
      </ul>
    </section>
  );
}

function Badge({ tone, children }: { tone: 'emerald' | 'amber' | 'zinc'; children: ReactNode }) {
  const colors =
    tone === 'emerald'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : tone === 'amber'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        : 'bg-zinc-800 text-zinc-300 border-zinc-700';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${colors}`}>{children}</span>
  );
}

function CapabilityRegistryPanel({ registry }: { registry: RuntimeCapabilityRegistry }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-black/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-100">Capability Registry</p>
          <p className="text-xs text-zinc-500">{registry.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="emerald">{registry.machine.topologyType}</Badge>
          <Badge tone="amber">{registry.machine.dockerEngine}</Badge>
          <Badge tone="zinc">{registry.machine.maxLocalWorkers} workers</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {registry.capabilities.slice(0, 10).map((capability) => (
          <div key={capability.id} className="rounded border border-zinc-800/70 bg-zinc-950/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-200">{capability.label}</p>
              <Badge
                tone={
                  capability.presence === 'available'
                    ? 'emerald'
                    : capability.presence === 'unknown'
                      ? 'amber'
                      : 'zinc'
                }
              >
                {capability.presence}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">{capability.reason}</p>
            {capability.recommended ? (
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                recommended
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionSummaryPanel({ summary }: { summary: RuntimeSessionSummary }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-black/40 p-3">
      <p className="text-sm font-medium text-zinc-100">Session Lifecycle</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-300 sm:grid-cols-4">
        <Badge tone="zinc">total {summary.total}</Badge>
        <Badge tone="emerald">running {summary.running}</Badge>
        <Badge tone="amber">resumable {summary.resumable}</Badge>
        <Badge tone="zinc">stopped {summary.stopped}</Badge>
        <Badge tone="zinc">checkpointed {summary.checkpointed}</Badge>
        <Badge tone="zinc">failed {summary.failed}</Badge>
      </div>
    </section>
  );
}

function PoppingSubagentsPanel({ catalog }: { catalog: PoppingSubagentCatalog }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-black/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-100">Popping subagents</p>
          <p className="text-xs text-zinc-500">
            {catalog.limits.maxPoppingSubagents} max, {catalog.limits.maxActivePoppingSubagents}{' '}
            active,
            {` ${catalog.limits.defaultTimeoutMinutes}m timeout`}
          </p>
        </div>
        <Badge tone="emerald">sequential</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.activeDefaultRoles.map((role: PoppingSubagentPlanStage | PoppingSubagentRole) => (
          <div key={role.id} className="rounded border border-zinc-800/70 bg-zinc-950/70 p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-zinc-200">{role.id}</p>
                <p className="text-[11px] text-zinc-500">{role.role}</p>
              </div>
              <Badge tone={role.riskLevel === 'high' ? 'amber' : 'emerald'}>{role.worker}</Badge>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{role.rationale}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              {role.skill} · {role.maxDurationMinutes}m · checkpoint{' '}
              {role.checkpointRequired ? 'yes' : 'no'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NodeCard({ node }: { node: RuntimeLocalNode }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm text-zinc-100">{node.hostname}</p>
          <p className="text-xs text-zinc-500">
            {node.os} · {node.cpuCores} cores · {node.ramGb} GB RAM
            {node.gpuAvailable ? ' · GPU' : ''}
          </p>
        </div>
        <StatusPill
          ok={node.redisConnected}
          label={node.redisConnected ? 'Redis OK' : 'Redis down'}
        />
      </div>

      <MetricBar label="CPU" percent={node.cpuPercent} />
      <MetricBar label="RAM" percent={node.ramPercent} />
      <MetricBar label="Disk used" percent={node.diskPercent} />

      <p className="text-xs text-zinc-500">{node.diskFreeGb} GB free</p>
      <TmuxSection sessions={node.tmuxSessions} />
      <WorkersSection workers={node.workers} />
    </div>
  );
}

function QueueTable({
  queues,
  sessionCount,
}: {
  queues: RuntimeQueueSnapshot[];
  sessionCount?: number;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-medium text-zinc-300">BullMQ queues</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-500">
            <tr>
              <th className="pb-2 pr-4">Queue</th>
              <th className="pb-2 pr-4">Waiting</th>
              <th className="pb-2 pr-4">Active</th>
              <th className="pb-2 pr-4">Depth</th>
              <th className="pb-2 pr-4">Done</th>
              <th className="pb-2 pr-4">Failed</th>
            </tr>
          </thead>
          <tbody className="font-mono text-zinc-200">
            {queues.length > 0 ? (
              queues.map((queue) => (
                <tr key={queue.name} className="border-t border-zinc-800">
                  <td className="py-2 pr-4">{queue.name}</td>
                  <td className="py-2 pr-4">{queue.waiting}</td>
                  <td className="py-2 pr-4">{queue.active}</td>
                  <td className="py-2 pr-4">{queue.depth}</td>
                  <td className="py-2 pr-4">{queue.completed}</td>
                  <td className="py-2 pr-4">{queue.failed}</td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-zinc-800">
                <td className="py-2 text-zinc-500" colSpan={6}>
                  No queues reported yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {typeof sessionCount === 'number' ? (
        <p className="mt-2 text-xs text-zinc-500">Runtime sessions: {sessionCount}</p>
      ) : null}
    </div>
  );
}

export function LocalNodesPanel() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const statusUrl = `${baseUrl}/api/runtime/nodes/status`;
  const streamUrl = `${baseUrl}/api/runtime/stream`;
  const poppingSubagentsUrl = `${baseUrl}/api/runtime/popping-subagents`;

  const { data, error, mutate } = useSWR<RuntimeNodesPayload>(statusUrl, runtimeNodesFetcher, {
    refreshInterval: 5000,
  });
  const { data: poppingSubagents } = useSWR<RuntimePoppingSubagentsPayload>(
    poppingSubagentsUrl,
    poppingSubagentsFetcher,
    {
      refreshInterval: 15000,
    }
  );

  const [streamLive, setStreamLive] = useState(false);

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      return;
    }

    const source = new EventSource(streamUrl);
    source.onmessage = () => {
      setStreamLive(true);
      void mutate();
    };
    source.onerror = () => {
      setStreamLive(false);
    };

    return () => {
      source.close();
    };
  }, [streamUrl, mutate]);

  const nodes = data?.nodes ?? [];
  const queues = data?.queues ?? [];
  const capabilities = data?.capabilities;
  const sessionSummary = data?.sessionSummary;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Local runtime nodes</h2>
        <p className="text-xs text-zinc-500">
          Pool BullMQ + tmux · {streamLive ? 'SSE live' : 'polling 5s'}
          {data?.timestamp ? ` · ${new Date(data.timestamp).toLocaleTimeString()}` : ''}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-400">
          Failed to load runtime status. Is orchestrator reachable?
        </p>
      ) : null}

      {!error && nodes.length === 0 ? (
        <p className="text-sm text-zinc-500">No local nodes reported yet.</p>
      ) : null}

      {capabilities ? (
        <div className="mt-4 space-y-3">
          <CapabilityRegistryPanel registry={capabilities} />
          {sessionSummary ? <SessionSummaryPanel summary={sessionSummary} /> : null}
          {poppingSubagents?.catalog ? (
            <PoppingSubagentsPanel catalog={poppingSubagents.catalog} />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {nodes.map((node) => (
          <article
            key={node.id}
            className="space-y-3 rounded-md border border-zinc-800 bg-black/40 p-3"
          >
            <NodeCard node={node} />
          </article>
        ))}
      </div>

      <QueueTable queues={queues} sessionCount={data?.sessionCount} />
    </section>
  );
}

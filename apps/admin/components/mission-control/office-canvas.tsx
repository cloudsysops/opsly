'use client';

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { NodeProps, OnSelectionChangeParams } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo } from 'react';

import type {
  AgentLifecycleStatus,
  AgentTeam,
  OpenClawIntentRuntime,
  OpenClawSnapshot,
  OrchestratorStatus,
} from '@/lib/mission-control-types';
import { mapIntentToLifecycle, mapTeamToLifecycle } from '@/lib/mission-control-types';
import { useMissionControlOfficeStore } from '@/stores/mission-control-office-store';
import { cn } from '@/lib/utils';

const NODES = {
  health: 'mcHealth',
  queue: 'mcQueue',
  workers: 'mcWorkers',
  agent: 'mcAgent',
  intent: 'mcIntent',
} as const;

function lifecycleRing(status: AgentLifecycleStatus): string {
  switch (status) {
    case 'running':
      return 'border-emerald-500/90 bg-emerald-950/40 shadow-[0_0_18px_rgba(52,211,153,0.35)]';
    case 'thinking':
      return 'border-cyan-500/80 bg-cyan-950/35';
    case 'blocked':
      return 'border-amber-500/80 bg-amber-950/30 animate-pulse';
    case 'failed':
      return 'border-rose-500/90 bg-rose-950/40';
    case 'sleeping':
      return 'border-indigo-500/70 bg-indigo-950/35';
    case 'dead':
      return 'border-zinc-600 bg-zinc-950/80 opacity-70';
    case 'reviving':
      return 'border-violet-500/80 bg-violet-950/40 animate-pulse';
    case 'idle':
    default:
      return 'border-neutral-600 bg-neutral-950/70';
  }
}

type HealthData = {
  mode: string;
  role: string;
  healthy: boolean;
  violationCount: number;
};

function McHealthNode(props: NodeProps) {
  const d = props.data as HealthData;
  const delirium = d.violationCount > 0;
  return (
    <div
      className={cn(
        'min-w-[220px] max-w-[260px] rounded-lg border px-3 py-2 font-mono text-xs',
        d.healthy && !delirium
          ? 'border-emerald-700/80 bg-emerald-950/25'
          : 'border-rose-600/90 bg-rose-950/35 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
        delirium && 'animate-pulse'
      )}
    >
      <Handle className="!h-2 !w-2 !bg-neutral-500" position={Position.Bottom} type="source" />
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">Radar / Health</p>
      <p className="mt-1 text-sm text-neutral-100">
        mode=<span className="text-emerald-400">{d.mode}</span>
      </p>
      <p className="text-sm text-neutral-100">
        role=<span className="text-sky-400">{d.role}</span>
      </p>
      {delirium ? (
        <p className="mt-2 text-[11px] font-semibold text-rose-400">
          ⚠ Policy / delirium risk ({d.violationCount})
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-neutral-500">No recent violations</p>
      )}
    </div>
  );
}

type QueueData = OrchestratorStatus['queue'];

function McQueueNode(props: NodeProps) {
  const q = props.data as QueueData;
  return (
    <div className="min-w-[240px] rounded-lg border border-amber-600/60 bg-amber-950/20 px-3 py-2 font-mono text-xs">
      <Handle className="!h-2 !w-2 !bg-amber-600" position={Position.Top} type="target" />
      <Handle
        id="out-bottom"
        className="!h-2 !w-2 !bg-amber-600"
        position={Position.Bottom}
        type="source"
      />
      <Handle
        id="out-right"
        className="!h-2 !w-2 !bg-amber-500"
        position={Position.Right}
        type="source"
      />
      <p className="text-[10px] uppercase tracking-wider text-amber-500/90">BullMQ · openclaw</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-neutral-200">
        <span className="text-neutral-500">wait</span>
        <span className="text-right text-amber-300">{q.waiting}</span>
        <span className="text-neutral-500">active</span>
        <span className="text-right text-emerald-300">{q.active}</span>
        <span className="text-neutral-500">done</span>
        <span className="text-right text-sky-300">{q.completed}</span>
        <span className="text-neutral-500">fail</span>
        <span className="text-right text-rose-400">{q.failed}</span>
      </div>
    </div>
  );
}

type WorkersData = { summary: string };

function McWorkersNode(props: NodeProps) {
  const { summary } = props.data as WorkersData;
  return (
    <div className="max-w-[280px] rounded-lg border border-violet-700/50 bg-violet-950/20 px-3 py-2 font-mono text-[11px] text-neutral-300">
      <Handle className="!h-2 !w-2 !bg-violet-500" position={Position.Left} type="target" />
      <p className="text-[10px] uppercase tracking-wider text-violet-400">Workers (config)</p>
      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-[10px] leading-snug">
        {summary}
      </pre>
    </div>
  );
}

type AgentData = {
  name: string;
  lifecycle: AgentLifecycleStatus;
  lastTask: string | null;
  completed: number;
  failed: number;
};

function McAgentNode(props: NodeProps) {
  const d = props.data as AgentData;
  return (
    <div
      className={cn(
        'min-w-[180px] max-w-[220px] rounded-lg border px-3 py-2',
        lifecycleRing(d.lifecycle)
      )}
    >
      <Handle className="!h-2 !w-2 !bg-neutral-500" position={Position.Top} type="target" />
      <p className="font-mono text-[10px] uppercase tracking-wide text-neutral-500">Agent team</p>
      <p className="mt-1 font-mono text-sm text-neutral-100">{d.name}</p>
      <p className="mt-1 text-[10px] text-neutral-400">{d.lifecycle}</p>
      <p className="mt-1 truncate text-[10px] text-neutral-500" title={d.lastTask ?? ''}>
        {d.lastTask ?? '—'}
      </p>
      <div className="mt-2 flex gap-2 text-[10px]">
        <span className="text-emerald-400">ok {d.completed}</span>
        <span className="text-rose-400">fail {d.failed}</span>
      </div>
    </div>
  );
}

type IntentData = {
  requestId: string;
  intent: string | null;
  stage: string | null;
  lifecycle: AgentLifecycleStatus;
  tenant: string | null;
};

function McIntentNode(props: NodeProps) {
  const d = props.data as IntentData;
  return (
    <div className={cn('min-w-[200px] max-w-[240px] rounded-lg border px-3 py-2', lifecycleRing(d.lifecycle))}>
      <Handle className="!h-2 !w-2 !bg-sky-500" position={Position.Top} type="target" />
      <p className="text-[10px] uppercase tracking-wider text-sky-500/90">Task / intent</p>
      <p className="mt-1 truncate font-mono text-[10px] text-sky-200/90" title={d.requestId}>
        {d.requestId}
      </p>
      <p className="mt-1 text-xs text-neutral-200">{d.intent ?? 'unknown'}</p>
      <p className="mt-1 text-[10px] text-neutral-500">
        stage={d.stage ?? 'n/a'} · {d.tenant ?? 'tenant?'}
      </p>
    </div>
  );
}

const nodeTypes = {
  [NODES.health]: McHealthNode,
  [NODES.queue]: McQueueNode,
  [NODES.workers]: McWorkersNode,
  [NODES.agent]: McAgentNode,
  [NODES.intent]: McIntentNode,
};

function buildWorkersSummary(workers: OrchestratorStatus['workers']): string {
  return Object.entries(workers)
    .map(([k, v]) => `${k}: conc=${v.concurrency} active=${v.active}`)
    .join('\n');
}

function buildGraph(input: {
  orchestrator: OrchestratorStatus | undefined;
  teams: AgentTeam[];
  openClaw: OpenClawSnapshot | undefined;
}): { nodes: Node[]; edges: Edge[] } {
  const orch = input.orchestrator;
  const queue = orch?.queue ?? { waiting: 0, active: 0, completed: 0, failed: 0 };
  const workers = orch?.workers ?? {};
  const violationCount = input.openClaw?.recent_policy_violations.length ?? 0;
  const healthy = Boolean(orch) && violationCount === 0;

  const nodes: Node[] = [
    {
      id: 'health',
      type: NODES.health,
      position: { x: 40, y: 0 },
      data: {
        mode: orch?.mode ?? 'unknown',
        role: orch?.role ?? 'unknown',
        healthy,
        violationCount,
      } satisfies HealthData,
    },
    {
      id: 'queue',
      type: NODES.queue,
      position: { x: 320, y: 20 },
      data: queue,
    },
    {
      id: 'workers',
      type: NODES.workers,
      position: { x: 620, y: 0 },
      data: { summary: buildWorkersSummary(workers) } satisfies WorkersData,
    },
  ];

  const edges: Edge[] = [
    {
      id: 'e-health-queue',
      source: 'health',
      target: 'queue',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#525252' },
      style: { stroke: '#404040', strokeWidth: 1.2 },
    },
    {
      id: 'e-queue-workers',
      source: 'queue',
      sourceHandle: 'out-right',
      target: 'workers',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#525252' },
      style: { stroke: '#404040', strokeWidth: 1.2 },
    },
  ];

  const teamColWidth = 220;
  input.teams.forEach((team, i) => {
    const id = `team-${team.name}`;
    nodes.push({
      id,
      type: NODES.agent,
      position: { x: 40 + i * teamColWidth, y: 220 },
      data: {
        name: team.name,
        lifecycle: mapTeamToLifecycle(team),
        lastTask: team.lastTask,
        completed: team.completedTasks,
        failed: team.failedTasks,
      } satisfies AgentData,
    });
    edges.push({
      id: `e-queue-${id}`,
      source: 'queue',
      sourceHandle: 'out-bottom',
      target: id,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: { stroke: '#52525b', strokeWidth: 1 },
    });
  });

  const intents: OpenClawIntentRuntime[] =
    input.openClaw?.intents_in_progress?.length ? input.openClaw.intents_in_progress : [];
  const fallbackIntents = intents.length ? intents : (input.openClaw?.intents.slice(0, 6) ?? []);
  fallbackIntents.forEach((intent, i) => {
    const id = `intent-${intent.request_id}`;
    nodes.push({
      id,
      type: NODES.intent,
      position: { x: 40 + i * 240, y: 420 },
      data: {
        requestId: intent.request_id,
        intent: intent.intent,
        stage: intent.current_stage,
        lifecycle: mapIntentToLifecycle(intent),
        tenant: intent.tenant_slug,
      } satisfies IntentData,
    });
    edges.push({
      id: `e-queue-${id}`,
      source: 'queue',
      sourceHandle: 'out-bottom',
      target: id,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      style: { stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '4 4' },
    });
  });

  return { nodes, edges };
}

export type OfficeCanvasProps = {
  orchestrator: OrchestratorStatus | undefined;
  teams: AgentTeam[];
  openClaw: OpenClawSnapshot | undefined;
};

function OfficeCanvasInner({ orchestrator, teams, openClaw }: OfficeCanvasProps) {
  const setSelected = useMissionControlOfficeStore((s) => s.setSelectedNodeId);
  const graph = useMemo(
    () => buildGraph({ orchestrator, teams, openClaw }),
    [orchestrator, teams, openClaw]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const onSelectionChange = useCallback(
    (p: OnSelectionChangeParams) => {
      const first = p.nodes[0];
      setSelected(first?.id ?? null);
    },
    [setSelected]
  );

  return (
    <div className="h-[min(78vh,820px)] w-full rounded-lg border border-ops-border bg-[#080808]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        fitView
        minZoom={0.4}
        maxZoom={1.4}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#1f2937" />
        <Controls className="!bg-neutral-900/95 !border-neutral-700" />
        <MiniMap
          className="!bg-neutral-950/90 !border-neutral-700"
          maskColor="rgba(0,0,0,0.65)"
          nodeStrokeWidth={2}
        />
      </ReactFlow>
    </div>
  );
}

export function OfficeCanvas(props: OfficeCanvasProps) {
  return (
    <ReactFlowProvider>
      <OfficeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

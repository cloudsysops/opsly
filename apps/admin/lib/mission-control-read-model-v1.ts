import type {
  AgentTeamsResponse,
  OpenClawSnapshot,
  OrchestratorStatus,
} from './mission-control-types';

export type MissionControlConfidenceV1 = 'REAL' | 'DERIVED' | 'UNKNOWN';

export type MissionControlSourceV1 = {
  id: string;
  endpoint: string;
  confidence: MissionControlConfidenceV1;
  observed_at: string | null;
  available: boolean;
};

export type MissionControlNodeStateV1 = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';

export type MissionControlNodeV1 = {
  node_id: string;
  hostname: string;
  role: 'runtime-node' | 'compute-worker';
  state: MissionControlNodeStateV1;
  source_id: string;
  confidence: MissionControlConfidenceV1;
  redis_connected: boolean | null;
  gpu_available: boolean | null;
  active_jobs: number | null;
  active_sessions: number | null;
  last_heartbeat: string | null;
  runtime: string | null;
  model: string | null;
};

export type MissionControlQueueV1 = {
  queue: string;
  waiting: number;
  active: number;
  failed: number;
  depth: number;
  source_id: string;
  confidence: MissionControlConfidenceV1;
};

export type MissionControlAgentV1 = {
  agent_id: string;
  state: 'RUNNING' | 'IDLE' | 'ERROR' | 'UNKNOWN';
  current_task: string | null;
  completed_tasks: number | null;
  failed_tasks: number | null;
  source_id: string;
  confidence: MissionControlConfidenceV1;
};

export type MissionControlBlockerV1 = {
  blocker_id: string;
  failure_class:
    | 'CODE'
    | 'INFRA_TRANSIENT'
    | 'POLICY_GATE'
    | 'UPSTREAM_DEPENDENCY'
    | 'RUNTIME_UNAVAILABLE'
    | 'EVIDENCE_INSUFFICIENT'
    | 'BLOCKED_ACCESS';
  title: string;
  resource: string;
  access_required: string | null;
  next_safe_action: string;
  evidence_required: string[];
  source_id: string;
};

export type MissionControlIntelligenceV1 = {
  task_graph: {
    state: 'available' | 'unknown';
    source: string | null;
  };
  execution_evidence: {
    state: 'available' | 'unknown';
    source: string | null;
  };
  routing_decision: {
    state: 'available' | 'unknown';
    source: string | null;
  };
  verifier: {
    state: 'available' | 'unknown';
    source: string | null;
  };
  release_candidate: {
    state: 'available' | 'unknown';
    source: string | null;
  };
};

export type MissionControlSnapshotV1 = {
  schema_version: 'MissionControlSnapshotV1';
  generated_at: string;
  sources: MissionControlSourceV1[];
  summary: {
    machines_total: number;
    machines_online: number;
    agents_total: number;
    agents_running: number;
    queue_waiting: number;
    queue_active: number;
    queue_failed: number;
    active_runtime_sessions: number | null;
    policy_violations: number;
    healthy_idle: boolean | null;
  };
  machines: MissionControlNodeV1[];
  agents: MissionControlAgentV1[];
  queues: MissionControlQueueV1[];
  blockers: MissionControlBlockerV1[];
  intelligence: MissionControlIntelligenceV1;
};

export type RuntimeNodeInputV1 = {
  id: string;
  hostname: string;
  redisConnected: boolean;
  gpuAvailable: boolean;
  tmuxSessions?: Array<{ name: string; running: boolean }>;
};

export type RuntimeNodesInputV1 = {
  ok: boolean;
  timestamp: string;
  nodes: RuntimeNodeInputV1[];
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    depth: number;
    failed: number;
  }>;
  sessionSummary?: { running: number };
  error?: string;
};

export type ComputeWorkersInputV1 = {
  workers?: Array<{
    workerId: string;
    hostname: string;
    status: 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE';
    activeJobs: number;
    lastHeartbeat: string | null;
    gpuVendor?: string;
    gpuModel?: string;
    vramGb?: number;
  }>;
  queues?: Record<string, { waiting: number; active: number; failed: number }>;
};

export type BuildMissionControlSnapshotV1Input = {
  now?: string;
  orchestrator?: OrchestratorStatus;
  teams?: AgentTeamsResponse;
  openclaw?: OpenClawSnapshot;
  runtime?: RuntimeNodesInputV1;
  compute?: ComputeWorkersInputV1;
  source_errors?: Partial<
    Record<'orchestrator' | 'teams' | 'openclaw' | 'runtime' | 'compute', string>
  >;
};

function source(
  id: string,
  endpoint: string,
  available: boolean,
  observedAt: string | null,
): MissionControlSourceV1 {
  return {
    id,
    endpoint,
    available,
    observed_at: observedAt,
    confidence: available ? 'REAL' : 'UNKNOWN',
  };
}

function runtimeState(node: RuntimeNodeInputV1): MissionControlNodeStateV1 {
  return node.redisConnected ? 'ONLINE' : 'DEGRADED';
}

function computeState(
  status: 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE',
): MissionControlNodeStateV1 {
  if (status === 'ONLINE' || status === 'BUSY') return 'ONLINE';
  return status;
}

function queueSourceRank(sourceId: string): number {
  if (sourceId === 'runtime') return 3;
  if (sourceId === 'compute') return 2;
  if (sourceId === 'orchestrator') return 1;
  return 0;
}

function dedupeQueues(rows: MissionControlQueueV1[]): MissionControlQueueV1[] {
  const map = new Map<string, MissionControlQueueV1>();
  for (const row of rows) {
    const existing = map.get(row.queue);
    if (!existing) {
      map.set(row.queue, row);
      continue;
    }

    // Never synthesize a queue tuple by taking field-wise maxima from samples
    // captured at different times. Pick one coherent observation. Runtime is
    // the canonical source when duplicate queue names exist; otherwise keep
    // the higher-depth observation as the conservative snapshot.
    const chosen =
      queueSourceRank(row.source_id) > queueSourceRank(existing.source_id)
        ? row
        : queueSourceRank(row.source_id) < queueSourceRank(existing.source_id)
          ? existing
          : row.depth > existing.depth
            ? row
            : existing;

    map.set(row.queue, {
      ...chosen,
      confidence: 'DERIVED',
      source_id: `${existing.source_id}+${row.source_id}`,
    });
  }
  return [...map.values()].sort((a, b) => a.queue.localeCompare(b.queue));
}

function unknownIntelligence(): MissionControlIntelligenceV1 {
  return {
    task_graph: { state: 'unknown', source: null },
    execution_evidence: { state: 'unknown', source: null },
    routing_decision: { state: 'unknown', source: null },
    verifier: { state: 'unknown', source: null },
    release_candidate: { state: 'unknown', source: null },
  };
}

/**
 * Canonical admin read model.
 *
 * It composes existing runtime sources only. Missing sources stay UNKNOWN and
 * access/runtime gaps become explicit blockers. It never creates tasks,
 * schedules work, grants approvals, or fabricates heartbeats.
 */
export function buildMissionControlSnapshotV1(
  input: BuildMissionControlSnapshotV1Input,
): MissionControlSnapshotV1 {
  const now = input.now ?? new Date().toISOString();
  const orchestratorAvailable =
    Boolean(input.orchestrator) &&
    input.orchestrator?.mode !== 'unknown' &&
    input.orchestrator?.role !== 'unknown';

  const sources: MissionControlSourceV1[] = [
    source(
      'orchestrator',
      '/api/admin/mission-control/orchestrator',
      orchestratorAvailable,
      orchestratorAvailable ? now : null,
    ),
    source(
      'teams',
      '/api/admin/mission-control/teams',
      Boolean(input.teams),
      input.teams?.generated_at ?? null,
    ),
    source(
      'openclaw',
      '/api/admin/mission-control/openclaw',
      Boolean(input.openclaw),
      input.openclaw?.generated_at ?? null,
    ),
    source(
      'runtime',
      '/api/runtime/nodes/status',
      Boolean(input.runtime?.ok),
      input.runtime?.timestamp ?? null,
    ),
    source(
      'compute',
      '/api/admin/compute-workers',
      Boolean(input.compute),
      now,
    ),
  ];

  const machines: MissionControlNodeV1[] = [];

  for (const node of input.runtime?.nodes ?? []) {
    machines.push({
      node_id: node.id,
      hostname: node.hostname,
      role: 'runtime-node',
      state: runtimeState(node),
      source_id: 'runtime',
      confidence: 'REAL',
      redis_connected: node.redisConnected,
      gpu_available: node.gpuAvailable,
      active_jobs: null,
      active_sessions:
        node.tmuxSessions?.filter((session) => session.running).length ?? null,
      last_heartbeat: input.runtime?.timestamp ?? null,
      runtime: null,
      model: null,
    });
  }

  for (const worker of input.compute?.workers ?? []) {
    machines.push({
      node_id: worker.workerId,
      hostname: worker.hostname,
      role: 'compute-worker',
      state: computeState(worker.status),
      source_id: 'compute',
      confidence: 'REAL',
      redis_connected: null,
      gpu_available:
        worker.gpuVendor !== undefined || worker.gpuModel !== undefined || worker.vramGb !== undefined
          ? true
          : null,
      active_jobs: worker.activeJobs,
      active_sessions: null,
      last_heartbeat: worker.lastHeartbeat,
      runtime: null,
      model: null,
    });
  }

  machines.sort((a, b) => a.node_id.localeCompare(b.node_id));

  const agents: MissionControlAgentV1[] = (input.teams?.teams ?? [])
    .map((team) => ({
      agent_id: team.name,
      // Team status is derived from historical result counts, not a live
      // execution heartbeat. Only explicit errors are actionable here.
      state: team.status === 'error' ? ('ERROR' as const) : ('IDLE' as const),
      current_task: team.lastTask,
      completed_tasks: team.completedTasks,
      failed_tasks: team.failedTasks,
      source_id: 'teams',
      confidence: 'REAL' as const,
    }))
    .sort((a, b) => a.agent_id.localeCompare(b.agent_id));

  const queueRows: MissionControlQueueV1[] = [];
  if (orchestratorAvailable && input.orchestrator) {
    queueRows.push({
      queue: 'orchestrator',
      waiting: input.orchestrator.queue.waiting,
      active: input.orchestrator.queue.active,
      failed: input.orchestrator.queue.failed,
      depth: input.orchestrator.queue.waiting + input.orchestrator.queue.active,
      source_id: 'orchestrator',
      confidence: 'REAL',
    });
  }
  for (const queue of input.runtime?.queues ?? []) {
    queueRows.push({
      queue: queue.name,
      waiting: queue.waiting,
      active: queue.active,
      failed: queue.failed,
      depth: queue.depth,
      source_id: 'runtime',
      confidence: 'REAL',
    });
  }
  for (const [queue, values] of Object.entries(input.compute?.queues ?? {})) {
    queueRows.push({
      queue,
      waiting: values.waiting,
      active: values.active,
      failed: values.failed,
      depth: values.waiting + values.active,
      source_id: 'compute',
      confidence: 'REAL',
    });
  }
  const queues = dedupeQueues(queueRows);

  const blockers: MissionControlBlockerV1[] = [];
  for (const [key, message] of Object.entries(input.source_errors ?? {})) {
    if (!message) continue;
    blockers.push({
      blocker_id: `source:${key}`,
      failure_class: /401|403|unauthor|forbidden|permission|secret/i.test(message)
        ? 'BLOCKED_ACCESS'
        : 'RUNTIME_UNAVAILABLE',
      title: `${key} source unavailable`,
      resource: key,
      access_required: /401|403|unauthor|forbidden|permission|secret/i.test(message)
        ? 'authorized read access to the existing source'
        : null,
      next_safe_action: 'Restore or authorize the canonical read-only source; do not mock the signal.',
      evidence_required: ['successful source probe', 'fresh timestamp/run evidence'],
      source_id: key,
    });
  }

  if (input.orchestrator && !orchestratorAvailable) {
    blockers.push({
      blocker_id: 'orchestrator:sentinel-unavailable',
      failure_class: 'RUNTIME_UNAVAILABLE',
      title: 'Orchestrator source returned unavailable sentinel state',
      resource: '/api/admin/mission-control/orchestrator',
      access_required: null,
      next_safe_action:
        'Restore the orchestrator/Redis read path; keep queue state UNKNOWN until a non-sentinel response is observed.',
      evidence_required: ['mode != unknown', 'role != unknown', 'successful Redis-backed probe'],
      source_id: 'orchestrator',
    });
  }

  if (input.runtime && !input.runtime.ok) {
    blockers.push({
      blocker_id: 'runtime:nodes-status',
      failure_class: 'RUNTIME_UNAVAILABLE',
      title: 'Runtime node snapshot unavailable',
      resource: '/api/runtime/nodes/status',
      access_required: null,
      next_safe_action: 'Repair the runtime status probe and rerun it; keep node state UNKNOWN meanwhile.',
      evidence_required: ['ok=true runtime snapshot', 'fresh runtime timestamp'],
      source_id: 'runtime',
    });
  }

  const queueWaiting = queues.reduce((sum, queue) => sum + queue.waiting, 0);
  const queueActive = queues.reduce((sum, queue) => sum + queue.active, 0);
  const queueFailed = queues.reduce((sum, queue) => sum + queue.failed, 0);
  const policyViolations = input.openclaw?.recent_policy_violations.length ?? 0;
  const activeRuntimeSessions = input.runtime?.sessionSummary?.running ?? null;
  const machinesOnline = machines.filter((node) => node.state === 'ONLINE').length;
  const agentsRunning = agents.filter((agent) => agent.state === 'RUNNING').length;

  const healthyIdle =
    activeRuntimeSessions === null
      ? null
      : activeRuntimeSessions === 0 &&
        queueActive === 0 &&
        policyViolations === 0 &&
        blockers.length === 0;

  return {
    schema_version: 'MissionControlSnapshotV1',
    generated_at: now,
    sources,
    summary: {
      machines_total: machines.length,
      machines_online: machinesOnline,
      agents_total: agents.length,
      agents_running: agentsRunning,
      queue_waiting: queueWaiting,
      queue_active: queueActive,
      queue_failed: queueFailed,
      active_runtime_sessions: activeRuntimeSessions,
      policy_violations: policyViolations,
      healthy_idle: healthyIdle,
    },
    machines,
    agents,
    queues,
    blockers,
    intelligence: unknownIntelligence(),
  };
}

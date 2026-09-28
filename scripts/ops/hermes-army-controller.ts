#!/usr/bin/env npx tsx

import { randomUUID } from 'node:crypto';
import {
  armyNodeDisposition,
  buildArmyNodeSubmitBody,
  buildHermesCommanderPrompt,
  inspectArmyGraph,
  parseHermesCommanderResult,
  planTaskGraphWaves,
  type TaskGraphNode,
  type TaskGraphV1,
} from '@intcloudsysops/agent-task-core';

type JsonRecord = Record<string, unknown>;

type SubmitOutcome =
  | { status: 'queued'; jobId: string; requestId: string }
  | { status: 'joined'; jobId: string; requestId: string }
  | { status: 'already_done'; jobId: null; requestId: string };

interface Args {
  objective: string;
  tenantSlug: string;
  baseUrl: string;
  apply: boolean;
  maxNodes: number;
  maxSteps: number;
  timeoutMs: number;
  pollMs: number;
}

function usage(): never {
  console.error(`Usage:
  npx tsx scripts/ops/hermes-army-controller.ts --objective "..." [options]

Options:
  --apply                  Dispatch the validated TaskGraph waves. Default is plan-only.
  --tenant <slug>          Tenant slug. Default: platform
  --url <orchestrator>     Orchestrator base URL. Default: OPSLY_ORCHESTRATOR_URL or http://127.0.0.1:3011
  --max-nodes <n>          Maximum commander nodes. Default: 12
  --max-steps <n>          Max runtime steps per node. Default: 12
  --timeout-seconds <n>    Per-job terminal wait. Default: 900
  --poll-seconds <n>       Poll interval. Default: 3

Requires PLATFORM_ADMIN_TOKEN.
No paid fallback is permitted by this controller.
`);
  process.exit(2);
}

function positiveInt(raw: string | undefined, fallback: number, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, Math.floor(value));
}

function parseArgs(argv: string[]): Args {
  let objective = '';
  let tenantSlug = 'platform';
  let baseUrl = (process.env.OPSLY_ORCHESTRATOR_URL || 'http://127.0.0.1:3011').replace(/\/+$/, '');
  let apply = false;
  let maxNodes = 12;
  let maxSteps = 12;
  let timeoutMs = 900_000;
  let pollMs = 3_000;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    switch (arg) {
      case '--objective':
        objective = next?.trim() ?? '';
        i += 1;
        break;
      case '--tenant':
        tenantSlug = next?.trim() ?? '';
        i += 1;
        break;
      case '--url':
        baseUrl = (next?.trim() ?? '').replace(/\/+$/, '');
        i += 1;
        break;
      case '--apply':
        apply = true;
        break;
      case '--max-nodes':
        maxNodes = positiveInt(next, 12, 32);
        i += 1;
        break;
      case '--max-steps':
        maxSteps = positiveInt(next, 12, 40);
        i += 1;
        break;
      case '--timeout-seconds':
        timeoutMs = positiveInt(next, 900, 7200) * 1000;
        i += 1;
        break;
      case '--poll-seconds':
        pollMs = positiveInt(next, 3, 60) * 1000;
        i += 1;
        break;
      case '-h':
      case '--help':
        usage();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!objective) usage();
  if (!tenantSlug) throw new Error('tenant slug is required');
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    throw new Error('orchestrator URL must be http(s)');
  }

  return { objective, tenantSlug, baseUrl, apply, maxNodes, maxSteps, timeoutMs, pollMs };
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null ? (value as JsonRecord) : {};
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function httpJson(
  args: Args,
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: JsonRecord }> {
  const response = await fetch(`${args.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-autonomy-approved': 'true',
      ...(init.headers ?? {}),
    },
  });
  const raw = await response.text();
  let parsed: unknown = {};
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Non-JSON response from ${path}: HTTP ${response.status}`);
    }
  }
  return { status: response.status, body: asRecord(parsed) };
}

async function submit(
  args: Args,
  token: string,
  body: JsonRecord
): Promise<SubmitOutcome> {
  const response = await httpJson(args, token, '/api/local/prompt-submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const requestId = stringField(response.body.request_id) || stringField(body.request_id);
  if (response.status === 202) {
    const jobId = stringField(response.body.job_id);
    if (!jobId) throw new Error(`Submit accepted without job_id for ${requestId}`);
    return { status: 'queued', jobId, requestId };
  }

  if (response.status === 409) {
    const decision = stringField(response.body.dispatch_decision);
    if (decision === 'ALREADY_DONE') {
      return { status: 'already_done', jobId: null, requestId };
    }
    if (decision === 'JOIN_EXISTING') {
      const jobId =
        stringField(response.body.existing_job_id) ||
        stringField(response.body.job_id);
      if (!jobId) {
        throw new Error(
          `JOIN_EXISTING without existing_job_id for ${requestId}; owned by task=${stringField(response.body.existing_task_id) || 'unknown'}`
        );
      }
      return { status: 'joined', jobId, requestId };
    }
  }

  throw new Error(
    `Submit failed HTTP ${response.status}: ${stringField(response.body.error) || stringField(response.body.reason) || JSON.stringify(response.body)}`
  );
}

async function waitForJob(
  args: Args,
  token: string,
  jobId: string
): Promise<JsonRecord> {
  const deadline = Date.now() + args.timeoutMs;
  while (Date.now() < deadline) {
    const response = await httpJson(
      args,
      token,
      `/internal/job/${encodeURIComponent(jobId)}`,
      { method: 'GET' }
    );
    if (response.status === 404) {
      await new Promise((resolve) => setTimeout(resolve, args.pollMs));
      continue;
    }
    if (response.status !== 200) {
      throw new Error(
        `Job status failed HTTP ${response.status}: ${JSON.stringify(response.body)}`
      );
    }
    const state = stringField(response.body.state);
    if (state === 'completed') return response.body;
    if (state === 'failed') {
      throw new Error(
        `Job ${jobId} failed: ${stringField(response.body.failedReason) || 'unknown failure'}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, args.pollMs));
  }
  throw new Error(`Job ${jobId} did not reach terminal state within ${args.timeoutMs}ms`);
}

async function planObjective(
  args: Args,
  token: string,
  objectiveId: string
): Promise<TaskGraphV1> {
  const plannerRequestId = `${objectiveId}:commander-plan`;
  const plannerBody: JsonRecord = {
    agent: 'local_hermes',
    agent_role: 'planning',
    tenant_slug: args.tenantSlug,
    request_id: plannerRequestId,
    correlation_id: objectiveId,
    goal: args.objective,
    max_steps: 8,
    prompt_content: buildHermesCommanderPrompt({
      objective: args.objective,
      maxNodes: args.maxNodes,
    }),
    context: {
      source: 'hermes-army-controller-v1',
      objective_id: objectiveId,
      phase: 'plan',
      requires_pr: false,
      cost_class: 'zero',
    },
  };

  console.log(`[army] commander planning objective_id=${objectiveId}`);
  const submitted = await submit(args, token, plannerBody);
  if (submitted.status === 'already_done') {
    throw new Error('Commander plan unexpectedly reported ALREADY_DONE without retrievable result');
  }
  const terminal = await waitForJob(args, token, submitted.jobId);
  const graph = parseHermesCommanderResult(terminal.returnvalue);
  const issues = inspectArmyGraph(graph, { maxNodes: args.maxNodes, allowPaid: false });
  const fatal = issues.filter(
    (issue) => issue.code === 'TOO_MANY_NODES' || issue.code === 'WRITE_CONFLICT_KEY_REQUIRED'
  );
  if (fatal.length > 0) {
    throw new Error(`Commander graph rejected: ${JSON.stringify(fatal)}`);
  }
  if (issues.length > 0) {
    console.log(`[army] commander holds=${JSON.stringify(issues)}`);
  }
  return graph;
}

async function executeNode(
  args: Args,
  token: string,
  objectiveId: string,
  graph: TaskGraphV1,
  node: TaskGraphNode
): Promise<{ nodeId: string; state: 'completed' | 'already_done'; jobId: string | null }> {
  const disposition = armyNodeDisposition(node, { allowPaid: false });
  if (disposition.status === 'held') {
    throw new Error(`ARMY_NODE_HELD: ${node.id} reason=${disposition.reason}`);
  }

  const body = buildArmyNodeSubmitBody({
    objectiveId,
    tenantSlug: args.tenantSlug,
    graph,
    node,
    maxSteps: args.maxSteps,
  }) as unknown as JsonRecord;

  const submitted = await submit(args, token, body);
  if (submitted.status === 'already_done') {
    console.log(`[army] ${node.id} reuse=ALREADY_DONE`);
    return { nodeId: node.id, state: 'already_done', jobId: null };
  }

  console.log(`[army] ${node.id} ${submitted.status} job=${submitted.jobId}`);
  await waitForJob(args, token, submitted.jobId);
  console.log(`[army] ${node.id} completed job=${submitted.jobId}`);
  return { nodeId: node.id, state: 'completed', jobId: submitted.jobId };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.PLATFORM_ADMIN_TOKEN?.trim();
  if (!token) throw new Error('PLATFORM_ADMIN_TOKEN is required');

  const objectiveId = `army-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const graph = await planObjective(args, token, objectiveId);
  const waves = planTaskGraphWaves(graph);

  console.log(
    JSON.stringify(
      {
        army_controller: 'hermes-army-controller-v1',
        objective_id: objectiveId,
        mode: args.apply ? 'apply' : 'plan-only',
        goal: graph.goal,
        nodes: graph.nodes.length,
        waves,
      },
      null,
      2
    )
  );

  if (!args.apply) {
    console.log('[army] PLAN_ONLY: rerun with --apply to dispatch through the canonical Opsly queue.');
    return;
  }

  const completed = new Set<string>();
  for (const wave of waves) {
    const nodes = wave.taskIds.map((id) => graph.nodes.find((node) => node.id === id)!);
    const blocked = nodes.filter(
      (node) => armyNodeDisposition(node, { allowPaid: false }).status === 'held'
    );
    if (blocked.length > 0) {
      throw new Error(
        `ARMY_WAVE_HELD: wave=${wave.index} nodes=${blocked.map((node) => node.id).join(',')}`
      );
    }

    console.log(`[army] wave=${wave.index} dispatch=${nodes.map((node) => node.id).join(',')}`);
    const results = await Promise.all(
      nodes.map((node) => executeNode(args, token, objectiveId, graph, node))
    );
    for (const result of results) completed.add(result.nodeId);
  }

  console.log(
    JSON.stringify(
      {
        ARMY_OBJECTIVE_COMPLETE: true,
        objective_id: objectiveId,
        completed_nodes: [...completed].sort(),
        total_nodes: graph.nodes.length,
        paid_api_allowed: false,
        control_plane: 'canonical-opsly',
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ARMY_OBJECTIVE_COMPLETE: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});

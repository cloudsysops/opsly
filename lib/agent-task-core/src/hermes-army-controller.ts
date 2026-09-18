import { parseTaskGraphV1, type TaskGraphNode, type TaskGraphV1 } from './task-graph.js';

export const HERMES_ARMY_CONTROLLER_VERSION = 'hermes-army-controller-v1' as const;

export type ArmyGraphIssue =
  | { code: 'TOO_MANY_NODES'; actual: number; max: number }
  | { code: 'WRITE_CONFLICT_KEY_REQUIRED'; nodeId: string }
  | { code: 'PAID_NODE'; nodeId: string }
  | { code: 'APPROVAL_REQUIRED'; nodeId: string };

export type ArmyNodeDisposition =
  | { status: 'dispatchable' }
  | { status: 'held'; reason: 'paid' | 'approval_required' };

export interface ArmyNodeSubmitBody {
  agent: null;
  agent_role: string;
  goal: string;
  tenant_slug: string;
  request_id: string;
  correlation_id: string;
  max_steps: number;
  prompt_content: string;
  context: Record<string, unknown>;
}

export function buildHermesCommanderPrompt(params: {
  objective: string;
  maxNodes?: number;
}): string {
  const maxNodes = Math.max(1, Math.min(32, Math.floor(params.maxNodes ?? 12)));
  return [
    'You are the Opsly Hermes Commander. PLAN ONLY. Do not edit files, run deploys, create branches, or mutate production.',
    '',
    'Convert the objective into one valid TaskGraphV1 JSON object and return JSON only (no markdown fences, no commentary).',
    '',
    'Canonical rules:',
    '- one Opsly control plane; never create another queue, orchestrator, registry, or task store;',
    '- reuse existing capabilities before proposing new code;',
    '- parallelize only independent workstreams;',
    '- every write-capable node must have a non-empty conflictKey;',
    '- roles must be capability roles such as architecture, planning, implementation, debugging, review, security_review, tests, assistant;',
    '- local/free first; do not silently choose paid providers;',
    '- protected production/Peskids/data/schema/DNS/n8n/auth/billing work must require approval;',
    '- no direct push to main;',
    '- builder and independent reviewer must be separate nodes when code changes are material;',
    `- maximum nodes: ${maxNodes}.`,
    '',
    'Required JSON shape:',
    JSON.stringify(
      {
        version: 'task-graph-v1',
        goal: params.objective,
        nodes: [
          {
            id: 'short-stable-id',
            title: 'bounded task',
            workstream: 'domain.lane',
            conflictKey: 'canonical/write-scope-or-null',
            dependsOn: [],
            ownerRole: 'architecture|planning|implementation|debugging|review|security_review|tests|assistant',
            runtimeCapabilities: ['capability'],
            riskClass: 'low|medium|high',
            costClass: 'zero|free|paid',
            writeIntent: false,
            requiresApproval: false,
            acceptanceCriteria: ['observable success criterion'],
            evidenceRequirements: ['required proof'],
          },
        ],
      },
      null,
      2
    ),
    '',
    'Objective:',
    params.objective.trim(),
  ].join('\n');
}

function candidateText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  for (const key of ['result', 'response_content', 'content', 'output', 'text']) {
    const nested = candidateText(record[key]);
    if (nested) return nested;
  }
  return null;
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const first = body.indexOf('{');
  const last = body.lastIndexOf('}');
  return first >= 0 && last > first ? body.slice(first, last + 1) : body;
}

export function parseHermesCommanderResult(value: unknown): TaskGraphV1 {
  const text = candidateText(value);
  if (!text) throw new Error('HERMES_COMMANDER_RESULT_MISSING');
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch (error) {
    throw new Error(
      `HERMES_COMMANDER_JSON_INVALID: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return parseTaskGraphV1(parsed);
}

export function inspectArmyGraph(
  graph: TaskGraphV1,
  options: { maxNodes?: number; allowPaid?: boolean } = {}
): ArmyGraphIssue[] {
  const issues: ArmyGraphIssue[] = [];
  const maxNodes = Math.max(1, Math.min(32, Math.floor(options.maxNodes ?? 12)));
  if (graph.nodes.length > maxNodes) {
    issues.push({ code: 'TOO_MANY_NODES', actual: graph.nodes.length, max: maxNodes });
  }
  for (const node of graph.nodes) {
    if (node.writeIntent && !node.conflictKey?.trim()) {
      issues.push({ code: 'WRITE_CONFLICT_KEY_REQUIRED', nodeId: node.id });
    }
    if (node.costClass === 'paid' && options.allowPaid !== true) {
      issues.push({ code: 'PAID_NODE', nodeId: node.id });
    }
    if (node.requiresApproval) {
      issues.push({ code: 'APPROVAL_REQUIRED', nodeId: node.id });
    }
  }
  return issues;
}

export function armyNodeDisposition(
  node: TaskGraphNode,
  options: { allowPaid?: boolean } = {}
): ArmyNodeDisposition {
  if (node.requiresApproval) return { status: 'held', reason: 'approval_required' };
  if (node.costClass === 'paid' && options.allowPaid !== true) {
    return { status: 'held', reason: 'paid' };
  }
  return { status: 'dispatchable' };
}

export function buildArmyNodePrompt(graph: TaskGraphV1, node: TaskGraphNode): string {
  return [
    '[OPSLY HERMES ARMY TASK]',
    `Objective: ${graph.goal}`,
    `Task: ${node.title}`,
    `Task id: ${node.id}`,
    `Role: ${node.ownerRole}`,
    `Workstream: ${node.workstream}`,
    `Risk: ${node.riskClass}`,
    `Cost: ${node.costClass}`,
    `Write intent: ${node.writeIntent}`,
    '',
    'Acceptance criteria:',
    ...node.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    'Evidence required:',
    ...node.evidenceRequirements.map((item) => `- ${item}`),
    '',
    'Execution rules:',
    '- read AGENTS.md and canonical owners before acting;',
    '- reuse existing implementation and join existing work instead of duplicating it;',
    '- stay inside this bounded task/workstream;',
    '- never push directly to main;',
    '- no production deploy, secret rotation, production data mutation, DNS/firewall changes, or n8n side effects unless this task has explicit governed approval;',
    '- if blocked, return BLOCKED with concrete evidence instead of inventing success;',
    '- return concise result and evidence for the commander.',
    '[/OPSLY HERMES ARMY TASK]',
  ].join('\n');
}

export function buildArmyNodeSubmitBody(params: {
  objectiveId: string;
  tenantSlug: string;
  graph: TaskGraphV1;
  node: TaskGraphNode;
  maxSteps?: number;
}): ArmyNodeSubmitBody {
  const { objectiveId, tenantSlug, graph, node } = params;
  if (node.writeIntent && !node.conflictKey?.trim()) {
    throw new Error(`WRITE_CONFLICT_KEY_REQUIRED: ${node.id}`);
  }
  const requestId = `${objectiveId}:${node.id}`;
  const context: Record<string, unknown> = {
    source: HERMES_ARMY_CONTROLLER_VERSION,
    objective_id: objectiveId,
    task_id: requestId,
    workstream: node.workstream,
    army_role: node.ownerRole,
    task_graph_version: graph.version,
    depends_on: node.dependsOn,
    runtime_capabilities: node.runtimeCapabilities,
    risk_class: node.riskClass,
    cost_class: node.costClass,
    requires_pr: node.writeIntent,
    requires_approval: node.requiresApproval,
    acceptance_criteria: node.acceptanceCriteria,
    evidence_requirements: node.evidenceRequirements,
  };
  if (node.conflictKey?.trim()) {
    context.conflict_key = node.conflictKey.trim();
    context.semantic_scope = node.conflictKey.trim();
  }

  return {
    agent: null,
    agent_role: node.ownerRole,
    goal: node.title,
    tenant_slug: tenantSlug,
    request_id: requestId,
    correlation_id: objectiveId,
    max_steps: Math.max(1, Math.min(40, Math.floor(params.maxSteps ?? 12))),
    prompt_content: buildArmyNodePrompt(graph, node),
    context,
  };
}

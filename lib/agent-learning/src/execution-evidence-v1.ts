import type { CanonicalTaskId } from './types.js';

export type ExecutionFailureCategory =
  | 'runtime'
  | 'timeout'
  | 'policy'
  | 'dependency'
  | 'verification'
  | 'teardown'
  | 'cancelled'
  | 'unknown';

export type ExecutionTeardownState =
  | 'not_required'
  | 'confirmed'
  | 'failed'
  | 'unknown';

export type ExecutionCostClass = 'zero' | 'free' | 'paid' | 'unknown';

export type ExecutionStatusV1 = 'success' | 'failure' | 'timeout' | 'cancelled';

export type BoundedExecutionResultV1 = {
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ExecutionEvalResultV1 = {
  evaluator: string;
  passed: boolean;
  score?: number;
  notes?: string[];
};

export type ExecutionEvidenceV1 = {
  schema_version: 'execution-evidence-v1';
  evidence_id: string;
  request_id: CanonicalTaskId;
  task_id: CanonicalTaskId;
  tenant_slug?: string;
  workstream?: string;
  selected_runtime: string;
  selected_model?: string;
  node_id?: string;
  queued_at?: string;
  claimed_at?: string;
  started_at: string;
  completed_at: string;
  ephemeral_session_id?: string;
  result: BoundedExecutionResultV1;
  retry_count: number;
  failure_category?: ExecutionFailureCategory;
  eval_result?: ExecutionEvalResultV1;
  teardown_state: ExecutionTeardownState;
  cost_class: ExecutionCostClass;
  approval_ref?: string;
  status: ExecutionStatusV1;
};

const SECRET_PATTERNS: RegExp[] = [
  /(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi,
  /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret)\s*[:=]\s*)[^\s,;]+/gi,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];

function redactText(value: string, maxLength: number): string {
  let next = value.slice(0, maxLength);
  next = next.replace(SECRET_PATTERNS[0], '$1[REDACTED]');
  next = next.replace(SECRET_PATTERNS[1], '$1[REDACTED]');
  next = next.replace(SECRET_PATTERNS[2], '[REDACTED_JWT]');
  return next;
}

function nonEmpty(name: string, value: string): string {
  const next = value.trim();
  if (!next) throw new Error(`ExecutionEvidenceV1 requires ${name}`);
  return next;
}

function validateTimestamp(name: string, value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`ExecutionEvidenceV1 requires valid ${name}`);
  }
  return value;
}

export function normalizeExecutionEvidenceV1(
  evidence: ExecutionEvidenceV1
): ExecutionEvidenceV1 {
  const evidenceId = nonEmpty('evidence_id', evidence.evidence_id);
  const requestId = nonEmpty('request_id', evidence.request_id);
  const taskId = nonEmpty('task_id', evidence.task_id);
  if (requestId !== taskId) {
    throw new Error(
      'ExecutionEvidenceV1 task_id must equal canonical AgentTask request_id'
    );
  }

  const selectedRuntime = nonEmpty('selected_runtime', evidence.selected_runtime);
  const startedAt = validateTimestamp('started_at', evidence.started_at);
  const completedAt = validateTimestamp('completed_at', evidence.completed_at);
  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    throw new Error('ExecutionEvidenceV1 completed_at cannot precede started_at');
  }

  if (!Number.isInteger(evidence.retry_count) || evidence.retry_count < 0) {
    throw new Error('ExecutionEvidenceV1 retry_count must be an integer >= 0');
  }

  const metadata = evidence.result.metadata
    ? Object.fromEntries(
        Object.entries(evidence.result.metadata).map(([key, value]) => [
          redactText(key, 120),
          typeof value === 'string' ? redactText(value, 500) : value,
        ])
      )
    : undefined;

  const evalResult = evidence.eval_result
    ? {
        ...evidence.eval_result,
        evaluator: redactText(nonEmpty('eval_result.evaluator', evidence.eval_result.evaluator), 200),
        notes: evidence.eval_result.notes?.map((note) => redactText(note, 500)),
      }
    : undefined;

  return {
    ...evidence,
    schema_version: 'execution-evidence-v1',
    evidence_id: evidenceId,
    request_id: requestId,
    task_id: taskId,
    tenant_slug: evidence.tenant_slug?.trim() || undefined,
    workstream: evidence.workstream?.trim() || undefined,
    selected_runtime: selectedRuntime,
    selected_model: evidence.selected_model?.trim() || undefined,
    node_id: evidence.node_id?.trim() || undefined,
    queued_at: evidence.queued_at
      ? validateTimestamp('queued_at', evidence.queued_at)
      : undefined,
    claimed_at: evidence.claimed_at
      ? validateTimestamp('claimed_at', evidence.claimed_at)
      : undefined,
    started_at: startedAt,
    completed_at: completedAt,
    ephemeral_session_id: evidence.ephemeral_session_id?.trim() || undefined,
    result: {
      summary: redactText(evidence.result.summary ?? '', 2000),
      metadata,
    },
    eval_result: evalResult,
    approval_ref: evidence.approval_ref?.trim() || undefined,
  };
}

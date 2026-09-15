import type { CanonicalTaskId } from './types.js';

export type WorkTerminalStateV1 =
  | 'retryable'
  | 'ready_to_merge'
  | 'merged'
  | 'cleaned'
  | 'needs_human';

export type WorkHandoffV1 = {
  schema_version: 'work-handoff-v1';
  handoff_id: string;
  request_id: CanonicalTaskId;
  work_id: string;
  agent_id: string;
  runtime: string;
  attempt: number;
  objective: string;
  terminal_state: WorkTerminalStateV1;
  evidence_ids: string[];
  issue_or_pr?: string;
  branch?: string;
  head_sha?: string;
  touched_surfaces: string[];
  decisions: string[];
  validations: string[];
  blockers: string[];
  next_step: string;
  durable_knowledge_changed: boolean;
  documentation_refs: string[];
  recorded_at: string;
};

export type WorkClosureCheckV1 = {
  allowed: boolean;
  blockers: string[];
  handoff: WorkHandoffV1;
};

const SECRET_PATTERNS: RegExp[] = [
  /(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi,
  /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret)\s*[:=]\s*)[^\s,;]+/gi,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];

function redact(value: string, maxLength = 1000): string {
  let next = value.trim().slice(0, maxLength);
  next = next.replace(SECRET_PATTERNS[0], '$1[REDACTED]');
  next = next.replace(SECRET_PATTERNS[1], '$1[REDACTED]');
  next = next.replace(SECRET_PATTERNS[2], '[REDACTED_JWT]');
  return next;
}

function required(name: string, value: string): string {
  const next = redact(value);
  if (!next) throw new Error(`WorkHandoffV1 requires ${name}`);
  return next;
}

function strings(values: string[]): string[] {
  return values.map((value) => redact(value)).filter(Boolean);
}

export function normalizeWorkHandoffV1(input: WorkHandoffV1): WorkHandoffV1 {
  if (!Number.isInteger(input.attempt) || input.attempt < 1) {
    throw new Error('WorkHandoffV1 attempt must be an integer >= 1');
  }
  if (!Number.isFinite(Date.parse(input.recorded_at))) {
    throw new Error('WorkHandoffV1 requires valid recorded_at');
  }

  return {
    ...input,
    schema_version: 'work-handoff-v1',
    handoff_id: required('handoff_id', input.handoff_id),
    request_id: required('request_id', input.request_id),
    work_id: required('work_id', input.work_id),
    agent_id: required('agent_id', input.agent_id),
    runtime: required('runtime', input.runtime),
    objective: required('objective', input.objective),
    evidence_ids: strings(input.evidence_ids),
    issue_or_pr: input.issue_or_pr ? redact(input.issue_or_pr) : undefined,
    branch: input.branch ? redact(input.branch) : undefined,
    head_sha: input.head_sha ? redact(input.head_sha) : undefined,
    touched_surfaces: strings(input.touched_surfaces),
    decisions: strings(input.decisions),
    validations: strings(input.validations),
    blockers: strings(input.blockers),
    next_step: required('next_step', input.next_step),
    documentation_refs: strings(input.documentation_refs),
  };
}

/**
 * Fail-closed Definition-of-Done guard for material autonomous work.
 * Retries/NEEDS_HUMAN still require evidence and a handoff so another worker can continue.
 * Successful closure additionally requires validation and, when durable knowledge changed,
 * a canonical documentation/Brain reference.
 */
export function checkWorkClosureV1(input: WorkHandoffV1): WorkClosureCheckV1 {
  const handoff = normalizeWorkHandoffV1(input);
  const blockers: string[] = [];

  if (handoff.evidence_ids.length === 0) blockers.push('missing_execution_evidence');

  const successfulClosure =
    handoff.terminal_state === 'ready_to_merge' ||
    handoff.terminal_state === 'merged' ||
    handoff.terminal_state === 'cleaned';

  if (successfulClosure && handoff.validations.length === 0) {
    blockers.push('missing_validation_evidence');
  }
  if (
    successfulClosure &&
    handoff.durable_knowledge_changed &&
    handoff.documentation_refs.length === 0
  ) {
    blockers.push('missing_documentation_writeback');
  }
  if (handoff.terminal_state === 'retryable' && handoff.blockers.length === 0) {
    blockers.push('retry_without_blocker');
  }

  return { allowed: blockers.length === 0, blockers, handoff };
}

export function assertWorkClosureV1(input: WorkHandoffV1): WorkHandoffV1 {
  const result = checkWorkClosureV1(input);
  if (!result.allowed) {
    throw new Error(`Work closure blocked: ${result.blockers.join(', ')}`);
  }
  return result.handoff;
}

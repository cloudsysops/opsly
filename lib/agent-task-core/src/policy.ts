import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';

export type PolicyDecision = 'allow' | 'deny' | 'require_approval';

export type PolicyReasonCode =
  | 'DRY_RUN_DEFAULT'
  | 'ENQUEUE_EXPLICIT'
  | 'WRITE_REQUIRES_APPROVAL'
  | 'NETWORK_REQUIRES_APPROVAL'
  | 'BROWSER_REQUIRES_APPROVAL'
  | 'INFRA_REQUIRES_APPROVAL'
  | 'COST_LIMIT_EXCEEDED'
  | 'TIMEOUT_INVALID'
  | 'MAX_ATTEMPTS_INVALID'
  | 'TENANT_REQUIRED'
  | 'REQUEST_ID_REQUIRED';

export type PolicyResult = {
  decision: PolicyDecision;
  reasons: PolicyReasonCode[];
};

export type EvaluatePolicyOptions = {
  /** Per-tenant USD cap for a single task; undefined = no cost gate. */
  tenantMaxCostUsd?: number;
  /** When true, treat write/network/browser/infra as auto-approved (test fixtures only). */
  autoApproveSensitive?: boolean;
};

/**
 * Deterministic policy for AgentTaskEnvelopeV1.
 * dry_run is always allow; enqueue/synchronous may require approval for sensitive ops.
 */
export function evaluateAgentTaskPolicy(
  envelope: AgentTaskEnvelopeV1,
  options: EvaluatePolicyOptions = {}
): PolicyResult {
  const reasons: PolicyReasonCode[] = [];

  if (!envelope.tenant_slug?.trim()) {
    return { decision: 'deny', reasons: ['TENANT_REQUIRED'] };
  }
  if (!envelope.request_id?.trim()) {
    return { decision: 'deny', reasons: ['REQUEST_ID_REQUIRED'] };
  }
  if (envelope.timeout_ms < 1_000 || envelope.timeout_ms > 3_600_000) {
    return { decision: 'deny', reasons: ['TIMEOUT_INVALID'] };
  }
  if (envelope.max_attempts < 1 || envelope.max_attempts > 5) {
    return { decision: 'deny', reasons: ['MAX_ATTEMPTS_INVALID'] };
  }

  const cost = envelope.budget.max_cost_usd;
  if (
    typeof options.tenantMaxCostUsd === 'number' &&
    typeof cost === 'number' &&
    cost > options.tenantMaxCostUsd
  ) {
    return { decision: 'deny', reasons: ['COST_LIMIT_EXCEEDED'] };
  }

  if (envelope.execution_mode === 'dry_run') {
    return { decision: 'allow', reasons: ['DRY_RUN_DEFAULT'] };
  }

  if (envelope.execution_mode === 'approval_required') {
    return { decision: 'require_approval', reasons: ['ENQUEUE_EXPLICIT'] };
  }

  reasons.push('ENQUEUE_EXPLICIT');

  if (!options.autoApproveSensitive) {
    if (envelope.constraints.write_allowed) {
      reasons.push('WRITE_REQUIRES_APPROVAL');
    }
    if (envelope.constraints.network_allowed) {
      reasons.push('NETWORK_REQUIRES_APPROVAL');
    }
    if (envelope.constraints.browser_allowed || envelope.task_type === 'browser') {
      reasons.push('BROWSER_REQUIRES_APPROVAL');
    }
    if (envelope.task_type === 'infra') {
      reasons.push('INFRA_REQUIRES_APPROVAL');
    }
  }

  const needsApproval = reasons.some((r) =>
    [
      'WRITE_REQUIRES_APPROVAL',
      'NETWORK_REQUIRES_APPROVAL',
      'BROWSER_REQUIRES_APPROVAL',
      'INFRA_REQUIRES_APPROVAL',
    ].includes(r)
  );

  if (needsApproval) {
    return { decision: 'require_approval', reasons };
  }

  return { decision: 'allow', reasons };
}

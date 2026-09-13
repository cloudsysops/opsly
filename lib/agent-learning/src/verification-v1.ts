import type { ExecutionEvidenceV1 } from './execution-evidence-v1.js';

export type VerificationOutcomeV1 = 'PASS' | 'FAIL' | 'BLOCKED';

export type VerificationClassV1 =
  | 'schema_contracts'
  | 'tests'
  | 'security_policy'
  | 'architecture_invariants'
  | 'product_acceptance'
  | 'physical_validation';

export type VerificationFailureClassV1 =
  | 'CODE'
  | 'INFRA_TRANSIENT'
  | 'POLICY_GATE'
  | 'UPSTREAM_DEPENDENCY'
  | 'RUNTIME_UNAVAILABLE'
  | 'EVIDENCE_INSUFFICIENT';

export type VerificationCheckV1 = {
  check_class: VerificationClassV1;
  passed: boolean;
  blocked?: boolean;
  invariant: string;
  evidence_refs: string[];
  failure_class?: VerificationFailureClassV1;
  repair_recommendation?: string;
};

export type IndependentVerificationInputV1 = {
  request_id: string;
  builder_agent_id: string;
  verifier_agent_id: string;
  verifier_read_only: boolean;
  merge_capable: boolean;
  execution_evidence: ExecutionEvidenceV1;
  checks: VerificationCheckV1[];
  repair_attempt: number;
  max_repair_attempts?: number;
};

export type IndependentVerificationV1 = {
  schema_version: 'IndependentVerificationV1';
  request_id: string;
  outcome: VerificationOutcomeV1;
  verifier_agent_id: string;
  evidence_refs: string[];
  failing_invariant?: string;
  failure_class?: VerificationFailureClassV1;
  safe_retry: boolean;
  repair_recommendation?: string;
  repair_attempt: number;
  max_repair_attempts: number;
  ordered_checks: VerificationCheckV1[];
};

export const VERIFICATION_ORDER_V1: VerificationClassV1[] = [
  'schema_contracts',
  'tests',
  'security_policy',
  'architecture_invariants',
  'product_acceptance',
  'physical_validation',
];

function rank(check: VerificationCheckV1): number {
  return VERIFICATION_ORDER_V1.indexOf(check.check_class);
}

function refs(checks: VerificationCheckV1[]): string[] {
  return [...new Set(checks.flatMap((check) => check.evidence_refs))].sort();
}

function retryable(
  failureClass: VerificationFailureClassV1 | undefined,
  attempt: number,
  maxAttempts: number
): boolean {
  if (attempt >= maxAttempts) return false;
  return failureClass === 'CODE' || failureClass === 'INFRA_TRANSIENT';
}

function blockedResult(
  input: IndependentVerificationInputV1,
  checks: VerificationCheckV1[],
  failureClass: VerificationFailureClassV1,
  invariant: string,
  recommendation: string
): IndependentVerificationV1 {
  const maxAttempts = input.max_repair_attempts ?? 2;
  return {
    schema_version: 'IndependentVerificationV1',
    request_id: input.request_id,
    outcome: 'BLOCKED',
    verifier_agent_id: input.verifier_agent_id,
    evidence_refs: refs(checks),
    failing_invariant: invariant,
    failure_class: failureClass,
    safe_retry: retryable(failureClass, input.repair_attempt, maxAttempts),
    repair_recommendation: recommendation,
    repair_attempt: input.repair_attempt,
    max_repair_attempts: maxAttempts,
    ordered_checks: checks,
  };
}

/**
 * Evidence-backed independent verification.
 * This function classifies and gates; it never patches the builder branch.
 */
export function verifyIndependentlyV1(
  input: IndependentVerificationInputV1
): IndependentVerificationV1 {
  if (!input.request_id.trim()) {
    throw new Error('IndependentVerificationV1 requires request_id');
  }
  if (input.execution_evidence.request_id !== input.request_id) {
    throw new Error('Verification request_id must match execution evidence');
  }
  if (!Number.isInteger(input.repair_attempt) || input.repair_attempt < 0) {
    throw new Error('repair_attempt must be an integer >= 0');
  }

  const maxAttempts = input.max_repair_attempts ?? 2;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) {
    throw new Error('max_repair_attempts must be an integer between 1 and 2');
  }

  const orderedChecks = [...input.checks].sort(
    (a, b) => rank(a) - rank(b) || a.invariant.localeCompare(b.invariant)
  );

  if (!input.verifier_read_only) {
    return blockedResult(
      input,
      orderedChecks,
      'POLICY_GATE',
      'verifier_must_be_read_only',
      'Run verification with a read-only reviewer identity.'
    );
  }

  if (
    input.merge_capable &&
    input.builder_agent_id.trim() === input.verifier_agent_id.trim()
  ) {
    return blockedResult(
      input,
      orderedChecks,
      'EVIDENCE_INSUFFICIENT',
      'independent_verifier_required',
      'Assign a verifier different from the write-capable builder.'
    );
  }

  if (
    input.execution_evidence.status !== 'success' ||
    input.execution_evidence.teardown_state !== 'confirmed'
  ) {
    return blockedResult(
      input,
      orderedChecks,
      'EVIDENCE_INSUFFICIENT',
      'successful_execution_and_teardown_required',
      'Attach successful execution evidence with confirmed teardown before verification.'
    );
  }

  const blocked = orderedChecks.find((check) => check.blocked === true);
  if (blocked) {
    const failureClass = blocked.failure_class ?? 'UPSTREAM_DEPENDENCY';
    return blockedResult(
      input,
      orderedChecks,
      failureClass,
      blocked.invariant,
      blocked.repair_recommendation ?? 'Resolve the blocker and rerun only the affected verification scope.'
    );
  }

  const failed = orderedChecks.find((check) => check.passed === false);
  if (failed) {
    const failureClass = failed.failure_class ?? 'CODE';
    return {
      schema_version: 'IndependentVerificationV1',
      request_id: input.request_id,
      outcome: 'FAIL',
      verifier_agent_id: input.verifier_agent_id,
      evidence_refs: refs(orderedChecks),
      failing_invariant: failed.invariant,
      failure_class: failureClass,
      safe_retry: retryable(failureClass, input.repair_attempt, maxAttempts),
      repair_recommendation:
        failed.repair_recommendation ??
        (failureClass === 'CODE'
          ? 'Create a bounded repair task for the failing invariant, then rerun verification.'
          : 'Resolve the classified failure before retrying verification.'),
      repair_attempt: input.repair_attempt,
      max_repair_attempts: maxAttempts,
      ordered_checks: orderedChecks,
    };
  }

  if (input.merge_capable && orderedChecks.length === 0) {
    return blockedResult(
      input,
      orderedChecks,
      'EVIDENCE_INSUFFICIENT',
      'verification_checks_required',
      'Attach evidence-backed verification checks before marking merge-capable work DONE.'
    );
  }

  return {
    schema_version: 'IndependentVerificationV1',
    request_id: input.request_id,
    outcome: 'PASS',
    verifier_agent_id: input.verifier_agent_id,
    evidence_refs: refs(orderedChecks),
    safe_retry: false,
    repair_attempt: input.repair_attempt,
    max_repair_attempts: maxAttempts,
    ordered_checks: orderedChecks,
  };
}

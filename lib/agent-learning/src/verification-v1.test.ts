import { describe, expect, it } from 'vitest';
import { verifyIndependentlyV1 } from './verification-v1.js';
import type { ExecutionEvidenceV1 } from './execution-evidence-v1.js';

function evidence(overrides: Partial<ExecutionEvidenceV1> = {}): ExecutionEvidenceV1 {
  return {
    schema_version: 'execution-evidence-v1',
    evidence_id: 'ev-verify-1',
    request_id: 'req-verify-1',
    task_id: 'req-verify-1',
    selected_runtime: 'local_opencode',
    selected_model: 'qwen3:14b',
    node_id: 'pc-gamer',
    started_at: '2026-09-13T15:00:00.000Z',
    completed_at: '2026-09-13T15:01:00.000Z',
    result: { summary: 'bounded result' },
    retry_count: 0,
    teardown_state: 'confirmed',
    cost_class: 'zero',
    status: 'success',
    ...overrides,
  };
}

describe('IndependentVerificationV1', () => {
  it('passes independently verified evidence', () => {
    const result = verifyIndependentlyV1({
      request_id: 'req-verify-1',
      builder_agent_id: 'opencode',
      verifier_agent_id: 'codex-reviewer',
      verifier_read_only: true,
      merge_capable: true,
      execution_evidence: evidence(),
      repair_attempt: 0,
      checks: [
        {
          check_class: 'tests',
          passed: true,
          invariant: 'unit_tests_green',
          evidence_refs: ['gha://run/1'],
        },
        {
          check_class: 'schema_contracts',
          passed: true,
          invariant: 'schema_valid',
          evidence_refs: ['artifact://schema'],
        },
      ],
    });
    expect(result.outcome).toBe('PASS');
    expect(result.ordered_checks.map((c) => c.check_class)).toEqual([
      'schema_contracts',
      'tests',
    ]);
  });

  it('blocks self-approval for merge-capable work', () => {
    const result = verifyIndependentlyV1({
      request_id: 'req-verify-1',
      builder_agent_id: 'opencode',
      verifier_agent_id: 'opencode',
      verifier_read_only: true,
      merge_capable: true,
      execution_evidence: evidence(),
      repair_attempt: 0,
      checks: [],
    });
    expect(result.outcome).toBe('BLOCKED');
    expect(result.failing_invariant).toBe('independent_verifier_required');
  });

  it('classifies code failure and permits at most two bounded repairs', () => {
    const input = {
      request_id: 'req-verify-1',
      builder_agent_id: 'opencode',
      verifier_agent_id: 'codex-reviewer',
      verifier_read_only: true,
      merge_capable: true,
      execution_evidence: evidence(),
      checks: [
        {
          check_class: 'tests' as const,
          passed: false,
          invariant: 'integration_tests_green',
          evidence_refs: ['gha://run/2'],
          failure_class: 'CODE' as const,
        },
      ],
    };
    expect(
      verifyIndependentlyV1({ ...input, repair_attempt: 0 }).safe_retry
    ).toBe(true);
    expect(
      verifyIndependentlyV1({ ...input, repair_attempt: 2 }).safe_retry
    ).toBe(false);
  });

  it('blocks policy gates without recommending an automatic retry', () => {
    const result = verifyIndependentlyV1({
      request_id: 'req-verify-1',
      builder_agent_id: 'opencode',
      verifier_agent_id: 'codex-reviewer',
      verifier_read_only: true,
      merge_capable: true,
      execution_evidence: evidence(),
      repair_attempt: 0,
      checks: [
        {
          check_class: 'security_policy',
          passed: false,
          blocked: true,
          invariant: 'production_approval_required',
          evidence_refs: ['policy://approval'],
          failure_class: 'POLICY_GATE',
        },
      ],
    });
    expect(result.outcome).toBe('BLOCKED');
    expect(result.failure_class).toBe('POLICY_GATE');
    expect(result.safe_retry).toBe(false);
  });

  it('requires successful execution evidence and teardown', () => {
    const result = verifyIndependentlyV1({
      request_id: 'req-verify-1',
      builder_agent_id: 'opencode',
      verifier_agent_id: 'codex-reviewer',
      verifier_read_only: true,
      merge_capable: true,
      execution_evidence: evidence({ teardown_state: 'failed', status: 'failure' }),
      repair_attempt: 0,
      checks: [],
    });
    expect(result.outcome).toBe('BLOCKED');
    expect(result.failure_class).toBe('EVIDENCE_INSUFFICIENT');
  });

  it('rejects a verifier that is not read-only', () => {
    const result = verifyIndependentlyV1({
      request_id: 'req-verify-1',
      builder_agent_id: 'opencode',
      verifier_agent_id: 'codex-reviewer',
      verifier_read_only: false,
      merge_capable: true,
      execution_evidence: evidence(),
      repair_attempt: 0,
      checks: [],
    });
    expect(result.outcome).toBe('BLOCKED');
    expect(result.failing_invariant).toBe('verifier_must_be_read_only');
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  containsProtectedSurface,
  evaluateRepairRequest,
} from '../lib/software-factory-repair-policy.mjs';

const policy = {
  max_auto_attempts: 1,
  auto_actions: { INFRA_TRANSIENT: ['rerun_failed_jobs'] },
  manual_only_failure_classes: [
    'CODE',
    'POLICY_GATE',
    'UPSTREAM_DEPENDENCY',
    'RUNTIME_UNAVAILABLE',
    'EVIDENCE_INSUFFICIENT',
    'BLOCKED_ACCESS',
  ],
  protected_patterns: [
    'peskids',
    'production',
    'n8n',
    'supabase/migrations/',
    'scripts/ops/software-factory-safe-repair.mjs',
  ],
  forbidden_actions: ['merge', 'deploy'],
};

function evidence(overrides = {}) {
  return {
    current_head_sha: 'abc',
    files: ['apps/admin/page.tsx'],
    run_head_sha: 'abc',
    run_pr_number: 10,
    run_event: 'pull_request',
    run_status: 'completed',
    run_conclusion: 'failure',
    run_attempt: 1,
    verified_failure_class: 'INFRA_TRANSIENT',
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    work_id: 'sf-1',
    pr_number: 10,
    expected_head_sha: 'abc',
    failure_class: 'INFRA_TRANSIENT',
    action: 'rerun_failed_jobs',
    affected_paths: ['apps/admin/page.tsx'],
    ...overrides,
  };
}

test('allows one verified transient rerun on unchanged non-protected evidence', () => {
  const decision = evaluateRepairRequest(request(), policy, evidence());
  assert.equal(decision.allowed, true);
  assert.equal(decision.mode, 'AUTO_SAFE');
});

test('blocks requester classification that does not match verified GitHub evidence', () => {
  const decision = evaluateRepairRequest(
    request({ failure_class: 'CODE' }),
    policy,
    evidence(),
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /does not match verified/);
});

test('blocks missing verified failure classification', () => {
  const decision = evaluateRepairRequest(
    request(),
    policy,
    evidence({ verified_failure_class: '' }),
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /missing verified failure/);
});

test('blocks manual-only classes even if a future policy accidentally auto-allows them', () => {
  const permissive = {
    ...policy,
    auto_actions: { ...policy.auto_actions, CODE: ['rerun_failed_jobs'] },
  };
  const decision = evaluateRepairRequest(
    request({ failure_class: 'CODE' }),
    permissive,
    evidence({ verified_failure_class: 'CODE' }),
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /manual-only/);
});

test('blocks protected product and control-plane surfaces', () => {
  assert.equal(containsProtectedSurface(['apps/peskids/page.tsx'], policy.protected_patterns), true);
  const decision = evaluateRepairRequest(
    request({ affected_paths: ['scripts/ops/software-factory-safe-repair.mjs'] }),
    policy,
    evidence({ files: ['scripts/ops/software-factory-safe-repair.mjs'] }),
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /protected surface/);
});

test('blocks stale or missing exact-head evidence', () => {
  const stale = evaluateRepairRequest(request(), policy, evidence({ current_head_sha: 'new' }));
  assert.equal(stale.allowed, false);
  assert.match(stale.reasons.join(' '), /head sha changed/);

  const missing = evaluateRepairRequest(
    request(),
    policy,
    evidence({ current_head_sha: null, run_head_sha: null }),
  );
  assert.equal(missing.allowed, false);
  assert.match(missing.reasons.join(' '), /missing current head sha/);
  assert.match(missing.reasons.join(' '), /missing workflow run head sha/);
});

test('blocks missing or exhausted workflow run_attempt evidence', () => {
  const missing = evaluateRepairRequest(
    request(),
    policy,
    evidence({ run_attempt: undefined }),
  );
  assert.equal(missing.allowed, false);
  assert.match(missing.reasons.join(' '), /invalid workflow run_attempt/);

  const exhausted = evaluateRepairRequest(request(), policy, evidence({ run_attempt: 2 }));
  assert.equal(exhausted.allowed, false);
  assert.match(exhausted.reasons.join(' '), /attempt limit/);
});

test('blocks wrong PR binding, event, status or conclusion', () => {
  const decision = evaluateRepairRequest(
    request(),
    policy,
    evidence({
      run_pr_number: 99,
      run_event: 'workflow_dispatch',
      run_status: 'in_progress',
      run_conclusion: 'success',
    }),
  );
  assert.equal(decision.allowed, false);
  const reasons=decision.reasons.join(' ');
  assert.match(reasons, /not bound/);
  assert.match(reasons, /not pull_request/);
  assert.match(reasons, /not completed/);
  assert.match(reasons, /not failed/);
});

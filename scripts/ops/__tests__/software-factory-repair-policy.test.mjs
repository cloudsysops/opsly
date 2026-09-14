import assert from 'node:assert/strict';
import test from 'node:test';
import {
  containsProtectedSurface,
  evaluateRepairRequest,
} from '../lib/software-factory-repair-policy.mjs';

const policy = {
  max_auto_attempts: 1,
  auto_actions: { 'INFRA_TRANSIENT': ['rerun_failed_jobs'] },
  protected_patterns: ['peskids', 'production', 'n8n', 'supabase/migrations/'],
  forbidden_actions: ['merge', 'deploy'],
};

test('allows one bounded transient CI rerun on an unchanged non-protected head', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-1',
      pr_number: 10,
      expected_head_sha: 'abc',
      failure_class: 'infra/transient',
      action: 'rerun_failed_jobs',
      attempt: 0,
      affected_paths: ['apps/admin/page.tsx'],
    },
    policy,
    { current_head_sha: 'abc', files: ['apps/admin/page.tsx'] },
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.mode, 'AUTO_SAFE');
});

test('blocks code fixes from the bounded automatic repair lane', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-2',
      pr_number: 11,
      expected_head_sha: 'abc',
      failure_class: 'CODE',
      action: 'rerun_failed_jobs',
      attempt: 0,
    },
    policy,
    { current_head_sha: 'abc', files: [] },
  );
  assert.equal(decision.allowed, false);
});

test('blocks protected product and production surfaces', () => {
  assert.equal(containsProtectedSurface(['apps/peskids/page.tsx'], policy.protected_patterns), true);
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-3',
      pr_number: 12,
      expected_head_sha: 'abc',
      failure_class: 'infra/transient',
      action: 'rerun_failed_jobs',
      attempt: 0,
    },
    policy,
    { current_head_sha: 'abc', files: ['apps/peskids/page.tsx'] },
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /protected surface/);
});

test('blocks stale repair requests after the PR head moves', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-4',
      pr_number: 13,
      expected_head_sha: 'old',
      failure_class: 'infra/transient',
      action: 'rerun_failed_jobs',
      attempt: 0,
    },
    policy,
    { current_head_sha: 'new', files: [] },
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /head sha changed/);
});

test('enforces max automatic repair attempts', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-5',
      pr_number: 14,
      expected_head_sha: 'abc',
      failure_class: 'infra/transient',
      action: 'rerun_failed_jobs',
      attempt: 1,
    },
    policy,
    { current_head_sha: 'abc', files: [], run_attempt: 2 },
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /attempt limit/);
});


test('normalizes legacy separators into the Mission Control failure taxonomy', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-legacy',
      pr_number: 15,
      expected_head_sha: 'abc',
      failure_class: 'infra/transient',
      action: 'rerun_failed_jobs',
      attempt: 0,
    },
    policy,
    { current_head_sha: 'abc', files: [] },
  );
  assert.equal(decision.failure_class, 'INFRA_TRANSIENT');
  assert.equal(decision.allowed, true);
});


test('blocks a workflow run from another head even when the PR head is unchanged', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-run-head',
      pr_number: 16,
      expected_head_sha: 'abc',
      failure_class: 'INFRA_TRANSIENT',
      action: 'rerun_failed_jobs',
    },
    policy,
    {
      current_head_sha: 'abc',
      files: [],
      run_head_sha: 'def',
      run_pr_number: 16,
      run_event: 'pull_request',
      run_status: 'completed',
      run_conclusion: 'failure',
      run_attempt: 1,
    },
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /run head sha/);
});

test('blocks non-PR and non-failed workflow runs', () => {
  const decision = evaluateRepairRequest(
    {
      work_id: 'sf-run-event',
      pr_number: 17,
      expected_head_sha: 'abc',
      failure_class: 'INFRA_TRANSIENT',
      action: 'rerun_failed_jobs',
    },
    policy,
    {
      current_head_sha: 'abc',
      files: [],
      run_head_sha: 'abc',
      run_pr_number: 17,
      run_event: 'workflow_dispatch',
      run_status: 'completed',
      run_conclusion: 'success',
      run_attempt: 1,
    },
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reasons.join(' '), /not pull_request/);
  assert.match(decision.reasons.join(' '), /not failed/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFactoryTelemetry } from '../lib/software-factory-telemetry.mjs';

test('computes factory flow and verifier coverage from evidence', () => {
  const snapshot = buildFactoryTelemetry({
    workstreams: {
      claims_observed: true,
      runtime_sessions_observed: true,
      github_observed: true,
      active_claims: [{ work_id: 'a' }, { work_id: 'b' }],
      completed_claim_tombstones: 4,
      runtime_sessions: [
        { status: 'running' },
        { status: 'stopped' },
        { status: 'waiting_approval' },
      ],
      pull_requests: [
        { verifier: 'PASS', merge_readiness: 'READY' },
        { verifier: 'UNKNOWN', merge_readiness: 'BLOCKED' },
      ],
    },
    reconciliation: {
      mode: 'READ_ONLY',
      pullRequests: [
        { lane: 'MERGE_READY' },
        { lane: 'CHECK_FAILED' },
        { lane: 'CONFLICTED' },
      ],
    },
    policy: {
      verifier_coverage_target: 0.9,
      blocked_ratio_warn: 0.2,
      conflicted_pr_warn: 1,
      failed_check_warn: 1,
      merge_ready_backlog_warn: 5,
    },
  });

  assert.equal(snapshot.metrics.active_claims, 2);
  assert.equal(snapshot.metrics.live_runtime_sessions, 2);
  assert.equal(snapshot.metrics.verifier_coverage, 0.5);
  assert.equal(snapshot.metrics.reconciliation.check_failed, 1);
  assert.ok(snapshot.recommendations.some((item) => item.id === 'raise-verifier-coverage'));
  assert.ok(snapshot.recommendations.some((item) => item.id === 'repair-failing-checks'));
  assert.equal(snapshot.learning_state.status, 'OBSERVE_AND_RECOMMEND');
  assert.equal(snapshot.learning_state.canonical_owner, '@intcloudsysops/agent-learning');
  assert.equal(
    snapshot.learning_state.canonical_task_identity,
    'AgentTaskEnvelopeV1.request_id',
  );
  assert.ok(
    snapshot.recommendations.some(
      (item) => item.id === 'propagate-canonical-learning-identity',
    ),
  );
});

test('does not pretend persistent learning exists', () => {
  const snapshot = buildFactoryTelemetry({
    workstreams: {},
    reconciliation: {},
    policy: {},
  });
  assert.equal(snapshot.learning_state.persistent_history, false);
  assert.equal(snapshot.learning_state.continuous_durable_export, false);
  assert.equal(snapshot.learning_state.mission_control_scorecards, false);
  assert.equal(snapshot.learning_state.adaptive_routing, false);
});

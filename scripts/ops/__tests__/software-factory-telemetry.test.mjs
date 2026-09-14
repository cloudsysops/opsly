import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFactoryTelemetry } from '../lib/software-factory-telemetry.mjs';

const policy = {
  verifier_coverage_target: 0.9,
  blocked_ratio_warn: 0.2,
  conflicted_pr_warn: 1,
  behind_pr_warn: 3,
  failed_check_warn: 1,
  merge_ready_backlog_warn: 5,
};

function completeWorkstreams() {
  return {
    claims_observed: true,
    runtime_sessions_observed: true,
    github_observed: true,
    github_evidence_complete: true,
    active_claims: [{ work_id: 'a' }, { work_id: 'b' }],
    completed_claim_tombstones: 4,
    runtime_sessions: [
      { status: 'running' },
      { status: 'checkpointed' },
      { status: 'stopped' },
      { status: 'waiting_approval' },
    ],
    pull_requests: [
      { request_id: 'req-1', verifier: 'PASS', check_state: 'PASS', merge_readiness: 'READY' },
      { request_id: 'req-2', verifier: 'BLOCKED', check_state: 'PASS', merge_readiness: 'UNKNOWN' },
      { request_id: 'req-3', verifier: 'UNKNOWN', check_state: 'FAIL', merge_readiness: 'UNKNOWN' },
      { verifier: 'UNKNOWN', check_state: 'PENDING', merge_readiness: 'UNKNOWN' },
    ],
  };
}

function reconciliation() {
  return {
    mode: 'READ_ONLY',
    pullRequests: [
      { lane: 'MERGE_READY' },
      { lane: 'CHECK_FAILED' },
      { lane: 'CONFLICTED' },
    ],
  };
}

test('computes complete factory scorecard with merge-ready ratio and checkpointed sessions', () => {
  const snapshot = buildFactoryTelemetry({
    workstreams: completeWorkstreams(),
    reconciliation: reconciliation(),
    policy,
  });

  assert.equal(snapshot.confidence, 'COMPLETE');
  assert.equal(snapshot.metrics.active_claims, 2);
  assert.equal(snapshot.metrics.live_runtime_sessions, 3);
  assert.equal(snapshot.metrics.verifier_coverage, 0.5);
  assert.equal(snapshot.metrics.merge_ready, 1);
  assert.equal(snapshot.metrics.merge_ready_ratio, 0.25);
  assert.equal(snapshot.metrics.blocked, 2);
  assert.equal(snapshot.metrics.blocked_ratio, 0.5);
  assert.equal(snapshot.metrics.reconciliation.check_failed, 1);
  assert.ok(snapshot.recommendations.some((item) => item.id === 'raise-verifier-coverage'));
  assert.ok(snapshot.recommendations.some((item) => item.id === 'repair-failing-checks'));
  assert.ok(snapshot.recommendations.some((item) => item.id === 'propagate-canonical-learning-identity'));
});

test('partial Mission Control evidence produces null metrics and no GitHub-derived actions', () => {
  const workstreams = completeWorkstreams();
  workstreams.github_evidence_complete = false;
  const snapshot = buildFactoryTelemetry({
    workstreams,
    reconciliation: reconciliation(),
    policy,
  });

  assert.equal(snapshot.confidence, 'PARTIAL');
  assert.equal(snapshot.sources.github_observed, false);
  assert.equal(snapshot.metrics.verifier_coverage, null);
  assert.equal(snapshot.metrics.merge_ready_ratio, null);
  assert.equal(snapshot.metrics.blocked_ratio, null);
  assert.equal(
    snapshot.recommendations.some((item) => item.id === 'raise-verifier-coverage'),
    false,
  );
  assert.equal(
    snapshot.recommendations.some((item) => item.id === 'reduce-blocked-work'),
    false,
  );
  assert.ok(snapshot.recommendations.some((item) => item.id === 'repair-failing-checks'));
});

test('malformed reconciliation evidence is marked unavailable and cannot drive actions', () => {
  const snapshot = buildFactoryTelemetry({
    workstreams: completeWorkstreams(),
    reconciliation: {
      mode: 'READ_ONLY',
      pullRequests: [{ lane: 'NOT_A_CANONICAL_LANE' }],
    },
    policy,
  });
  assert.equal(snapshot.sources.reconciliation_observed, false);
  assert.equal(snapshot.metrics.reconciliation, null);
  assert.equal(
    snapshot.recommendations.some((item) => item.id === 'repair-failing-checks'),
    false,
  );
});

test('invalid policy thresholds fail closed', () => {
  assert.throws(
    () =>
      buildFactoryTelemetry({
        workstreams: completeWorkstreams(),
        reconciliation: reconciliation(),
        policy: { ...policy, blocked_ratio_warn: 2 },
      }),
    /invalid telemetry policy threshold/,
  );
});

test('does not pretend persistent learning exists', () => {
  const snapshot = buildFactoryTelemetry({
    workstreams: {},
    reconciliation: {},
    policy,
  });
  assert.equal(snapshot.confidence, 'PARTIAL');
  assert.equal(snapshot.learning_state.persistent_history, false);
  assert.equal(snapshot.learning_state.continuous_durable_export, false);
  assert.equal(snapshot.learning_state.mission_control_scorecards, false);
  assert.equal(snapshot.learning_state.adaptive_routing, false);
  assert.equal(snapshot.learning_state.canonical_task_ids_visible, null);
});


test('malformed workstream arrays fail closed and suppress derived recommendations', () => {
  const bad = completeWorkstreams();
  bad.active_claims = [{ nope: 'missing-work-id' }];
  bad.runtime_sessions = [{ status: 'teleporting' }];
  bad.pull_requests = [{ verifier: 'MAYBE', check_state: 'PASS', merge_readiness: 'READY' }];

  const snapshot = buildFactoryTelemetry({
    workstreams: bad,
    reconciliation: reconciliation(),
    policy,
  });

  assert.equal(snapshot.confidence, 'PARTIAL');
  assert.equal(snapshot.sources.claims_observed, false);
  assert.equal(snapshot.sources.runtime_sessions_observed, false);
  assert.equal(snapshot.sources.github_observed, false);
  assert.equal(snapshot.metrics.active_claims, null);
  assert.equal(snapshot.metrics.live_runtime_sessions, null);
  assert.equal(snapshot.metrics.verifier_coverage, null);
  assert.equal(
    snapshot.recommendations.some((item) => item.id === 'raise-verifier-coverage'),
    false,
  );
});

test('producer source errors propagate and prevent COMPLETE confidence', () => {
  const workstreams = {
    ...completeWorkstreams(),
    source_errors: ['github page 2 fetch failed'],
  };
  const recon = {
    ...reconciliation(),
    source_errors: ['inventory producer returned partial data'],
  };

  const snapshot = buildFactoryTelemetry({
    workstreams,
    reconciliation: recon,
    policy,
  });

  assert.equal(snapshot.confidence, 'PARTIAL');
  assert.ok(snapshot.source_errors.includes('github page 2 fetch failed'));
  assert.ok(snapshot.source_errors.includes('inventory producer returned partial data'));
});

test('empty but explicitly observed evidence remains valid', () => {
  const snapshot = buildFactoryTelemetry({
    workstreams: {
      claims_observed: true,
      runtime_sessions_observed: true,
      github_observed: true,
      github_evidence_complete: true,
      active_claims: [],
      completed_claim_tombstones: 0,
      runtime_sessions: [],
      pull_requests: [],
    },
    reconciliation: { mode: 'READ_ONLY', pullRequests: [] },
    policy,
  });

  assert.equal(snapshot.confidence, 'COMPLETE');
  assert.equal(snapshot.metrics.active_claims, 0);
  assert.equal(snapshot.metrics.evidenced_pull_requests, 0);
  assert.equal(snapshot.metrics.verifier_coverage, null);
});

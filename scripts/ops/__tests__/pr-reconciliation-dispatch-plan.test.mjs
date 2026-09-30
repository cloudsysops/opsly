import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReconciliationDispatchPlan,
  planReconciliationDispatch,
} from '../lib/pr-reconciliation-dispatch-plan.mjs';

test('dispatches safe technical failures to canonical PR Doctor', () => {
  const action = planReconciliationDispatch({
    prNumber: 10,
    expectedHeadSha: 'abc',
    protected: false,
    operation: 'REPAIR',
  });
  assert.equal(action.action, 'DISPATCH_PR_DOCTOR');
  assert.equal(action.mutatesBranch, true);
});

test('dispatches exact-head review blockers through PR Doctor review mode', () => {
  const action = planReconciliationDispatch({
    prNumber: 11,
    expectedHeadSha: 'def',
    protected: false,
    operation: 'REPAIR_REVIEW_BLOCKER',
  });
  assert.equal(action.action, 'DISPATCH_PR_DOCTOR_REVIEW');
});

test('allows read-only independent review on protected surfaces', () => {
  const action = planReconciliationDispatch({
    prNumber: 12,
    expectedHeadSha: 'ghi',
    protected: true,
    operation: 'REQUEST_INDEPENDENT_REVIEW',
  });
  assert.equal(action.action, 'DISPATCH_INDEPENDENT_REVIEW');
  assert.equal(action.mutatesBranch, false);
});

test('never sends protected branch mutation to an agent', () => {
  const action = planReconciliationDispatch({
    prNumber: 13,
    expectedHeadSha: 'jkl',
    protected: true,
    operation: 'DIAGNOSE_ONLY',
  });
  assert.equal(action.action, 'HOLD_PROTECTED');
  assert.equal(action.mutatesBranch, false);
});

test('builds a bounded deterministic dispatch plan', () => {
  const plan = buildReconciliationDispatchPlan({
    repository: 'cloudsysops/opsly',
    workpacks: [
      { prNumber: 1, expectedHeadSha: 'a', protected: false, operation: 'REPAIR' },
      { prNumber: 2, expectedHeadSha: 'b', protected: true, operation: 'REQUEST_INDEPENDENT_REVIEW' },
    ],
  });
  assert.equal(plan.schema_version, 'ReconciliationDispatchPlanV1');
  assert.equal(plan.actions.length, 2);
  assert.equal(plan.summary.DISPATCH_PR_DOCTOR, 1);
  assert.equal(plan.summary.DISPATCH_INDEPENDENT_REVIEW, 1);
});


test('deduplicates a shared independent-review runtime gate without blocking other lanes', () => {
  const plan = buildReconciliationDispatchPlan({
    repository: 'cloudsysops/opsly',
    workpacks: [
      { prNumber: 20, expectedHeadSha: 'a', protected: false, operation: 'REQUEST_INDEPENDENT_REVIEW', parallelLane: 'reviewer', sharedGate: 'independent-review-runtime' },
      { prNumber: 21, expectedHeadSha: 'b', protected: false, operation: 'REQUEST_INDEPENDENT_REVIEW', parallelLane: 'reviewer', sharedGate: 'independent-review-runtime' },
      { prNumber: 22, expectedHeadSha: 'c', protected: false, operation: 'REPAIR', parallelLane: 'reconciliation', sharedGate: null },
    ],
  });
  assert.equal(plan.actions[0].action, 'DISPATCH_INDEPENDENT_REVIEW');
  assert.equal(plan.actions[1].action, 'HOLD_SHARED_GATE');
  assert.equal(plan.actions[2].action, 'DISPATCH_PR_DOCTOR');
  assert.equal(plan.summary.DISPATCH_INDEPENDENT_REVIEW, 1);
  assert.equal(plan.summary.HOLD_SHARED_GATE, 1);
  assert.equal(plan.summary.DISPATCH_PR_DOCTOR, 1);
});

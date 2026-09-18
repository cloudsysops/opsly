import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReconciliationPlan,
  planReconciliationAction,
} from '../lib/pr-reconciliation-action-plan.mjs';

test('routes merge-ready work to canonical governed merge instead of merging itself', () => {
  const action = planReconciliationAction({
    number: 10,
    lane: 'MERGE_READY',
    headSha: 'abc',
    protected: false,
  });
  assert.equal(action.action, 'QUEUE_GOVERNED_MERGE');
  assert.equal(action.safe_to_automate, false);
});

test('routes failed checks into the separate repair lane', () => {
  const action = planReconciliationAction({
    number: 11,
    lane: 'CHECK_FAILED',
    headSha: 'def',
    protected: false,
  });
  assert.equal(action.action, 'REPAIR');
});

test('never proposes mutation for protected surfaces', () => {
  const action = planReconciliationAction({
    number: 12,
    lane: 'MERGE_READY',
    headSha: 'ghi',
    protected: true,
  });
  assert.equal(action.action, 'ESCALATE');
});

test('builds a deterministic action list from inventory', () => {
  const plan = buildReconciliationPlan({
    generatedAt: '2026-09-13T00:00:00Z',
    repository: 'cloudsysops/opsly',
    pullRequests: [
      { number: 1, lane: 'BEHIND', headSha: 'a', protected: false },
      { number: 2, lane: 'CHECK_PENDING', headSha: 'b', protected: false },
    ],
  });
  assert.equal(plan.schema_version, 'ReconciliationActionPlanV1');
  assert.deepEqual(plan.actions.map((x) => x.action), ['UPDATE_BRANCH_CANDIDATE', 'WAIT']);
});

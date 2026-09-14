import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostMergeCleanupPlan } from '../lib/software-factory-cleanup-plan.mjs';

test('reuses canonical branch cleanup instead of inventing a second deleter', () => {
  const plan = buildPostMergeCleanupPlan({
    cleanupInventory: {
      candidates: [
        {
          branch: 'feat/done',
          sha: 'abc',
          cleanupCandidate: true,
          mergedPr: { prNumber: 10 },
        },
        {
          branch: 'feat/active',
          sha: 'def',
          cleanupCandidate: false,
          blockedReasons: ['ACTIVE_PR_HEAD'],
        },
      ],
    },
    workstreams: { active_claims: [] },
    mergedWork: [],
  });

  assert.equal(plan.branch_cleanup_candidates.length, 1);
  assert.equal(plan.branch_cleanup_candidates[0].branch, 'feat/done');
  assert.match(plan.branch_cleanup_candidates[0].executor, /git-branch-cleanup/);
  assert.equal(plan.invariants.create_new_branch_cleaner, false);
});

test('detects a merged work item whose dispatch claim is still active', () => {
  const plan = buildPostMergeCleanupPlan({
    cleanupInventory: { candidates: [] },
    workstreams: {
      active_claims: [
        { claim_id: 'claim-1', work_id: 'work-1' },
        { claim_id: 'claim-2', work_id: 'work-2' },
      ],
    },
    mergedWork: [{ work_id: 'work-1' }],
  });

  assert.deepEqual(plan.claim_release_candidates, [
    {
      work_id: 'work-1',
      claim_id: 'claim-1',
      action: 'RELEASE_CLAIM_CANDIDATE',
      canonical_release: 'apps/orchestrator/src/task-claim-store.ts#releaseTaskDispatchClaim',
      reason: 'work is reported merged but dispatch claim is still active',
    },
  ]);
  assert.equal(plan.invariants.mutate_claims, false);
  assert.match(plan.invariants.canonical_claim_release, /releaseTaskDispatchClaim/);
});

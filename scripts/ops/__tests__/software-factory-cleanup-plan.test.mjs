import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostMergeCleanupPlan } from '../lib/software-factory-cleanup-plan.mjs';

function inventory() {
  return {
    mode: 'READ_ONLY',
    candidates: [
      {
        branch: 'feat/done',
        sha: 'abc',
        cleanupCandidate: true,
        mergedPr: { prNumber: 10, mergedAt: '2026-09-14T00:00:00Z' },
        blockedReasons: [],
      },
      {
        branch: 'feat/active',
        sha: 'def',
        cleanupCandidate: false,
        blockedReasons: ['ACTIVE_PR_HEAD'],
      },
    ],
  };
}

test('produces exact branch+sha candidates without a broad delete command', () => {
  const plan = buildPostMergeCleanupPlan({
    cleanupInventory: inventory(),
    workstreams: { active_claims: [] },
    mergedWork: [],
  });

  assert.equal(plan.mode, 'PLAN_ONLY');
  assert.deepEqual(plan.branch_cleanup_candidates, [
    {
      branch: 'feat/done',
      expected_sha: 'abc',
      merged_pr: 10,
      merged_at: '2026-09-14T00:00:00Z',
      action: 'SUPERVISED_DELETE_CANDIDATE',
      executable: false,
      required_revalidation: [
        'branch still points to expected_sha',
        'branch is not current default branch',
        'branch is not an active PR head',
        'branch is not an active PR base',
        'branch is not protected by reconciliation policy',
        'merged PR evidence still matches branch',
      ],
    },
  ]);
  assert.equal(plan.invariants.broad_branch_delete_command, null);
  assert.equal(plan.invariants.mutate_branches, false);
  assert.equal(JSON.stringify(plan).includes('--apply-merged'), false);
});

test('preserves blocked branch reasons instead of silently dropping them', () => {
  const plan = buildPostMergeCleanupPlan({
    cleanupInventory: inventory(),
    workstreams: { active_claims: [] },
    mergedWork: [],
  });
  assert.deepEqual(plan.blocked_branch_cleanup, [
    {
      branch: 'feat/active',
      sha: 'def',
      blocked_reasons: ['ACTIVE_PR_HEAD'],
    },
  ]);
});

test('reports stale active claims as review-only until a canonical release API exists', () => {
  const plan = buildPostMergeCleanupPlan({
    cleanupInventory: { mode: 'READ_ONLY', candidates: [] },
    workstreams: {
      active_claims: [{ claim_id: 'claim-1', work_id: 'work-1' }],
    },
    mergedWork: [{ work_id: 'work-1' }],
  });

  assert.deepEqual(plan.claim_release_candidates, [
    {
      work_id: 'work-1',
      claim_id: 'claim-1',
      action: 'CLAIM_RELEASE_REVIEW_REQUIRED',
      executable: false,
      reason: 'work is reported merged but dispatch claim is still active',
      blocker: 'canonical post-merge claim-release API is not available',
    },
  ]);
  assert.equal(plan.invariants.mutate_claims, false);
  assert.equal(plan.invariants.claim_release_api, 'PENDING');
});

test('fails closed on non-canonical cleanup inventory', () => {
  assert.throws(
    () => buildPostMergeCleanupPlan({
      cleanupInventory: { candidates: [] },
      workstreams: { active_claims: [] },
      mergedWork: [],
    }),
    /canonical READ_ONLY/,
  );
});

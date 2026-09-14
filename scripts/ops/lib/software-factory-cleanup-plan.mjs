export function buildPostMergeCleanupPlan({ cleanupInventory, workstreams, mergedWork = [] }) {
  const mergedWorkIds = new Set(mergedWork.map((item) => String(item.work_id || item)));
  const activeByWork = new Map(
    (workstreams?.active_claims || []).map((claim) => [String(claim.work_id), claim]),
  );

  const branches = (cleanupInventory?.candidates || [])
    .filter((item) => item.cleanupCandidate === true)
    .map((item) => ({
      branch: item.branch,
      sha: item.sha || null,
      merged_pr: item.mergedPr?.prNumber || null,
      action: 'USE_CANONICAL_BRANCH_CLEANUP',
      executor: 'scripts/git-branch-cleanup.sh --apply-merged',
    }));

  const claims = [...mergedWorkIds]
    .map((workId) => {
      const claim = activeByWork.get(workId);
      if (!claim) return null;
      return {
        work_id: workId,
        claim_id: claim.claim_id,
        action: 'RELEASE_CLAIM_CANDIDATE',
        canonical_release: 'apps/orchestrator/src/task-claim-store.ts#releaseTaskDispatchClaim',
        reason: 'work is reported merged but dispatch claim is still active',
      };
    })
    .filter(Boolean);

  return {
    schema_version: 'PostMergeCleanupPlanV1',
    generated_at: new Date().toISOString(),
    mode: 'PLAN_ONLY',
    invariants: {
      create_new_branch_cleaner: false,
      canonical_branch_cleaner: 'scripts/git-branch-cleanup.sh',
      mutate_claims: false,
      canonical_claim_release: 'apps/orchestrator/src/task-claim-store.ts#releaseTaskDispatchClaim',
    },
    branch_cleanup_candidates: branches,
    claim_release_candidates: claims,
  };
}

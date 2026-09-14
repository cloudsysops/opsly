export function buildPostMergeCleanupPlan({
  cleanupInventory,
  workstreams = null,
  mergedWork = null,
}) {
  if (
    !cleanupInventory ||
    cleanupInventory.mode !== 'READ_ONLY' ||
    !Array.isArray(cleanupInventory.candidates)
  ) {
    throw new Error('cleanup inventory is missing canonical READ_ONLY candidate evidence');
  }

  const claimEvidenceAvailable =
    workstreams !== null &&
    Array.isArray(workstreams?.active_claims) &&
    mergedWork !== null &&
    Array.isArray(mergedWork);

  const mergedWorkIds = new Set(
    claimEvidenceAvailable
      ? mergedWork.map((item) => String(item.work_id || item)).filter(Boolean)
      : [],
  );
  const activeByWork = new Map(
    claimEvidenceAvailable
      ? workstreams.active_claims.map((claim) => [String(claim.work_id), claim])
      : [],
  );

  const branchCleanupCandidates = cleanupInventory.candidates
    .filter((item) => item.cleanupCandidate === true)
    .map((item) => {
      if (!item.branch || !item.sha || !item.mergedPr?.prNumber) {
        throw new Error('cleanup candidate is missing branch/sha/merged PR evidence');
      }
      return {
        branch: item.branch,
        expected_sha: item.sha,
        merged_pr: item.mergedPr.prNumber,
        merged_at: item.mergedPr.mergedAt || null,
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
      };
    });

  const blockedBranches = cleanupInventory.candidates
    .filter((item) => item.cleanupCandidate !== true)
    .map((item) => ({
      branch: item.branch || null,
      sha: item.sha || null,
      blocked_reasons: Array.isArray(item.blockedReasons)
        ? item.blockedReasons
        : ['UNKNOWN'],
    }));

  const claims = claimEvidenceAvailable
    ? [...mergedWorkIds]
        .map((workId) => {
          const claim = activeByWork.get(workId);
          if (!claim) return null;
          return {
            work_id: workId,
            claim_id: claim.claim_id || null,
            action: 'CLAIM_RELEASE_REVIEW_REQUIRED',
            executable: false,
            reason: 'work is reported merged but dispatch claim is still active',
            blocker: 'canonical post-merge claim-release API is not available',
          };
        })
        .filter(Boolean)
    : [];

  return {
    schema_version: 'PostMergeCleanupPlanV1',
    generated_at: new Date().toISOString(),
    mode: 'PLAN_ONLY',
    evidence: {
      branch_cleanup: {
        status: 'OBSERVED',
        source: 'pr-reconciliation-cleanup-candidates',
      },
      claims: claimEvidenceAvailable
        ? {
            status: 'OBSERVED',
            active_claims_observed: workstreams.active_claims.length,
            merged_work_observed: mergedWork.length,
          }
        : {
            status: 'UNKNOWN',
            reason:
              'canonical workstream claims and merged-work evidence were not supplied to this run',
          },
    },
    invariants: {
      create_new_branch_cleaner: false,
      broad_branch_delete_command: null,
      mutate_branches: false,
      mutate_claims: false,
      claim_release_api: 'PENDING',
      require_branch_sha_revalidation: true,
      missing_claim_evidence_authorizes_release: false,
    },
    branch_cleanup_candidates: branchCleanupCandidates,
    blocked_branch_cleanup: blockedBranches,
    claim_release_candidates: claims,
  };
}

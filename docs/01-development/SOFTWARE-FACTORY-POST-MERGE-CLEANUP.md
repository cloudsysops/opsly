# Software Factory post-merge cleanup

The factory does **not** introduce another branch deletion mechanism.

The canonical reconciliation workflow remains the source of branch eligibility. This layer joins that read-only evidence into a `PostMergeCleanupPlanV1` artifact.

## V1 boundary

V1 is **PLAN_ONLY**.

It may report:

1. exact merged branch candidates as `branch + expected_sha + merged_pr`;
2. branches rejected by reconciliation and their blocker reasons;
3. merged work whose DispatchClaim is still active.

It does **not** emit `git-branch-cleanup.sh --apply-merged` or another broad deletion command. The existing cleaner enumerates a wider branch set than the reconciliation inventory and therefore is not safe to execute from this plan without an explicit allow-list/revalidation contract.

Before any future branch deletion, an executor must revalidate the exact candidate:

- branch still points to `expected_sha`;
- branch is not default;
- branch is neither an active PR head nor active PR base;
- protected-surface policy still permits cleanup;
- merged PR evidence still matches.

## Dispatch claims

Claim release is also plan-only. Although low-level claim primitives exist inside the Orchestrator, there is not yet a canonical post-merge release API carrying the complete lease evidence required for safe release.

Therefore V1 reports `CLAIM_RELEASE_REVIEW_REQUIRED` and **does not mutate Redis directly**. A future coordinator must use the canonical ownership path once that API exists; it must not create a second claim store.

## Operational integration

The existing `PR Reconciliation Inventory` workflow builds and uploads `software-factory-cleanup-plan.json` alongside the other read-only reconciliation artifacts. This makes the plan observable without enabling mutation.

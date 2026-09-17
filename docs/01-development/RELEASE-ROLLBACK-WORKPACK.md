# Release rollback workpack

Parent: #1448
Stack base: #1635

## Goal

Implement real rollback only after Opsly can prove the previous production release with exact commit SHA and immutable image digests.

## Conflict key

`release-rollback`

## Current slice

`scripts/deploy/release-rollback-plan.mjs` builds `ReleaseRollbackPlanV1` from:

- attempted release SHA;
- previous release SHA;
- immutable digest for every promoted service.

The plan is deliberately non-executable (`executable_from_this_script=false`). Missing/malformed evidence fails closed.

## Next implementation steps

1. Before production promotion, capture the current production release record: source SHA and every compose-service image digest.
2. Persist/reference that record in release evidence without copying secrets.
3. On failed production smoke, construct `ReleaseRollbackPlanV1` and validate every previous immutable ref before mutating production.
4. Add a governed rollback job under the existing production release workflow; do not create a second production authority.
5. Restore the previous checkout SHA and exact image digests without rebuild.
6. Run production health/smoke again and record `ROLLED_BACK` or `ROLLBACK_FAILED` evidence.
7. Exercise only via dry-run/test harness until an explicit production change window authorizes a physical rollback proof.

## Safety

- No production mutation in this PR.
- No Peskids changes.
- No migrations, n8n, secrets, DNS/routing or production data changes.
- No mutable tags (`latest`) accepted as rollback evidence.
- No rebuild during rollback.

## Acceptance

A future governed release workflow can prove and restore the exact previous SHA/digests after a failed smoke, then attach health evidence. Until that physical proof exists, Mission Control must not claim automatic rollback.

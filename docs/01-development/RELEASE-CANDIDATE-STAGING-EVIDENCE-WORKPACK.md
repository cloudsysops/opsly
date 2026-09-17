# Release Candidate Staging Evidence Workpack

Parent: #1448
Stack base: PR #1635 branch `feat/release-candidate-promotion-v1`

- workstream: `release.staging-candidate`
- conflict_key: `release-staging-candidate`
- owner_role: QA/Staging agent
- risk_class: medium
- production_mutation: forbidden

## Acceptance

- full candidate SHA must already belong to `main`;
- the divergent `staging` branch is not moved or rewritten;
- candidate source is checked out at the exact requested SHA;
- staging images use isolated `<sha>-staging` tags;
- staging config must be isolated from production config;
- staging health and dry-run E2E must pass;
- immutable staging and production-candidate digests are captured as evidence;
- ReleaseCandidateV1 remains blocked until digest parity and external gates are explicitly proven;
- no production activation occurs.

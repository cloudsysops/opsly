# Release Candidate QA

This flow exists to prove what ran in QA/staging before production promotion.

## Canonical sequence

1. A full 40-character `release_sha` already contained in `main` is selected.
2. `.github/workflows/stage-release-candidate.yml` validates ancestry without moving the divergent `staging` branch.
3. The exact source SHA is checked out and built with staging-only public configuration.
4. Candidate images use the isolated tag `<release_sha>-staging`; they never overwrite the production candidate tag `<release_sha>`.
5. The exact SHA is deployed only to `/opt/opsly-staging` and the staging API must pass health plus the dry-run E2E smoke.
6. GHCR digests for the staging candidate and production candidate are resolved without production activation.
7. `ReleaseCandidateV1` evidence is emitted and uploaded as a workflow artifact.

## Fail-closed readiness

The first version intentionally cannot authorize production release by itself. The evidence builder keeps the candidate `blocked` until all of the following are explicitly bound:

- CI, security and independent verification evidence;
- migration safety;
- operator/governed readiness authorization;
- exact digest parity between the artifact tested in staging and the artifact eligible for production.

Current Admin, Portal and API builds contain environment-coupled build arguments. Their staging and production digests are therefore expected to differ until runtime configuration or an equivalent immutable-artifact strategy is implemented. The workflow records this as `same_digest_not_proven:<service>` rather than silently treating the candidate as releasable.

## Safety boundaries

This workflow:

- does not move or rewrite the `staging` branch;
- does not deploy production;
- does not apply production migrations;
- does not mutate production data;
- does not change n8n side effects, DNS, routing or secrets;
- does not retag or overwrite `<release_sha>` production candidate images.

Production remains owned by the explicit governed promotion workflow.

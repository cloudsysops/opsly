# Release same-digest workpack

Parent: #1448
Stack base: #1636

## Goal

Make QA/staging and production consume the same immutable container digest for the Opsly platform release candidate. Do not rebuild environment-specific production artifacts after QA.

## Conflict key

`release-runtime-config`

## Current measured blockers

Run:

```bash
node scripts/ci/check-release-artifact-parity.mjs --json
```

`--enforce` intentionally remains red until every blocker is removed.

### API — READY

API build-time domain coupling is removed. `apps/api/lib/cors-origins.ts` resolves allowed origins at request/runtime and the platform compose already loads `/opt/opsly/.env` into the API container. No CORS wildcard or auth relaxation was introduced.

### Admin — 4 blockers

- `NEXT_PUBLIC_ADMIN_PUBLIC_DEMO`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`

### Portal — 5 blockers

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_PLATFORM_DOMAIN`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Total remaining blockers: **9**.

## Execution order

1. ✅ Remove API build-time domain coupling without widening auth/CORS semantics.
2. Introduce one canonical public runtime-config contract for Admin/Portal. It may expose only values already intended to be public (API base URL, Supabase public URL/anon key, support email, public domain, demo flag where policy allows).
3. Migrate Admin consumers to the runtime contract without changing session/auth behavior.
4. Migrate Portal consumers to the same contract without changing session/auth behavior.
5. Remove the corresponding Docker build args only after consumers are migrated.
6. Change the parity test inventory as each blocker is removed. Do not delete expectations merely to make CI green.
7. When the auditor reaches zero blockers, run `node scripts/ci/check-release-artifact-parity.mjs --enforce` as a required gate and update #1636 to compare the exact QA-tested digest with the production-eligible digest.

## Safety

- QA/staging and build architecture only.
- No production deployment.
- No Peskids changes.
- No auth relaxation.
- No secret values in runtime config; Supabase anon key is public by design, service-role keys are forbidden.
- No n8n, DNS/routing, migrations or production-data mutation.

## Acceptance

`ReleaseArtifactParityAuditV1.same_digest_ready == true` for API/Admin/Portal, and ReleaseCandidateV1 can prove QA-tested digest equals production-promoted digest without rebuild.

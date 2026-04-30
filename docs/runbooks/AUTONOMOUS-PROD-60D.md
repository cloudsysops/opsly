# Opsly Autonomous Production Runbook (60 Days)

## Scope

This runbook operationalizes the 60-day autonomous production plan using `staging -> production` promotion, risk-based autonomy policies, KPI instrumentation, and tenant onboarding readiness checks.

## 1) Release Gates (staging -> production)

Mandatory gate command:

```bash
bash scripts/ci/release-gate.sh staging
bash scripts/ci/release-gate.sh production
```

Gate coverage:
- OpenAPI contract validation.
- TypeScript validation across core workspaces.
- Tests for `api`, `orchestrator`, and `portal`.
- E2E invite smoke in dry-run mode.

CI integration:
- `Deploy` workflow uses `release-gate` as prerequisite for image build and deploy jobs.

## 2) Autonomous Risk Policies

Policy source:
- `apps/orchestrator/src/autonomy/policy.ts`

Risk model:
- `low`: no approval required, retries enabled.
- `medium`: no approval required, tighter retries and slower backoff.
- `high`: explicit approval required via `x-autonomy-approved: true`, single attempt.

Enforcement points:
- Queue options (`attempts`, `backoff`) in `apps/orchestrator/src/queue-opts.ts`.
- Internal enqueue endpoints in `apps/orchestrator/src/health-server.ts`.

## 3) KPI and Observability

Structured logs now include autonomy dimensions:
- `tenant_slug`
- `request_id`
- `autonomy_risk`
- lifecycle outcome (`success` for completion phase)

Files:
- `apps/orchestrator/src/observability/worker-log.ts`
- `apps/orchestrator/src/queue.ts`

Minimum KPI targets:
- autonomous job success >= 95% (low/medium risk).
- MTTR < 30 minutes for priority incidents.

## 4) Tenant 2 Onboarding Readiness

Manual/CI readiness command:

```bash
bash scripts/tenant/onboarding-readiness.sh --tenant-slug <slug>
```

Checks:
- API health.
- Portal health endpoint (`/api/portal/health?slug=`).
- Invite E2E dry-run.
- Public URLs for portal, n8n, and uptime.

GitHub workflow:
- `.github/workflows/tenant-onboarding-readiness.yml` (manual trigger).

## 5) Production Promotion with Canary + Rollback

Canary gate command:

```bash
bash scripts/deploy/promote-canary.sh \
  --staging-api-url "https://api.ops.smiletripcare.com" \
  --prod-api-url "https://api.ops.smiletripcare.com" \
  --rollback-on-fail
```

GitHub workflow:
- `.github/workflows/promote-production-canary.yml` (manual trigger).

Rollback strategy:
- If canary fails, stop rollout and run rollback procedure for core services.
- Keep deployment SHA references to enable deterministic rollback from GHCR image tags.

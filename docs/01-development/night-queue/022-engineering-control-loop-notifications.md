---
id: engineering-control-loop-notifications-022
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Opsly — Engineering Control Loop + Actionable Notifications

## Mission

Turn the existing Opsly engineering automation into one supervised improvement loop:

ChatGPT/operator -> GitHub task -> builder agent -> focused PR -> CI/evidence -> independent reviewer -> decision gate -> merge/deploy -> runtime verification -> only actionable notification.

Do not build a second orchestrator, second Mission Control, second MCP server, or second task system.

GitHub remains the canonical engineering work queue and audit trail.

## Operating model

Use the existing repository and services first:

- GitHub issues / night-queue docs / PRs
- existing orchestrator and AgentTask concepts
- existing CI and workflow catalog
- existing nightly-fix and health checks
- existing Evolution Pipeline
- existing QA issue -> Discord notification
- existing Mission Control / Moon
- existing deployment and production gates
- existing usage/budget/security telemetry

The control loop must be event-driven where practical and scheduled only where necessary.

## Canonical lifecycle

Every autonomous engineering task should move through:

1. QUEUED
2. CLAIMED
3. BUILDING
4. PR_OPEN
5. CI_RUNNING
6. REVIEW_REQUIRED
7. CHANGES_REQUESTED or READY_FOR_DECISION
8. APPROVED
9. MERGED
10. DEPLOY_PENDING
11. DEPLOYED
12. RUNTIME_VERIFIED
13. DONE

Terminal exception states:

- BLOCKED
- FAILED
- SECURITY_HOLD
- BUDGET_HOLD
- ROLLBACK_REQUIRED

Builder != reviewer.

Production promotion remains supervised.

## GitHub task contract

Each task/prompt must contain:

- objective
- why it matters
- scope
- non-goals
- allowed files/surfaces
- risk level
- autonomy mode
- acceptance criteria
- tests required
- evidence required
- rollback notes when runtime-affecting
- next smallest action
- expected output PR(s)

Prefer focused PRs. No megadiffs.

## Notification policy

Notify the operator ONLY when action or awareness is materially useful.

### P0 — immediate alert

Trigger when any of these are supported by evidence:

- production unavailable or materially degraded
- auth bypass / unauthenticated paid-LLM or side-effect path
- leaked/compromised credential evidence
- runaway paid token spend or budget/kill-switch failure
- destructive Supabase/database event or migration corruption
- webhook/n8n failure causing data loss or duplicate side effects
- deploy created a confirmed regression
- rollback is required

Notification format:

P0
WHAT_CHANGED
IMPACT
EVIDENCE
CONTAINMENT
DECISION_NEEDED
NEXT_ACTION

### P1 — decision required

Trigger for:

- PR ready but architecture/product/security decision is needed
- production migration requires approval
- public exposure/network change
- budget threshold or provider-routing decision
- schema change with backward-compatibility risk
- tenant data model decision
- feature is implementation-complete but launch criteria remain unresolved

### P2 — ready for review

Trigger only when:

- focused PR is complete
- required CI is green or all exceptions are explicit
- independent reviewer has reported
- evidence is attached
- no unresolved blocker exists

This should be a concise review packet, not a generic success ping.

### P3 — digest only

Include in periodic digest, not immediate alert:

- routine dependency updates
- lint/format-only changes
- successful nightly maintenance
- ordinary test improvements
- non-blocking documentation changes
- repetitive health-check success

### Suppress

Do not notify for:

- unchanged health state
- successful checks with no decision
- duplicate failures already tracked
- retries that recover inside policy
- agent chatter
- raw logs
- every commit/push

Deduplicate alerts by canonical incident/task key.

## Surfaces to monitor

### Code / PR
- new focused PR from an agent
- CI failed on launch-critical path
- review requested changes
- risky diff touches auth, billing, tenancy, migrations, deployment, orchestrator, LLM gateway

### Deployments
- deployment failed
- production is behind expected release
- canary failed
- post-deploy smoke failed
- rollback condition detected

### Webhooks
- sustained non-2xx rate
- signature/auth failures above baseline
- replay/duplicate rate
- payload contract drift
- queue/backlog growth when observable

### n8n
- workflow disabled unexpectedly
- repeated execution failures
- retry storm
- webhook not registered/reachable
- credential/config drift when observable
- workflow change without version/evidence

### Supabase
- migration drift
- failed migration
- RLS/auth regression
- tenant-boundary test failure
- deadletter/unprocessed ingestion growth
- schema incompatibility with deployed app

### Agent / LLM usage
- paid spend threshold crossed
- abnormal retry amplification
- unknown/unattributed provider cost
- kill switch disabled unexpectedly
- unauthenticated path capable of spend
- local-vs-paid routing deviates from policy

## Threshold strategy

Do not hardcode arbitrary production thresholds when no baseline exists.

Implement configurable thresholds with conservative defaults and label them:

- REAL_BASELINE
- CONFIGURED_POLICY
- UNKNOWN

Suggested configurable controls:

- PLATFORM_DAILY_AI_BUDGET
- TENANT_DAILY_AI_BUDGET
- PER_TASK_COST_BUDGET
- PAID_LLM_KILL_SWITCH
- WEBHOOK_FAILURE_RATE_THRESHOLD
- N8N_FAILURE_BURST_THRESHOLD
- DEPLOY_SMOKE_FAILURE_ALERT
- SUPABASE_MIGRATION_DRIFT_ALERT

## Notification destinations

Canonical source of truth: GitHub.

Use:

1. GitHub issue/PR comment for durable evidence and decisions.
2. ChatGPT monitoring for operator-facing actionable alerts.
3. Existing Discord integration only for high-signal operational alerts where appropriate.

Do not add another notification platform in this task.

## Agent execution contract

The builder agent must:

- read the task contract
- inspect existing implementation before changing code
- reuse canonical components
- produce a focused branch/PR
- run required tests
- attach machine-verifiable evidence
- stop at production gates

The reviewer agent must independently inspect:

- diff
- tests
- security impact
- tenancy impact
- runtime/deployment impact
- rollback safety
- acceptance criteria

Reviewer returns:

APPROVE
REQUEST_CHANGES
BLOCK

with evidence.

## ChatGPT/operator contract

Design the repository contract so an external supervisor can safely:

- create a scoped task/prompt in GitHub
- observe task/PR state
- review evidence
- request changes
- surface only decisions or material regressions
- queue the next smallest improvement

Do not require the operator to manually copy prompts into local agents.

If automatic agent pickup is not yet wired, document the exact missing trigger and implement the smallest safe bridge using the existing orchestrator/task path.

## Required implementation audit

Inspect current workflows and identify:

- which already create issues/PRs
- which can trigger agents
- which are reporting-only
- duplicate or noisy notifications
- unsafe auto-merge/auto-deploy behavior
- missing correlation IDs between task -> agent -> PR -> CI -> deploy

Explicitly inspect:

- .github/workflows/nightly-fix.yml
- .github/workflows/evolution-pipeline.yml
- .github/workflows/health-check-validation-orchestrator.yml
- .github/workflows/qa-issue-notify.yml
- .github/workflows/night-merge.yml
- .github/workflows/production-change-window.yml
- .github/workflows/promote-production-canary.yml
- docs/01-development/night-queue/

## Correlation

Every automated task should carry, where possible:

- task_id
- request_id
- tenant_slug when applicable
- source_prompt/task path
- agent_id/role
- branch
- PR number
- CI run ID
- deploy run ID
- environment
- final runtime verification

Reuse existing fields before adding new schemas.

## Safety constraints

- no auto-merge to main in this task
- no automatic production deployment
- no secret rotation
- no firewall/routing mutation
- no destructive database migration
- no paid-provider activation merely to test the loop
- no notification flood

## Deliverables

1. CURRENT_AUTOMATION_MAP.md or equivalent report.
2. A single canonical task-state contract, reusing existing structures.
3. Notification severity + dedupe policy.
4. Smallest safe bridge from GitHub queued task to existing agent/orchestrator execution if missing.
5. PR/CI/reviewer evidence contract.
6. Runtime verification hook proposal/implementation using existing health/smoke tooling.
7. Mission Control integration plan for task/PR/deploy state if canonical UI already has an appropriate surface.
8. Tests for state transitions and notification suppression/deduplication.
9. Focused PR(s), with builder != reviewer.

## Final report

CONTROL_LOOP_STATUS

CURRENT_TASK_ENTRYPOINT

AGENT_PICKUP_TRIGGER

TASK_STATE_SOURCE

PR_CORRELATION

CI_CORRELATION

DEPLOY_CORRELATION

RUNTIME_VERIFICATION

NOTIFICATION_POLICY

P0_PATH

P1_PATH

P2_PATH

NOISE_SUPPRESSION

DUPLICATE_AUTOMATIONS

MISSING_BRIDGES

FILES_CHANGED

TESTS

PRS

INDEPENDENT_REVIEW

BLOCKERS

NEXT_SMALLEST_ACTION

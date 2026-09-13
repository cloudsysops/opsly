---
id: agent-security-usage-mission-control-021
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Opsly — Agent Security + Usage Mission Control

## Mission

Audit whether any unauthenticated/public path can enqueue agent/LLM work or cause paid token burn, then add a read-only Mission Control view that shows real agent/model/token/cost consumption.

Do not create another billing system, another Mission Control, another orchestrator, another usage ledger, or another agent registry.

Reuse existing sources first.

## Verified starting facts

- Repository visibility is public.
- Canonical local agent enqueue path is `POST /api/local/prompt-submit`.
- That route currently calls `verifyPlatformAdminToken()`.
- `verifyPlatformAdminToken()` fails closed when `PLATFORM_ADMIN_TOKEN` is absent.
- Orchestrator HTTP server binds to `0.0.0.0` internally; actual public exposure must be verified from deployment/network configuration, not assumed.
- Maintained `scripts/local-prompt-watcher.ts` refuses to start without `PLATFORM_ADMIN_TOKEN`.
- Deprecated `scripts/local-agent-watcher.ts` has a `local-dev` fallback; verify no production caller uses it and remove/deprecate safely if possible.
- Existing usage/cost sources already exist: LLM Gateway, Redis billing metering, `usage_events`, budget code, Moon data source docs.
- Moon docs explicitly mark token/cost per-agent attribution as PARTIAL.

## Phase 1 — Public attack-surface audit

Inventory every route that can:

- enqueue an agent job
- call an LLM provider
- start an agent/runtime session
- trigger OpenClaw/Hermes/local agents
- execute tools/browser/shell
- publish content
- incur paid API cost

For each route report:

ROUTE
METHOD
SERVICE
NETWORK_EXPOSURE
AUTH_REQUIRED
AUTH_TYPE
AUTONOMY_GATE
RATE_LIMIT
TENANT_BOUNDARY
BUDGET_GATE
CAN_CAUSE_PAID_LLM
CAN_CAUSE_SIDE_EFFECT
STATUS

Classify:

SAFE
HARDEN
BLOCKER
UNKNOWN

Do not infer "private" only from `/internal/` path naming.

## Phase 2 — Network exposure proof

Verify deployment reality for:

- orchestrator :3011
- llm-gateway :3010
- OpenClaw gateway
- MCP
- Redis
- PC-gamer workers

Check Docker port mappings, Traefik labels, host firewall/UFW and Tailscale assumptions where repository/runbooks provide evidence.

Do not change firewall or production routing in this task.

If runtime access is unavailable, mark UNKNOWN and provide exact probe commands.

## Phase 3 — Auth hardening

Confirm fail-closed behavior on all paid/side-effect paths.

Required tests include:

- no Authorization header → 401/403
- wrong bearer → 401/403
- missing PLATFORM_ADMIN_TOKEN on server → fail closed
- valid bearer but high-risk action without autonomy approval → blocked
- tenant mismatch → blocked
- oversized/replayed/duplicate request behavior where relevant

Search for unsafe defaults such as:

- `local-dev`
- empty token acceptance
- public demo bypass
- test fallback enabled outside test/dev
- endpoints with no `verifyPlatformAdminToken` / equivalent protection

Do not rotate secrets automatically.

## Phase 4 — Token/cost attribution

Reuse existing metering.

Canonical dimensions:

- timestamp
- tenant_slug / tenant_id
- request_id
- canonical task_id when available
- agent_id / agent_role
- worker_id
- provider
- model
- tokens_in
- tokens_out
- cost_usd
- latency_ms
- cache_hit
- local_vs_paid
- source surface (Claude/Cursor/Codex/OpenCode/OpenClaw/etc.) where attributable

Do not invent cost for subscription-based tools if provider usage/cost is not observable.

Label values:

REAL
ESTIMATED
UNKNOWN

Local Ollama API inference:
`cost_usd = 0` for API billing only; do not imply electricity/hardware cost is zero.

## Phase 5 — Mission Control UI

Extend the existing Opsly Moon / Mission Control. Do not create a new app.

Add a page/section such as:

`/mission-control/agents/usage`

or the closest canonical existing route after inspection.

Display:

### Summary
- paid LLM spend today
- paid LLM spend this month
- tokens in/out today
- local inference jobs
- paid inference jobs
- active agents
- jobs running
- failures/retries
- cache hit rate

### Agent table
- agent
- role
- model/provider
- tasks
- success rate if real
- tokens in
- tokens out
- cost
- avg latency
- last activity
- trust level if canonical data exists

### Model/provider table
- provider
- model
- requests
- tokens
- cost
- p50/p95 latency if source exists
- error rate
- local/paid

### Timeline
- recent expensive calls
- budget warnings
- rejected/blocked unauthenticated attempts if logs expose them safely
- agent jobs and review outcomes

Filters:
- date range
- agent
- provider/model
- tenant
- local vs paid

Never expose prompts, secrets, API keys, bearer tokens, customer PII or private chain-of-thought.

## Phase 6 — Budget protections

Audit existing LLM Gateway budget enforcement and identify gaps.

Recommend/implement only if it extends canonical code:

- daily platform cap
- per-tenant cap
- per-agent/task cost_budget_usd
- paid-provider emergency kill switch
- local-first routing when budget threshold reached
- alerts at configurable thresholds

Do not create a second budget engine.

## Phase 7 — suspicious token-burn diagnosis

Use available logs/usage data to answer:

1. Are there unexpected paid-provider calls?
2. Which agent/surface generated them?
3. Are retries causing repeated spend?
4. Are CI/automation loops calling paid models?
5. Is a public unauthenticated path capable of causing spend?
6. Are subscription CLIs being confused with API-token spend?
7. Are local calls correctly staying local?

Produce evidence, not guesses.

## Required security finding

Pay special attention to the deprecated `scripts/local-agent-watcher.ts` fallback:

```text
process.env.PLATFORM_ADMIN_TOKEN || 'local-dev'
```

Determine whether any active service/script calls it.

If unused:
- remove or make it fail closed in a focused change.

If still used:
- migrate caller to maintained `local-prompt-watcher.ts`
- no hard-coded fallback token.

## Tests

At minimum:

- auth negative tests for enqueue/agent-control paths
- budget enforcement tests
- usage aggregation tests
- Mission Control API authorization tests
- UI data contract tests
- no-secret/no-PII serialization tests

## PR policy

Split if needed:

PR A — security/auth hardening
PR B — usage attribution API/read model
PR C — Mission Control UI

Do not produce one megadiff.

Builder != reviewer.
Codex independent review after each focused PR.

No production deploy or secret rotation in this task.

## Final report

SECURITY_DECISION

REPO_VISIBILITY

PUBLIC_ATTACK_SURFACE

AGENT_ENQUEUE_AUTH

PAID_LLM_ATTACK_SURFACE

UNAUTHENTICATED_SPEND_POSSIBLE
YES / NO / UNKNOWN

DEPRECATED_WATCHER_STATUS

NETWORK_EXPOSURE

METERING_SOURCES

TOKEN_ATTRIBUTION

COST_ATTRIBUTION

MISSION_CONTROL_ROUTE

BUDGET_GAPS

FILES_CHANGED

TESTS

PRS

CODEX_REVIEW

BLOCKERS

NEXT_SMALLEST_ACTION

Do not declare the system secure because the repo is public/private.
Security decision must be based on runtime exposure + auth + budget enforcement.

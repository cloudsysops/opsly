---
id: pc-gamer-agent-worker-mvp-023
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
priority: 1
---

# Opsly — PC Gamer Agent Worker MVP

## Objective

Make the existing PC gamer an actual Opsly execution worker today, using the current orchestrator, BullMQ/Redis queues, local-agent runtime, compute-worker router and local inference stack.

The goal is not another architecture document. The goal is a working end-to-end local worker that can accept a queued Opsly task, execute it locally, report evidence, and return a result.

## Business intent

This worker should become reusable capacity for small-business workloads later, including:

- document extraction/summarization
- content generation/rendering
- image/video processing
- local/private inference
- lead/review/message classification
- report generation
- coding/QA automation for Opsly itself

Do not add GoHighLevel/GHL anywhere. GHL is legacy and no longer part of the active Peskids/Opsly architecture.

## Existing components to reuse

Inspect and reuse before adding anything:

- scripts/local-prompt-watcher.ts
- POST /api/local/prompt-submit
- queue: local-agents
- LocalAgentWorker
- scripts/ops/compute-worker-router.mjs
- scripts/ops/board-assign-gpu-job.mjs
- config/compute-workers.json
- BullMQ / existing Redis
- existing Ollama/local model support
- scripts/cli-agent-service.ts
- local OpenCode/Codex/Hermes services where available
- existing Mission Control / compute worker snapshot

Do not create:
- another orchestrator
- another Redis
- another queue system
- another Mission Control
- another MCP server

## Phase 1 — prove current runtime

Produce evidence for:

1. PC gamer OS/hostname/runtime identity already expected by repo, if documented.
2. GPU vendor/model/VRAM detection.
3. Ollama installed/running status.
4. local model inventory.
5. repo checkout status.
6. Tailscale/VPS reachability if the design requires it.
7. Redis reachability through the existing approved network path.
8. orchestrator reachability.
9. current compute worker registry entry.

If direct runtime access is unavailable to the executing agent, do NOT claim success. Produce an exact bootstrap command/script that the operator can run once on the PC gamer, then let the normal worker stay persistent.

## Phase 2 — persistent worker bootstrap

Implement the smallest safe Windows/Linux-compatible bootstrap for the actual PC gamer environment discovered from repo evidence.

It must start only canonical components required for execution.

Required behavior:

- worker has stable worker_id
- heartbeat published periodically
- heartbeat contains:
  - worker_id
  - hostname
  - GPU model
  - VRAM
  - RAM
  - disk free
  - active jobs
  - capabilities
  - version
  - timestamp
- worker status becomes ONLINE in existing compute-worker snapshot
- worker reconnects after Redis/network interruption
- no public inbound port required if an outbound queue consumer is sufficient
- secrets come from environment/Doppler/existing secret mechanism, never repo

## Phase 3 — local inference smoke

Use existing job type:

`ai.local.inference`

Queue one safe test through the canonical existing path.

The test prompt:

`Reply with OPSLY_LOCAL_OK, your model name, and the worker_id. Do not include secrets or personal data.`

Acceptance:

- task is enqueued durably
- PC gamer claims it
- execution uses a LOCAL model only
- paid provider is not called
- result is persisted/observable
- request_id and worker_id are correlated
- failure is visible rather than dropped

## Phase 4 — local agent execution smoke

Prove at least ONE real code/task agent path on the PC gamer.

Preferred order:

1. OpenCode local/service if operational
2. Codex CLI/service if locally authenticated and no API spend is incurred unexpectedly
3. Hermes if canonical runtime is already installed
4. otherwise canonical LocalAgentWorker + local model

Safe task:

- inspect one small documentation/code quality issue
- make a focused non-production change
- run relevant tests
- create a branch
- open a draft PR
- attach execution evidence

No production deployment.

## Phase 5 — queue three useful jobs

After smoke passes, queue three low-risk tasks that provide immediate value:

### Job A — Opsly repo health
Analyze current TypeScript/test failures and return the top 3 actionable root causes. No code changes unless explicitly safe.

### Job B — Peskids runtime audit
Inspect current active Peskids architecture and identify legacy GHL references that are still runtime-active versus historical/dead code. Do not remove anything without evidence.

### Job C — Business-capability smoke
Run one local/private inference task that simulates a future SMB workload, e.g. classify a synthetic customer message into:
- sales
- support
- billing
- urgent

Use synthetic data only.

## Phase 6 — Mission Control visibility

Reuse existing compute worker snapshot / Mission Control.

Show at minimum:

- PC gamer ONLINE/OFFLINE/BUSY/DEGRADED
- GPU model
- VRAM
- active jobs
- last heartbeat
- capabilities
- jobs completed
- jobs failed
- local inference count
- paid inference count
- last task
- request_id

If the UI already has a suitable surface, extend it. Do not create a new application.

## Phase 7 — execution policy

Default PC gamer routing policy:

LOCAL-FIRST

Allowed without human approval:
- read-only analysis
- tests
- lint/typecheck
- synthetic inference
- documentation updates
- focused draft PR creation
- local rendering/transcription with synthetic or approved data

Requires approval:
- production deploy
- database migration
- destructive commands
- secrets/config rotation
- public network exposure
- paid LLM activation
- customer data export
- outbound customer communications

## Security

- no public Redis
- no public Ollama
- no public agent service ports unless explicitly protected
- prefer Tailscale/private networking
- PLATFORM_ADMIN_TOKEN remains required for prompt-submit
- remove/migrate any active dependency on deprecated local-agent-watcher.ts
- do not use hard-coded local-dev fallback
- no secrets in logs or PRs

## Required tests

- worker selection test
- heartbeat freshness/offline test
- queue persistence test
- local inference job test
- result correlation test
- no-paid-provider assertion for local smoke
- reconnect/retry behavior
- notification suppression for healthy heartbeat

## Deliverable

Do not stop at documentation if code can safely wire the worker.

Return:

PC_GAMER_WORKER_STATUS

WORKER_ID

GPU

VRAM

LOCAL_MODELS

OLLAMA_STATUS

REDIS_REACHABILITY

ORCHESTRATOR_REACHABILITY

HEARTBEAT_STATUS

QUEUE

FIRST_JOB_ID

FIRST_JOB_RESULT

LOCAL_AGENT_SMOKE

DRAFT_PR

MISSION_CONTROL_VISIBILITY

PAID_PROVIDER_CALLS

BLOCKERS

EXACT_ONE_TIME_BOOTSTRAP_COMMAND

NEXT_SMALLEST_ACTION

## Success definition

Success is NOT "architecture ready".

Success is:

`GitHub/Opsly task -> canonical queue -> PC gamer -> local agent/model -> result/evidence -> visible status`

with no paid LLM call required for the smoke.

---
id: agent-lab-02-registry-013
status: done
owner: opsly-night-agent
created: 2026-09-11
requires_pr: true
agent_hint: cursor
reviewer_hint: codex
phase: 2
depends_on: agent-lab-01-inventory-012
canon: docs/design/OPSLY-AGENT-LAB.md
reconcile: docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md
completed: 2026-09-12
---

# Agent Lab 02 — Learning layer only

**Done** 2026-09-12 — extend `@intcloudsysops/agent-learning` only (no second registry).

## Delivered

- Default `DEFAULT_PROMOTION_POLICIES` wired into `AgentLearningStore` (no auto-promote to `autonomous_low_risk`)
- Configurable demotion windows (`DEFAULT_DEMOTION_*`)
- `attachHumanDecision` + `listLessons`
- Eval dataset: `registerEvalCase` / `recordEvalResult` / `listEvalResults`
- Prompt + model performance: `getPromptPerformance` / `getModelPerformance`
- `taskIdFromEnvelope` → `AgentTaskEnvelopeV1.request_id`

## Still not in scope (later)

- Mission Control scorecards UI
- Continuous eval export pipeline to durable storage
- Content Studio Phase 2.2 mixing

## Must reuse (unchanged)

- `AgentTaskEnvelopeV1.request_id` as `task_id`
- `lib/agent-task-core` for task creation / enqueue
- `lib/external-agent-registry` for routing

## Must not (unchanged)

- `JobRegistry` / parallel job store / package name `job-registry`
- direct BullMQ queue ownership

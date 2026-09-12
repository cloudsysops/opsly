---
id: agent-lab-02-registry-013
status: pending
owner: opsly-night-agent
created: 2026-09-11
requires_pr: true
agent_hint: cursor
reviewer_hint: codex
phase: 2
depends_on: agent-lab-01-inventory-012
canon: docs/design/OPSLY-AGENT-LAB.md
reconcile: docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md
---

# Agent Lab 02 — Learning layer only

**Unheld** after inventory `012` = `done` (2026-09-12).

Implement / extend **`lib/agent-learning`** (evidence, review attach, trust, scorecards).

Must reuse:

- `AgentTaskEnvelopeV1.request_id` as `task_id`
- `lib/agent-task-core` for task creation / enqueue
- `lib/external-agent-registry` for routing

Must **not**:

- create `JobRegistry` / parallel job store
- use package name `job-registry`
- direct BullMQ queue ownership
- mix Content Studio Phase 2.2

See ownership matrix in `docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md`.

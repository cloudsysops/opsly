---
id: runtime-evidence-observability-048
status: held
priority: P1
agent: local_opencode
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
requires_pr: true
requires_approval: false
paid_infra_required: false
production_deploy: false
blocked_by: github-queue-write-approval-051
autonomy: supervised
estimated_minutes: 45
resource_class: medium
node_types: mac
architecture_patterns: AgentTask lifecycle, evidence, observability
---

# Runtime Evidence and Observability

## Goal

Make every governed agent task explainable from submit to teardown without logging secrets or raw sensitive prompts.

## Task

Using existing runtime/ai-board/event primitives, define and implement the minimum evidence trail for:

- request/task ID;
- selected runtime;
- selected compute node;
- queue accepted timestamp;
- worker claimed timestamp;
- ephemeral session ID;
- runtime start/end;
- terminal state;
- bounded result/evidence reference;
- teardown confirmation;
- failure classification.

Reuse existing events/tables/logging before introducing new storage.

## Acceptance

A developer can answer from evidence:

`who ran what, on which node, through which runtime, when, with what terminal outcome, and whether the session was destroyed?`

Add tests for:
- success lifecycle;
- runtime failure;
- timeout/cancel;
- teardown after failure;
- secret/redaction invariant.

## Hard boundaries

- Do not persist raw secrets.
- Do not persist unrestricted raw prompts.
- No new paid observability vendor.
- No production deploy.
- Prefer existing Opsly telemetry primitives.

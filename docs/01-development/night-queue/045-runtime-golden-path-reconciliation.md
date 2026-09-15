---
id: runtime-golden-path-reconciliation-045
status: pending
priority: P1
agent: local_codex
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 15
resource_class: small
node_types: mac
architecture_patterns: AgentTaskEnvelopeV1, BullMQ, Session Manager, ephemeral runtime
---

# Runtime Golden Path Reconciliation

## Goal

Audit the current repository after the Mac runtime and ai-board fixes and return one authoritative status of the canonical execution path.

## Inspect

Verify from code, tests, workflows and docs:

1. GitHub/control submit enters through the canonical Opsly submitter;
2. submit reaches `POST /api/local/prompt-submit`;
3. `AgentTaskEnvelopeV1` is required by default;
4. jobs use BullMQ `local-agents`;
5. Mac worker does not claim `local_opencode`;
6. PC Gamer is the intended `local_opencode` consumer;
7. CLI bridges use Session Manager and ephemeral `opsly-task-*` sessions;
8. healthy idle means zero AI task sessions;
9. Hermes/OpenClaw names refer to real external runtimes/adapters, not fictional persistent agents.

## Hard boundaries

- Read-only.
- No branch or PR.
- No deploy.
- No secret access/printing.
- No package installation.
- Do not mark a layer green unless code/tests support it.

## Expected evidence

Return:
- PASS or FINDINGS;
- one ASCII path diagram;
- exact files supporting each layer;
- maximum 8 blockers ordered P0/P1/P2;
- recommended next workpack IDs from this queue.

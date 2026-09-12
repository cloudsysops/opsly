---
id: real-runtime-adapter-inventory-049
status: held
priority: P2
agent: local_claude
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: true
requires_approval: false
paid_infra_required: false
production_deploy: false
blocked_by: github-queue-write-approval-051
autonomy: supervised
estimated_minutes: 30
resource_class: small
node_types: mac
architecture_patterns: external runtime registry, adapter boundary, no fictional agents
---

# Real Runtime Adapter Inventory

## Goal

Remove remaining ambiguity between Opsly roles, adapters, workers and real external AI runtimes.

## Task

Audit current code/config/docs for:

- Hermes Agent;
- OpenClaw;
- OpenCode;
- Claude Code;
- Codex CLI;
- Cursor;
- other local CLI runtimes.

For every runtime, document:

1. upstream/external runtime name;
2. Opsly worker ID;
3. Opsly job type;
4. bridge port or adapter;
5. execution mode;
6. allowed node types;
7. whether it is installed/optional;
8. whether execution is ephemeral;
9. policy/approval boundary.

Identify fictional/legacy agent names that should be aliases, roles, or removed.

## Acceptance

Produce one canonical runtime matrix and update references that materially conflict with it.

Do not create another registry if `config/external-agent-registry.json` can remain the source of truth.

## Hard boundaries

- No new runtime installation.
- No persistent agents.
- No production deploy.
- No external paid calls.

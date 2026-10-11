---
id: gamer-opencode-physical-acceptance-050
status: pending
priority: P1
agent: local_opencode
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
workstream: gamer-opencode-physical-acceptance
conflict_key: gamer-opencode-physical
semantic_scope: gamer-opencode-physical/acceptance-050
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 15
resource_class: small
node_types: gamer
architecture_patterns: BullMQ, OpenCode, Ollama, ephemeral runtime
---

# Gamer OpenCode Physical Acceptance

## Goal

Produce the first physical proof that the governed path reaches the PC Gamer WSL worker, invokes real OpenCode against local Ollama, and returns the acceptance marker.

## Preconditions

If any precondition is missing, return `BLOCKED` with the exact missing item and do not fall back:

- Gamer worker is online (`smdqcia-wsl`);
- `local_opencode` is claimed by the Gamer, not Mac;
- OpenCode bridge is healthy with cwd under `/home/opsly/opsly`;
- Ollama is healthy and has an already-installed Qwen coding model (`qwen3-coder*` or `qwen2.5-coder*`);
- governed task contains `AgentTaskEnvelopeV1`;
- no paid provider fallback is enabled.

## Task

This is a bounded read-only acceptance probe.

Do not plan features. Do not ask clarifying questions. Do not discuss other projects.

1. Confirm you can see this Opsly repository checkout.
2. Reply with exactly one line containing only this marker (no markdown fences, no commentary):

GAMER_OPENCODE_OK

## Hard boundaries

- Read-only task.
- No model downloads.
- No package installs.
- No production deploy.
- No code changes.
- No Mac fallback.
- No paid API fallback.

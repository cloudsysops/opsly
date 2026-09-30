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
architecture_patterns: BullMQ, OpenCode, Ollama, ephemeral runtime, machine claim
depends_on: PR #1616 physical machine-claim acceptance
---

# Gamer OpenCode Physical Acceptance

## Goal

Produce the first physical proof that the governed path reaches the PC Gamer, invokes real OpenCode against local Ollama, returns the expected result, and tears down cleanly.

## Preconditions

If any precondition is missing, return `BLOCKED` with the exact missing item and do not fall back:

- PR #1616 machine-claim primitive is available on the execution path and has real acquire/refuse/renew/release evidence;
- the PC Gamer machine claim is acquired by this acceptance holder before any disruptive runtime action;
- Gamer worker is online;
- `local_opencode` is claimed by the Gamer, not Mac;
- OpenCode bridge is healthy;
- Ollama is healthy and has an already-installed Qwen coding model (`qwen3-coder*` or `qwen2.5-coder*`);
- governed task contains `AgentTaskEnvelopeV1`;
- no paid provider fallback is enabled.

## Task

Run a bounded read-only repository check through the real governed path.

Return exactly this marker on successful runtime output:

`GAMER_OPENCODE_OK`

Then verify:

1. job terminal state is success;
2. evidence identifies the Gamer node/runtime;
3. evidence identifies the selected model as `ollama/qwen*`;
4. no paid API was used;
5. ephemeral task session is gone;
6. healthy idle returns to zero `opsly-task-*` sessions;
7. evidence records the machine-claim holder/lease lifecycle for this run without exposing secrets;
8. the claim is released (or expires safely) after teardown and a competing holder could not enter during the run.

## Hard boundaries

- Read-only task.
- No model downloads.
- No package installs.
- No production deploy.
- No code changes.
- No Mac fallback.
- No paid API fallback.

---
id: gamer-opencode-physical-acceptance-050
status: pending
priority: P1
agent: local_opencode
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
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

Produce the first physical proof that the governed path reaches the PC Gamer, invokes real OpenCode against local Ollama, returns the expected result, and tears down cleanly.

## Preconditions

If any precondition is missing, return `BLOCKED` with the exact missing item and do not fall back:

- Gamer worker is online;
- `local_opencode` is claimed by the Gamer, not Mac;
- OpenCode bridge is healthy;
- Ollama is healthy and has an already-installed compatible model;
- governed task contains `AgentTaskEnvelopeV1`;
- `npm run pc-gamer:opencode:remote-doctor` returns `GAMER_OPENCODE_REMOTE_READY`;
- no paid provider fallback is enabled.

## Readiness command

From the Mac/VPS control node:

```bash
npm run pc-gamer:opencode:remote-doctor
```

Do not dispatch the physical E2E unless it returns exactly:

`GAMER_OPENCODE_REMOTE_READY`

## Task

Run a bounded read-only repository check through the real governed path.

Return exactly this marker on successful runtime output:

`GAMER_OPENCODE_OK`

Then verify:

1. job terminal state is success;
2. evidence identifies the Gamer node/runtime;
3. the Gamer OpenCode bridge is managed by the canonical user systemd service and reports `auth_configured=true` + `ephemeral-tmux-session`;
4. no paid API was used;
5. ephemeral task session is gone;
6. healthy idle returns to zero `opsly-task-*` sessions.

## Hard boundaries

- Read-only task.
- No model downloads.
- No package installs.
- No production deploy.
- No code changes.
- No Mac fallback.
- No paid API fallback.

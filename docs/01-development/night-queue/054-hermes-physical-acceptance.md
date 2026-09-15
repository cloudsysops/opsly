---
id: hermes-physical-acceptance-054
status: pending
priority: P1
agent: local_hermes
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 10
resource_class: small
node_types: mac
architecture_patterns: AgentTaskEnvelopeV1, BullMQ, Hermes Agent, Session Manager, ephemeral runtime
---

# Hermes Physical Acceptance

## Goal

Prove that the real Hermes Agent CLI executes through the full canonical Opsly AgentTask path, not only that bridge port 5007 is healthy.

## Preconditions

If any precondition is missing, return `BLOCKED` and do not fall back:

- Mac node is online;
- `local_hermes` is eligible on the Mac worker;
- bridge `:5007` reports auth configured;
- bridge reports `execution_model=ephemeral-tmux-session`;
- real `hermes` binary is installed;
- no paid-provider fallback is required for this smoke.

## Canonical path

```text
tracked workpack
→ governed submit
→ AgentTaskEnvelopeV1
→ BullMQ local-agents
→ Mac worker claims local_hermes
→ authenticated Hermes bridge :5007
→ Session Manager
→ ephemeral opsly-task-* tmux session
→ real Hermes Agent CLI
→ bounded terminal result
→ teardown
```

## Task

Perform a read-only inspection of the repository root.

Do not edit files, install packages, change configuration, start persistent services or call production APIs.

Return exactly:

`HERMES_OK`

## Acceptance

All must be proven:

1. selected runtime is `local_hermes`;
2. real Hermes CLI is invoked;
3. job reaches terminal success;
4. terminal result is exactly `HERMES_OK`;
5. no repository mutation occurred;
6. the ephemeral `opsly-task-*` session is destroyed;
7. healthy idle returns to zero AI task sessions.

## Hard boundaries

- Read-only.
- No production deploy.
- No paid infrastructure.
- No persistent Hermes process.
- No Mac/Gamer runtime substitution.
- Do not accept bridge health alone as completion evidence.

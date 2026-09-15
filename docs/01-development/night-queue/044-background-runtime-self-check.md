---
id: background-runtime-self-check-044
status: pending
priority: P2
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
estimated_minutes: 10
resource_class: small
node_types: mac
---

# Background Runtime Self-Check

## Goal

Prove that the governed background scheduler can hand a bounded, useful maintenance task to a real ephemeral runtime.

## Task

Inspect the repository **read-only** and return a concise consistency report covering:

1. whether the documented canonical runtime path still references:
   `AgentTaskEnvelopeV1 → BullMQ → Session Manager → ephemeral tmux → runtime → evidence → teardown`;
2. whether any active documentation still recommends persistent AI runtime loops or direct Terminal/OpenCode spawning;
3. whether the healthy-idle invariant is documented as zero `opsly-task-*` AI task sessions;
4. up to five concrete documentation inconsistencies, if any.

## Hard boundaries

- Do not modify files.
- Do not create branches or PRs.
- Do not deploy.
- Do not install packages.
- Do not create paid resources.
- Do not expose secrets or environment values.
- Return findings only.

## Expected evidence

Return:
- PASS or FINDINGS;
- files inspected;
- inconsistencies found;
- recommended next action.

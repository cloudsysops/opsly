---
id: agenttask-e2e-contract-hardening-046
status: pending
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
autonomy: supervised
estimated_minutes: 35
resource_class: medium
node_types: mac
architecture_patterns: AgentTaskEnvelopeV1, governed dispatch, contract tests
---

# AgentTask E2E Contract Hardening

## Goal

Make the GitHub-to-runtime path regression-resistant without requiring physical hardware.

## Task

Add or improve automated tests that prove:

1. governed GitHub workpacks cannot bypass `/api/local/prompt-submit`;
2. the resulting payload becomes `AgentTaskEnvelopeV1`;
3. idempotency/request IDs are preserved;
4. invalid/legacy local payloads fail closed unless the explicit break-glass flag is set;
5. terminal job states are surfaced correctly to the submitter;
6. paid/prod/approval-required GitHub workpacks are rejected;
7. no test introduces a second orchestrator or direct runtime spawn.

Prefer extending existing orchestrator/runtime tests over creating parallel harnesses.

## Acceptance

- focused tests green;
- existing orchestrator tests green;
- no production changes;
- one PR only;
- PR body documents the canonical path and failure cases.

## Hard boundaries

- No deploy.
- No secrets.
- No paid APIs.
- No production mutations.
- No persistent AI runtime.

---
id: agent-loop-e2e-smoke-025
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: low
autonomy_approved: true
agent_role: executor
max_steps: 8
goal: prove the GitHub-to-agent engineering loop without touching production
---

# Opsly Engineering Loop — Harmless E2E Smoke

## Purpose

Prove the real unattended path:

GitHub task on trusted `main`
→ dispatcher pickup
→ local prompt watcher
→ Opsly Orchestrator
→ BullMQ `local-agents`
→ builder agent
→ branch
→ one harmless documentation change
→ tests/verification
→ pull request
→ durable GitHub evidence.

This task is intentionally non-production and must not touch Peskids runtime, infrastructure, Supabase, n8n side effects, secrets, networking, deploys, or customer-facing behavior.

## Required change

Create exactly one new file:

`docs/01-development/e2e/AGENT-LOOP-SMOKE-2026-09-11.md`

with:

- task id: `agent-loop-e2e-smoke-025`
- source: `docs/01-development/night-queue/025-agent-loop-e2e-smoke.md`
- UTC execution timestamp
- selected agent/worker identity if available
- request/job id if available
- statement: `No production runtime was modified.`

Do not modify any other tracked file unless required solely to create/open the PR metadata.

## Git behavior

- Never write directly to `main`.
- Create a focused branch named like `agent/e2e-smoke-025-*`.
- Commit only the smoke evidence file.
- Push the branch.
- Open a draft PR to `main`.
- Do not merge the PR.

## Safety constraints

Forbidden:

- production deploy
- Peskids changes
- Supabase/database mutation
- n8n activation/change
- secret reads
- Doppler mutation
- DNS/firewall/routing changes
- package/dependency changes
- workflow changes
- shell commands unrelated to the repo smoke
- outbound customer communication

If any forbidden capability is required, stop and report BLOCKED instead.

## Acceptance criteria

The smoke passes only if GitHub contains durable evidence of:

1. this task was discovered from trusted `main`;
2. a request/job id was created;
3. an agent/worker was selected;
4. execution started;
5. a non-main branch was created;
6. only the allowed documentation file changed;
7. a draft PR was opened;
8. no production action occurred.

## Expected report

```
AGENT_LOOP_E2E_SMOKE

TASK_ID: agent-loop-e2e-smoke-025
TASK_DISCOVERED:
TASK_CLAIMED:
REQUEST_ID:
JOB_ID:
NODE_ID:
AGENT_SELECTED:
EXECUTION_STARTED:
BRANCH_CREATED:
FILES_CHANGED:
TESTS_RUN:
PR_CREATED:
PRODUCTION_ACTIONS: NONE
RESULT: PASS | PARTIAL | BLOCKED | FAIL
BLOCKER:
```

If the runtime cannot prove any field, write `UNKNOWN`; do not fabricate evidence.

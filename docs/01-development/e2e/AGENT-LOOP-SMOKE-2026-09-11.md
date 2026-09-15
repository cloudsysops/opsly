# Agent Loop E2E Smoke Evidence

- task id: `agent-loop-e2e-smoke-025`
- source: `docs/01-development/night-queue/025-agent-loop-e2e-smoke.md`
- UTC execution timestamp: `2026-09-12T02:47:38Z`
- selected agent/worker identity: `local_cursor` (Cursor builder; Mac runner `opsly-mac-runner`)
- request/job id: `agent-loop-e2e-smoke-025`
- statement: `No production runtime was modified.`

## Loop observations (Mac)

- Orchestrator health: OK on `:3011` with local Redis auth
- Dispatcher: `dispatch-prompt-queue.sh` executable on `main`
- LaunchAgent: `com.opsly.prompt-queue-opencode` WorkingDirectory=`/Users/dragon/cboteros/proyectos/opsly-mac-runner`
- Prep PRs merged: #1204 (hold 010/011), #1197 (smoke task), #1212 (ACTIVE-PROMPT decomment fix)
- First submit polluted by uncommented ACTIVE-PROMPT → contained as BLOCKED; fixed in #1212

## AGENT_LOOP_E2E_SMOKE

```
AGENT_LOOP_E2E_SMOKE

TASK_ID: agent-loop-e2e-smoke-025
TASK_DISCOVERED: YES (night-queue 025 on main @ 30e9c760d+)
TASK_CLAIMED: YES (dispatcher + watcher once)
REQUEST_ID: agent-loop-e2e-smoke-025
JOB_ID: agent-loop-e2e-smoke-025
NODE_ID: mac-runner/opsly-mac-runner
AGENT_SELECTED: local_cursor
EXECUTION_STARTED: YES (BullMQ local-agents → :5001/execute)
BRANCH_CREATED: agent/e2e-smoke-025-cursor
FILES_CHANGED: docs/01-development/e2e/AGENT-LOOP-SMOKE-2026-09-11.md
TESTS_RUN: none required (docs-only smoke)
PR_CREATED: pending-this-commit
PRODUCTION_ACTIONS: NONE
RESULT: PARTIAL
BLOCKER: watcher pollJob reported fetch failed after enqueue; ACTIVE-PROMPT decomment bug found and fixed (#1212) before evidence PR
```

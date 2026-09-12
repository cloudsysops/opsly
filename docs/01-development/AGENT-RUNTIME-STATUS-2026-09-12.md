---
status: active
owner: platform
last_review: 2026-09-12
type: status-snapshot
tags:
  - opsly/agents
  - opsly/runtime
---

# Agent Runtime Status — 2026-09-12

This is an operational snapshot. Architecture remains canonical in
`docs/00-architecture/AGENT-RUNTIME-ARCHITECTURE.md`.

## Completed / merged

- real-runtime-only + ephemeral task execution is the canonical model;
- Session Manager + `opsly-task-*` tmux lifecycle is wired;
- Mac runtime bootstrap and readiness doctor exist;
- physical Mac validation found and fixed Node PATH, Session Manager dependency and `ai-board` build blockers;
- bridge/orchestrator health polling replaced fixed startup sleeps;
- Mac health deadline is configurable and bounded;
- `ai-board` clean-build coverage was added to main API/orchestrator/release paths;
- background runtime workpacks 045–051 were created;
- write-capable workpacks 046–049 and 051 are held pending typed approval;
- Gamer physical acceptance workpack 050 is pending on the Gamer node.

## Open runtime PRs

### #1307 — Hermes image / runtime topology closure

Purpose:

- build/package `ai-board` in `Dockerfile.hermes`;
- fail closed if Hermes image build fails;
- gate canonical runtime topology in CI.

Latest fixes replaced fragile shell-variable regex assertions with literal string assertions.

### #1308 — canonical GitHub Agent Queue submitter

Purpose:

- move the submitter into `opsly/main`;
- keep GitHub autonomous dispatch read-only;
- sanitize BullMQ custom IDs;
- reject malformed safety booleans;
- reject `prepared_only` as dispatched work;
- consume `returnvalue`;
- optionally require terminal completion;
- optionally require an exact acceptance marker.

Physical E2E will use:

`GAMER_OPENCODE_OK`

### #1322 — background scheduler fail-closed hardening

Purpose:

- autonomous background execution remains read-only;
- `requires_pr=true` tasks stop with an explicit write-approval blocker;
- `prepared_only` is not reported as dispatched;
- BullMQ `returnvalue` is preserved.

This PR is queued through `night-merge` after green checks.

## opsly-control

The Gamer E2E #005 is staged as a draft and must not be merged until prerequisites are green.

It requires:

- `opsly/main` canonical submitter;
- terminal completion;
- exact result `GAMER_OPENCODE_OK`;
- no Mac fallback;
- no paid provider fallback;
- no model download.

## Physical blockers observed from GitHub Actions

Hosted diagnostic preflight reported:

```text
actions_doppler_secret=absent
```

The self-hosted Mac diagnostic was also cancelled before any step executed, which means the job was not claimed by an available runner. That is runner availability evidence, not a runtime health failure.

Current external blockers:

1. `DOPPLER_TOKEN_PRD` must exist in `cloudsysops/opsly-control` Actions;
2. the existing `opsly-mac-runner` must be online;
3. the Gamer OpenCode/Ollama plane must be online before physical E2E.

Recovery is documented in the private control repo:

`docs/MAC-RUNNER-RECOVERY.md`

## Safe task state

```text
045  pending  read-only golden-path audit
046  held     write-capable contract hardening
047  held     write-capable routing hardening
048  held     evidence/observability implementation
049  held     runtime adapter documentation changes
050  pending  Gamer-only physical acceptance
051  held     typed write-approval chain
```

## Definition of done for the current runtime milestone

```text
Mac runner online
  ↓
Doppler Actions auth ready
  ↓
Mac runtime healthy
  ↓
read-only audit evidence
  ↓
PC Gamer online
  ↓
OpenCode + Ollama healthy
  ↓
GitHub E2E #005
  ↓
exact GAMER_OPENCODE_OK
  ↓
teardown confirmed
  ↓
healthy idle
```

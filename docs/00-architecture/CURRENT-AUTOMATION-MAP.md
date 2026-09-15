---
status: accepted
owner: architecture
last_review: 2026-09-12
type: architecture-note
tags:
  - opsly/agents
  - opsly/automation
---

# Current Automation Map — task → governed runtime → evidence

This map reflects the current canonical automation path.

For the architecture contract, read:
[AGENT-RUNTIME-ARCHITECTURE.md](AGENT-RUNTIME-ARCHITECTURE.md).

## Canonical task sources

Opsly has several task sources, but they must converge on the same execution boundary:

- tracked workpacks under `docs/01-development/night-queue/`;
- local prompt queue / watcher;
- GitHub Agent Queue in `opsly-control`;
- explicitly approved scheduler dispatch;
- future n8n or other integrations.

None of these is allowed to become a second orchestrator.

## Canonical execution flow

```text
task source
  ↓
governed submit
  ↓
POST /api/local/prompt-submit
  ↓
AgentTaskEnvelopeV1
  ↓
AgentTask policy / approval
  ↓
BullMQ local-agents
  ↓
eligible compute worker
  ↓
authenticated runtime bridge
  ↓
Session Manager
  ↓
ephemeral tmux opsly-task-*
  ↓
real runtime
  ↓
terminal result / bounded evidence
  ↓
teardown
```

## What is persistent

Persistent infrastructure is permitted where required:

- orchestrator;
- queue workers;
- Redis;
- prompt watcher;
- authenticated CLI/runtime bridge;
- launchd/systemd wrappers.

Persistent AI task sessions are not canonical.

Healthy idle:

```text
0 opsly-task-* sessions
```

## Machine roles

| Node | Role |
|---|---|
| GitHub / VPS | control plane, CI, queue coordination, deploy gates |
| Mac | local worker/control node for eligible runtimes and read-only opportunistic work |
| PC Gamer | `local_opencode` + local Ollama/GPU path; other explicitly registered GPU work |
| Production VPS | coordinator/shared platform; not the default opportunistic AI executor |

Important routing invariant:

`local_opencode` must not silently fall back from the Gamer to the Mac.

## GitHub Agent Queue

Target path:

```text
opsly-control workpack
→ canonical submitter in opsly/main
→ /api/local/prompt-submit
→ AgentTaskEnvelopeV1
→ BullMQ local-agents
→ worker/runtime
→ /api/job-status/:id
```

Current autonomous GitHub policy is intentionally read-only.

The physical Gamer acceptance additionally requires:

`GAMER_OPENCODE_OK`

A merely queued or completed job is insufficient if the expected runtime marker is missing.

## Background scheduler

The background scheduler now has real selection and dispatch components:

- resource probe;
- idle-window policy;
- task selector;
- concurrency guard;
- free-first cost policy;
- local anti-duplicate state;
- governed submit;
- terminal polling.

Current write policy:

- read-only work may be eligible;
- write-capable background work is fail-closed;
- write approval must become typed and task-bound before autonomous writes are enabled.

See workpack 051 for the approval contract.

## Tracked runtime workpacks

Current queue intent:

| Workpack | State | Purpose |
|---|---|---|
| 045 | pending | read-only golden-path audit |
| 046 | held | AgentTask E2E write-capable hardening |
| 047 | held | Gamer routing hardening |
| 048 | held | runtime evidence implementation |
| 049 | held | runtime adapter documentation changes |
| 050 | pending | Gamer physical acceptance |
| 051 | held | typed GitHub/background write approval |

## Runtime names vs roles

Real external runtimes are registered through:
`config/external-agent-registry.json`.

Examples include OpenCode, Claude Code, Codex CLI, Hermes and OpenClaw integrations.

Names such as architect, developer, reviewer, QA or planner are roles. They must not be interpreted as proof that a dedicated always-on process exists.

## Known external blockers — snapshot 2026-09-12

The architecture path is mostly implemented. Current physical blockers are external to the code path:

- `DOPPLER_TOKEN_PRD` absent from `opsly-control` Actions at the last hosted preflight;
- existing Mac self-hosted runner did not claim diagnostic jobs;
- Gamer physical path still requires live OpenCode/Ollama validation.

See:
[Agent Runtime Status — 2026-09-12](../01-development/AGENT-RUNTIME-STATUS-2026-09-12.md).

## Security invariants

- no Markdown-as-shell execution;
- no embedded secrets;
- no direct AI CLI spawn from GitHub/scheduler integration;
- no silent paid-provider fallback in local acceptance;
- no production deploy from autonomous read-only work;
- no write approval inferred solely from an HTTP header;
- no second orchestrator.

## Related

- [Canonical agent runtime architecture](AGENT-RUNTIME-ARCHITECTURE.md)
- [Background work scheduler](BACKGROUND-WORK-SCHEDULER.md)
- [Orchestrator](ORCHESTRATOR.md)
- [Agent prompt queue](../01-development/AGENT-PROMPT-QUEUE.md)

---
status: canon
owner: operations
last_review: 2026-10-03
type: config
tags:
  - opsly/hermes
  - opsly/pc-gamer
  - opsly/runtime
---

# Hermes Agent Context

Hermes is a **real external runtime** governed by Opsly. It may run on the Mac or on the
PC Gamer under WSL, but it is not a second orchestrator and it does not own production.

The local PC Gamer use case is:

```text
GitHub / Mission Control / governed workpack
        ↓
Opsly ownership + policy gates
        ↓
PC Gamer / WSL
        ↓
Hermes Agent CLI
        ↓
local Ollama model
        ↓
bounded result + evidence
```

## Required context before work

1. `AGENTS.md`
2. `VISION.md`
3. `docs/00-architecture/AGENT-RUNTIME-ARCHITECTURE.md`
4. `docs/03-agents/AGENT-BRAIN-CONTRACT.md`
5. `config/external-agent-registry.json`
6. `config/external-runtime-policy.json`
7. the active workpack / PR / handoff evidence

Hermes should discover these paths itself. Do not ask the operator to repeat paths that are
already present in the repository.

## PC Gamer runtime contract

Canonical repository:

```text
/home/opsly/opsly
```

Canonical external-runtime identity:

```text
worker: hermes-cli
job type: local_hermes
bridge port: 5007
```

Expected local model path:

```text
Hermes Agent -> Ollama -> agentic local model
```

The model context configured in Hermes must match the context actually served by Ollama.
Do not claim a 262k context window unless the server is actually serving that window.

## Work protocol

Before changing code:

1. inspect `git status --short`, branch and HEAD;
2. fetch remote refs;
3. read repository governance;
4. detect active workpacks / branch ownership;
5. detect duplicate work;
6. only then select a bounded task.

Required evidence:

```text
WORK_ID:
STATUS:
BRANCH:
COMMIT:
FILES_CHANGED:
CHECKS:
TESTS:
BLOCKERS:
RISK:
NEXT_ACTION:
READY_FOR_PR:
```

If equivalent work is already owned by another agent, return
`DUPLICATE_WORK_DETECTED` and do not implement it again.

## Boundaries

Hermes MUST NOT:

- push directly to `main`;
- auto-merge;
- auto-deploy production;
- mutate Peskids production;
- rotate secrets;
- mutate production data;
- change n8n side effects, DNS or routing without explicit approval;
- create a second queue, registry, scheduler or task store;
- expose a local `/execute` bridge publicly;
- run destructive BIOS/firmware actions;
- hide failing tests or use `--no-verify`.

Hermes MAY:

- inspect the repository and local runtime;
- review code;
- decompose tasks;
- make bounded changes on a task branch when write access is explicitly granted;
- run relevant tests;
- prepare commits and evidence;
- use the interactive handoff path when the task is operator-relayed.

## Updating Hermes Agent

Do not update just because the banner reports that the checkout is many commits behind.

First:

```bash
hermes --version
hermes update --check
hermes update --plan
```

A version update is a maintenance operation, not part of normal task execution. Update only
after current work is committed/stashed and the runtime is idle. Keep the pre-update backup,
then run:

```bash
hermes update --backup
hermes config check
hermes config migrate
```

After updating, run the PC Gamer Hermes doctor and a small local smoke task before restoring
autonomous dispatch.

See `docs/runbooks/HERMES-PC-GAMER.md`.

## Routing rule

When Hermes enriches or routes a task, attach the most relevant module, doc and agent nodes
from the shared graph and preserve:

- `tenant_slug`
- `request_id`
- `agent_role`
- source module or workflow when known
- workpack identity / conflict key when available

Hermes is not a second orchestrator. It reuses BullMQ, Redis, Supabase, Context Builder,
the external-agent registry, Session Manager and the shared Brain contract.

---
status: canon
owner: operations
last_review: 2026-10-03
type: runbook
tags:
  - opsly/hermes
  - opsly/pc-gamer
  - opsly/wsl
---

# Hermes on PC Gamer — WSL/Ollama Runbook

## Purpose

Run Hermes Agent on the PC Gamer as a governed local Opsly worker for planning, review,
research and bounded local execution. GitHub remains the source of truth and Opsly remains
the control plane.

This runtime is **not** a second orchestrator.

## Canonical topology

```text
GitHub / Mission Control
        ↓
workpack + ownership gates
        ↓
Opsly orchestrator / external-agent-registry
        ↓
PC Gamer WSL
        ├── OpenCode  :5004
        └── Hermes    :5007
                ↓
              Ollama
                ↓
          local agentic model
```

## Current known-good baseline

Observed on the PC Gamer on 2026-10-03:

- Hermes Agent: v0.21.3
- provider: local Ollama launch
- selected model: `qwen3.5:latest`
- session-reported context: 262,144 tokens
- repository: `/home/opsly/opsly`

The context value is valid only if Ollama is actually serving that amount. Hermes and the
model server must agree on the context window.

## Start

```bash
cd /home/opsly/opsly
bash scripts/ops/pc-gamer-hermes-doctor.sh
hermes
```

Inside Hermes, give it the active workpack or ask it to inventory the repo first. It must
read `.hermes/HERMES.md` and repository governance before mutating code.

## Native Hermes model configuration

Hermes Agent's native configuration lives under `~/.hermes/config.yaml`. Do not put API
keys or machine secrets in this repository.

For a local Ollama endpoint, keep the model configuration conceptually equivalent to:

```yaml
model:
  default: qwen3.5:latest
  provider: custom
  base_url: http://127.0.0.1:11434/v1
  context_length: 262144
```

Only use `262144` if the running Ollama server has been configured to serve that window.
If the server uses a smaller context, lower Hermes to match instead of advertising a larger
window.

Use Hermes's interactive model/config commands when possible rather than hand-editing
unknown future schema:

```bash
hermes model
hermes config check
```

## Update policy

The CLI banner can report a large commit distance from upstream `main` even when the
installed version is the latest stable release. Treat release updates as maintenance.

Before updating:

```bash
cd /home/opsly/opsly
git status --short
hermes --version
hermes update --check
hermes update --plan
```

Do not update while Hermes owns a task, while there are uncommitted runtime-source edits,
or while a stream-critical workflow depends on the current process.

When the maintenance window is clear:

```bash
hermes update --backup
hermes config check
hermes config migrate
bash /home/opsly/opsly/scripts/ops/pc-gamer-hermes-doctor.sh
```

Then run one low-risk smoke task before re-enabling autonomous dispatch.

## Opsly bridge

The canonical registry entry is `hermes-cli`:

- job type: `local_hermes`
- bridge port: `5007`
- endpoint env: `OPSLY_HERMES_AGENT_URL`

The bridge may be started from the repo with:

```bash
cd /home/opsly/opsly
npm run opsly:local-hermes-service
```

The interactive `hermes` CLI and the Opsly HTTP bridge are related but different modes.
Do not create a second registry entry for the same runtime.

## Work protocol

A safe session starts with:

```bash
cd /home/opsly/opsly
git status --short
git branch --show-current
git fetch --all --prune
```

Hermes then:

1. reads governance;
2. discovers workpacks and ownership;
3. checks duplicate work;
4. chooses at most a bounded task;
5. works on a task branch;
6. runs tests;
7. returns evidence.

Evidence contract:

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

## Guardrails

Never:

- push directly to `main`;
- auto-merge or auto-deploy;
- mutate Peskids production;
- rotate secrets or mutate production data;
- expose port 5007 publicly;
- create a second queue/registry/task store;
- use `--no-verify`;
- claim work complete without evidence.

## Troubleshooting

### Hermes says context is too low

Check the actual Ollama serving context. The configured Hermes context must match it.

### Hermes title generation times out

This is auxiliary. Continue the task if the primary model/tool session is healthy.

### `tirith` scanner unavailable

Treat this as degraded command scanning, not a green security state. Keep changes bounded and
run repository security/check gates before PR readiness.

### Bridge is down but interactive Hermes works

This is allowed for an operator-relayed session. It is **not** equivalent to an autonomous
Opsly worker. Start `npm run opsly:local-hermes-service` only when you want queue-driven
execution through the canonical runtime adapter.

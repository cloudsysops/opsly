---
id: activate-external-agent-runtimes-029
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Activate External Agent Runtimes

## Goal

Prove the approved external agent stack on real nodes without giving external binaries uncontrolled production authority.

## Inputs

- `config/external-agent-upstreams.json`
- `config/external-agent-registry.json`
- `config/trusted-execution-nodes.json`
- `docs/00-architecture/EXTERNAL-AGENT-RUNTIME-STACK.md`

## Mac

1. dry-run bootstrap;
2. clone/update approved upstreams outside Opsly;
3. confirm required binaries;
4. start OpenCode and Hermes bridges;
5. optionally start Goose;
6. verify bridge ports;
7. verify OpenClaw CLI;
8. run one read-only/planning smoke per agent;
9. persist evidence in GitHub.

## PC Gamer

Verify:

- Ollama;
- GPU health;
- ffmpeg;
- embedding/local inference;
- OpenClaw only if needed for compute/device use.

Do not grant git push/main/release capabilities.

## VPS

Verify only control-plane dependencies.

Do not install write-capable engineering agents merely for parity.

## Acceptance

```
EXTERNAL_AGENT_ACTIVATION

NODE:
RUNTIME:
SOURCE:
BINARY_VERSION:
BRIDGE:
CAPABILITIES:
NODE_AUTH:
TASK_SOURCE_GUARD:
SMOKE:
PRODUCTION_AUTHORITY: NONE
RESULT:
BLOCKER:
```

No secret values in the report.

---
status: canon
owner: platform
last_review: 2026-09-11
type: architecture
---

# External Runtime Policy — Real Binaries Only

## Canonical rule

Opsly **does not create fictional AI agents**.

An Opsly "role" such as planning, implementation, debugging or review is a temporary assignment to a **real external runtime/binary**. Internal platform components are capabilities, workers or policy services — not AI agents.

### Real external runtimes

| Runtime | Source/install | Canonical role | Persistent? |
| --- | --- | --- | --- |
| Hermes Agent | `NousResearch/Hermes-Agent`, pinned tag + SHA | planning/decomposition | No |
| OpenCode | `anomalyco/opencode`, pinned tag + SHA | implementation | No |
| Codex CLI | installed binary | debugging/integration | No |
| Claude Code | installed binary | review/architecture | No |
| Goose | `aaif-goose/goose`, pinned tag + SHA | fallback/tool use | No |
| OpenClaw | `openclaw/openclaw`, pinned tag + SHA | auxiliary runtime | No |
| Cursor | installed application/CLI | interactive engineering | Human-driven |
| GitHub Copilot | installed product/CLI where applicable | optional assistant | No canonical execution authority |

The runtime may be installed and its authenticated HTTP bridge may remain available. **The AI process itself is created only for a bounded task.**

## What is not an agent

Do not present these components as agents:

- AgentTask
- TaskSourceGuard
- Node Auth
- Capability Router
- Approval Gate
- BullMQ workers
- Session Manager
- Mission Control
- LLM Gateway
- Ollama
- FFmpeg
- Playwright runner

They are platform/runtime capabilities.

## Clone policy

Current repositories:

```text
cloudsysops/opsly
~/.opsly/external-agents/
├── Hermes-Agent/
├── opencode/
├── goose/
└── openclaw/
```

External source trees must be checked out at a reviewed tag and exact commit SHA. Execution must never depend on an unreviewed default-branch update.

Do **not** clone source for Claude Code, Codex CLI, Cursor, Copilot, Ollama, FFmpeg, Python, Node.js, CUDA, Tailscale or Doppler. Install those through their supported binary/package distribution.

ComfyUI is deferred until the PC Gamer phase-1 worker, heartbeat, Ollama and FFmpeg path have real operating telemetry.

## Canonical execution lifecycle

```text
AgentTask
  ↓
TaskSourceGuard + Node Auth
  ↓
Capability Router
  ↓
temporary role assignment
  ↓
Session Manager
  ↓
opsly-task-<id>-<role>
  ↓
real external CLI/runtime
  ↓
evidence / tests / commit / PR
  ↓
tmux teardown
```

A bridge being online does not mean an agent is running.

## Language standard

Preferred language:

- "Hermes runtime", not "Opsly Hermes agent" when referring to the external binary.
- "planning role", not a permanent "Planner agent".
- "OpenCode runtime assigned to implementation".
- "Claude reviewer session".
- "BullMQ worker", never "BullMQ agent".
- "PC Gamer compute worker", not "GPU agent".

Internal modules with historical agent names should be treated as legacy naming until safely renamed. Renaming must follow dependency analysis and cannot break production references.

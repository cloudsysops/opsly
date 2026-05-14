---
status: active
owner: platform
last_review: 2026-05-10
type: module
layer: orchestration
repo_path: apps/orchestrator
runtime: Node.js / BullMQ
tags:
  - opsly/module
  - opsly/orchestrator
  - opsly/agents
related_docs:
  - docs/00-architecture/ORCHESTRATOR.md
  - docs/03-agents/LOCAL-AGENT-EXECUTION.md
  - docs/06-multi-agent/PARALLEL-EXECUTION-GUIDE.md
---

# Orchestrator

`apps/orchestrator` es el motor asincrono de Opsly: OpenClaw, BullMQ workers,
local-agents, Hermes hooks, control/worker split y validacion.

## Colas importantes

- `openclaw`
- `local-agents`
- `agent-classifier`
- `approval-gate`
- `hermes-orchestration`

## Local Agents

El flujo local actual usa `POST /api/local/prompt-submit` y worker unificado para
Cursor, Claude, Copilot y OpenCode. Ver [[03-agents/LOCAL-AGENT-EXECUTION|Local Agent Execution]].

## Conecta con

- [[brain/modules/llm-gateway|LLM Gateway]]
- [[brain/modules/mcp|MCP Server]]
- [[brain/agents/README|Agents]]
- [[brain/workflows/openclaw|OpenClaw Workflow]]

## Guardrail

Jobs deben llevar `tenant_slug` y `request_id`; idempotencia cuando haya
`idempotency_key`.


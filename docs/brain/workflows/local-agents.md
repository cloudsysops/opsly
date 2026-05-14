---
status: active
owner: operations
last_review: 2026-05-10
type: workflow
tags:
  - opsly/workflow
  - opsly/agents
---

# Local Agents Workflow

Flujo interno para enviar prompts desde Obsidian/Cursor hacia agentes locales.

## Runtime actual

- Watcher: `scripts/local-prompt-watcher.ts`
- Endpoint: `POST /api/local/prompt-submit`
- Queue: `local-agents`
- Worker: unified `LocalAgentWorker`
- Servicios mock/reales: Cursor, Claude, Copilot, OpenCode

## Evidencia

- Prompt smoke: `.cursor/prompts/queue/008-smoke-screen-daemon.md`
- Respuesta smoke: `.cursor/responses/response-smoke-screen-daemon-008.md`

## Docs

- [[03-agents/LOCAL-AGENT-EXECUTION|Local Agent Execution]]
- [[brain/agents/README|Agents MOC]]
- [[brain/modules/orchestrator|Orchestrator]]


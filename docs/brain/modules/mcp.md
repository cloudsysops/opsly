---
status: active
owner: ai-platform
last_review: 2026-05-10
type: module
layer: ai-tools
repo_path: apps/mcp
runtime: MCP server
tags:
  - opsly/module
  - opsly/mcp
related_docs:
  - docs/adr/ADR-009-openclaw-mcp-architecture.md
  - docs/02-tools/MCP-SERVERS.md
---

# MCP Server

`apps/mcp` expone tools para que agentes consulten y operen Opsly con guardrails.
Debe actuar como adapter hacia OpenClaw/API, no como segundo control plane.

## Tools relevantes

- Graphyfi: `apps/mcp/src/tools/graphyfi.ts`
- NotebookLM / knowledge
- Orchestrator execution

## Conecta con

- [[brain/modules/orchestrator|Orchestrator]]
- [[brain/modules/context-builder|Context Builder]]
- [[brain/architecture/knowledge-graph|Knowledge Graph]]


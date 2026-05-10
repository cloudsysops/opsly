---
status: active
owner: ai-platform
last_review: 2026-05-10
type: module
layer: ai-control
repo_path: apps/llm-gateway
runtime: Node.js service
tags:
  - opsly/module
  - opsly/llm
related_docs:
  - docs/00-architecture/LLM-GATEWAY.md
  - docs/adr/ADR-010-llm-gateway.md
---

# LLM Gateway

Punto unico para llamadas LLM, routing, cache, usage y costos. Ningun modulo debe
llamar proveedores LLM directo fuera de OpenClaw / gateway.

## Consumidores

- [[brain/modules/orchestrator|Orchestrator]]
- [[brain/modules/api|API Control Plane]]
- Syra/social content
- Hermes metering

## Contratos

- `llmCall`
- `logUsage`
- routing bias: `cost`, `balanced`, `quality`
- `tenant_slug` + `request_id` obligatorios para trazabilidad


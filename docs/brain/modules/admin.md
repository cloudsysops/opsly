---
status: active
owner: platform
last_review: 2026-05-10
type: module
layer: control-plane
repo_path: apps/admin
runtime: Next.js app
tags:
  - opsly/module
  - opsly/admin
related_docs:
  - docs/00-architecture/COST-DASHBOARD.md
  - docs/03-agents/LOCAL-AGENT-EXECUTION.md
---

# Admin Console

`apps/admin` es el cockpit interno: tenants, costos, OpenClaw, agentes, workers,
metricas, NotebookLM, feedback y mission control.

## Superficies

- `/dashboard`
- `/tenants`
- `/costs`
- `/openclaw-governance`
- `/mission-control`
- `/openclaw/ide`
- `/metrics/llm`
- `/monitoring/mac2011`

## Conecta con

- [[brain/modules/api|API Control Plane]]
- [[brain/modules/orchestrator|Orchestrator]]
- [[brain/agents/README|Agents]]
- [[brain/workflows/README|Workflows]]

## Mejora pendiente

Reducir ruido visual y convertirlo en tres vistas de trabajo: salud de plataforma,
tenants/clientes y agentes/automatizacion.


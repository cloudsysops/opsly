---
status: active
owner: ai-platform
last_review: 2026-05-10
type: workflow
tags:
  - opsly/workflow
  - opsly/openclaw
---

# OpenClaw Workflow

Flujo canonico para ejecutar intenciones y jobs IA.

```mermaid
flowchart LR
  Request["intent / prompt"] --> API["API or MCP"]
  API --> Orchestrator["OpenClaw Orchestrator"]
  Orchestrator --> Queue["BullMQ"]
  Queue --> Worker["Worker"]
  Worker --> Gateway["LLM Gateway / Tools"]
  Gateway --> Usage["Hermes usage"]
```

## Docs

- [[00-architecture/OPENCLAW-ARCHITECTURE|OpenClaw Architecture]]
- [[00-architecture/ORCHESTRATOR|Orchestrator]]
- [[brain/modules/orchestrator|Orchestrator module]]


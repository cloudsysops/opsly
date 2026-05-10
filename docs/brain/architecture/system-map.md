---
status: canon
owner: architecture
last_review: 2026-05-10
type: architecture-map
tags:
  - opsly/architecture
  - opsly/system-map
---

# System Map

```mermaid
flowchart TB
  subgraph UserPlane["User plane"]
    Web["apps/web"]
    Portal["apps/portal"]
    Admin["apps/admin"]
  end

  subgraph ControlPlane["Control plane"]
    API["apps/api"]
    Orchestrator["apps/orchestrator"]
    MCP["apps/mcp"]
    LLM["apps/llm-gateway"]
    Context["apps/context-builder"]
  end

  subgraph DataPlane["Data plane"]
    Supabase["Supabase platform"]
    Redis["Redis / BullMQ"]
    Stripe["Stripe"]
    Docs["docs/ + config/knowledge-index.json"]
  end

  subgraph TenantPlane["Tenant plane"]
    N8N["n8n"]
    Kuma["Uptime Kuma"]
    LocalServices["apps/local-services"]
  end

  Web --> API
  Portal --> API
  Admin --> API
  API --> Supabase
  API --> Stripe
  API --> Orchestrator
  Orchestrator --> Redis
  Orchestrator --> LLM
  MCP --> Orchestrator
  Context --> Docs
  API --> N8N
  API --> Kuma
  Portal --> LocalServices
```

## Modulos

- [[brain/modules/api|API Control Plane]]
- [[brain/modules/admin|Admin Console]]
- [[brain/modules/portal|Tenant Portal]]
- [[brain/modules/orchestrator|Orchestrator]]
- [[brain/modules/llm-gateway|LLM Gateway]]
- [[brain/modules/mcp|MCP Server]]


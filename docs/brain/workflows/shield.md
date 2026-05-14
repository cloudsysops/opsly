---
status: active
owner: product
last_review: 2026-05-10
type: workflow
tags:
  - opsly/workflow
  - opsly/shield
---

# Shield Workflow

Flujo de Opsly Guardian Grid: posture, secretos, alertas y dashboard.

## Camino

```mermaid
flowchart LR
  Cron["cron shield-secret-scan"] --> API["apps/api /api/cron/shield-secret-scan"]
  API --> Supabase["platform shield tables"]
  Portal["apps/portal /shield/dashboard"] --> API
  API --> Discord["Discord alert webhook"]
  API --> Hermes["logUsage / request_id"]
```

## Docs

- [[01-development/VISION|Vision]]
- [[brain/modules/api|API Control Plane]]
- [[brain/modules/portal|Tenant Portal]]


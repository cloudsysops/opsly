---
status: canon
owner: operations
last_review: 2026-05-10
type: moc
tags:
  - opsly/brain
  - opsly/workflows
---

# Workflows MOC

Automatizaciones que conectan producto, agentes, tenants y billing.

## Workflows clave

- [[brain/workflows/openclaw|OpenClaw Workflow]]
- [[brain/workflows/shield|Shield Workflow]]
- [[brain/workflows/billing|Billing Workflow]]
- [[brain/workflows/marketplace-crm|Marketplace CRM]]
- [[brain/workflows/local-agents|Local Agents Workflow]]

## Reglas

- Todo workflow debe declarar tenant, trigger, acciones, rollback y observabilidad.
- Workflows n8n reusable deben vivir en `config/n8n-workflows/` o
  `docs/n8n-workflows/` con README.


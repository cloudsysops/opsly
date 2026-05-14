---
status: active
owner: product
last_review: 2026-05-10
type: module
layer: customer-plane
repo_path: apps/portal
runtime: Next.js app
tags:
  - opsly/module
  - opsly/portal
related_docs:
  - docs/01-development/CLIENT-TESTING-CHECKLIST.md
  - docs/04-infrastructure/SECURITY_CHECKLIST.md
---

# Tenant Portal

`apps/portal` es la superficie del cliente: dashboards, billing, workflows,
Shield, onboarding, invoices y agent IDE por tenant.

## Flujos vendibles

- Shield dashboard: score, secretos, alertas.
- Workflows: automatizaciones por tenant.
- Billing/usage: facturas, suscripciones, consumo LLM.

## Conecta con

- [[brain/modules/api|API Control Plane]]
- [[brain/tenants/README|Tenants]]
- [[brain/workflows/shield|Shield Workflow]]
- [[brain/workflows/marketplace-crm|CRM Marketplace]]

## Guardrail

Todo acceso por `tenant/[slug]` debe usar comparacion estricta contra la sesion
del portal.


---
status: active
owner: platform
last_review: 2026-05-10
type: module
layer: control-plane
repo_path: apps/api
runtime: Next.js API routes
tags:
  - opsly/module
  - opsly/api
related_docs:
  - docs/00-architecture/openapi-opsly-api.yaml
  - docs/04-infrastructure/SECURITY_CHECKLIST.md
---

# API Control Plane

`apps/api` concentra rutas SaaS multi-tenant: tenants, portal, billing, Shield,
local-services, admin, social/Syra y cron jobs.

## Contratos

- OpenAPI subset: [OpenAPI Opsly API](00-architecture/openapi-opsly-api.yaml)
- Portal Zero-Trust: [[04-infrastructure/SECURITY_CHECKLIST|Security Checklist]]
- Tenants: [[tenants/README|Tenants]]

## Depende de

- Supabase `platform`
- Stripe
- Redis / BullMQ para eventos y workers
- [[brain/modules/llm-gateway|LLM Gateway]] para IA y usage
- [[brain/modules/orchestrator|Orchestrator]] para ejecucion asincrona

## Rutas clave

- `apps/api/app/api/portal/**`
- `apps/api/app/api/admin/**`
- `apps/api/app/api/shield/**`
- `apps/api/app/api/local-services/**`
- `apps/api/app/api/social/**`

## Guardrail

Toda ruta tenant debe resolver identidad desde sesion/token confiable; no confiar
en `tenant_slug` del body si el usuario no esta autenticado para ese tenant.


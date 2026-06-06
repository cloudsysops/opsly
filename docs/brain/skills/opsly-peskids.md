---
name: opsly-peskids
version: 1.0.0
category: operations
priority: high
triggers:
  - Peskids
  - peskids
  - familias
  - teacher
  - support
  - admin
  - landing
  - dashboard
cross_refs:
  - opsly-tenant
  - opsly-frontend
  - opsly-api
  - opsly-supabase
  - opsly-infra
  - opsly-qa
session_context: trabajo en peskids — landing, auth, familias, teacher, admin, deploy
subagents:
  - opsly-frontend
  - opsly-api
  - opsly-qa
  - opsly-supabase
when_not: >-
  Si el cambio aplica a todos los tenants, usa opsly-tenant en vez de este
  skill. No usar para cambios globales de arquitectura.
tags:
  - opsly/skill
  - opsly/operations
---

# opsly-peskids

> Peskids tenant-specific product and operations work. Use when changing landing, admin, teacher, support, families, auth, routes, docs, or deployment for the Peskids tenant.

## Cuándo cargar
trabajo en peskids — landing, auth, familias, teacher, admin, deploy

## Subagentes recomendados
- [[opsly-frontend]]
- [[opsly-api]]
- [[opsly-qa]]
- [[opsly-supabase]]

## Cuándo NO
Si el cambio aplica a todos los tenants, usa opsly-tenant en vez de este skill. No usar para cambios globales de arquitectura.

## Cross-refs
[[opsly-tenant]] · [[opsly-frontend]] · [[opsly-api]] · [[opsly-supabase]] · [[opsly-infra]] · [[opsly-qa]]

## Links
- [SKILL.md](../../../packages/skills/user/opsly-peskids/SKILL.md)
- [[brain/tenants/peskids|Tenant: peskids]]

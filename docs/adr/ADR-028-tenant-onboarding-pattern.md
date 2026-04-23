# ADR-028 — Patrón de onboarding por tenant (plantilla + config)

## Estado

Aceptado (2026-04-23)

## Contexto

Opsly opera multi-tenant con stacks repetibles (Compose por tenant) y documentación/prompts que deben escalar sin duplicar “magia” por cliente.

## Decisión

Adoptar un patrón **genérico reusable (Opción B)**:

- **Plantilla**: `docs/prompts/tenant-onboarding/TENANT-ONBOARDING-TEMPLATE.md` (variables explícitas).
- **Config por tenant**: `config/tenants/<slug>.json` validado por `config/tenants/schema.tenant-config.json`.
- **Validación compartida**: `docs/prompts/tenant-onboarding/DEPLOYMENT-VALIDATION.md`.
- **Infra compartida documentada**: `docs/prompts/tenant-onboarding/INFRASTRUCTURE-SETUP.md`.

LegalVial (y cualquier subcliente/híbrido) se modela como **instancia** del patrón (p.ej. `parent_tenant_slug` + `client_slug`), no como un prompt monolítico irreutilizable.

## Consecuencias

- Menos drift entre tenants: mejoras en plantilla/checklist benefician a todos.
- Requiere disciplina: no crear prompts “solo para un cliente” sin extraer parámetros a config.

## Notas operativas (Drive)

Para mantener el mismo layout en Google Drive (fuera del repo), existe automatización opcional:

- `npm run opsly:drive:ensure-layout`
- `npm run opsly:drive:upload-tenant-onboarding`

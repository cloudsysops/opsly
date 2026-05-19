---
status: canon
owner: operations
last_review: 2026-05-10
---

# Tenants — documentación Opsly

Hub para **multi-tenant**: producción, runbooks, pruebas, onboarding y subclientes.

| Carpeta | Contenido |
| --- | --- |
| [`production/`](production/TENANT-PRODUCTION-BASELINE.md) | Inventario prod, baseline y hardening (`TENANT-PRODUCTION-*`). |
| [`runbooks/`](runbooks/TENANT-PRODUCTION-CHECKLIST.md) | Checklist prod, rollout, triage API, invitaciones. |
| [`testing/`](testing/TENANT-TESTING-PLAN.md) | Plan y guía de pruebas en staging. |
| [`onboarding-prompts/`](onboarding-prompts/TENANT-ONBOARDING-TEMPLATE.md) | Plantillas y validación de onboarding (histórico `docs/prompts/tenant-onboarding/`). |
| [`legalvial/`](legalvial/LEGALVIAL-ARCHITECTURE-DECISION.md) | Notas del subcliente LegalVial (LocalRank). |
| [`peskids/`](peskids/README.md) | Tenant incubado Peskids (MVP, extracción a `peskids-platform`). |

**Stubs de compatibilidad** (no editar): `docs/stubs/TENANT-PRODUCTION-*.md`, `docs/04-infrastructure/TENANT-PRODUCTION-*.md`, `docs/runbooks/TENANT-*.md` relevantes, `docs/01-development/TENANT-TESTING-*.md`, `docs/prompts/tenant-onboarding/*.md`.

Runbooks generales (LegalVial go-live, subclientes) siguen en [`../runbooks/`](../runbooks/README.md) (p. ej. `LEGALVIAL-*`, `SUBCLIENT-ONBOARDING-TEMPLATE.md`).

Normas de ubicación: [`../STRUCTURE-GUARDRAILS.md`](../STRUCTURE-GUARDRAILS.md).

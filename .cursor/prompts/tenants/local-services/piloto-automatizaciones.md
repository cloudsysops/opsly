---
tenant_slug: local-services
brand_name: Equipa
status: active
owner: producto / field
purpose: servicio productivo — limpieza de equipos + upgrade + automatizaciones
---

# Tenant **Equipa** (`local-services`)

**Marca comercial:** **Equipa** (oferta: limpieza de equipos e upgrade en sitio).  
**Slug Opsly (estable):** `local-services` — es el identificador en DB, URLs n8n/uptime y JWT; **no cambiar** después del onboard.

## Trato operativo

- **Tenant productivo** para empezar a **ofrecer el servicio** y seguir usando el stack como banco de pruebas de automatización.
- Misma barra que cualquier cliente: `platform.tenants`, schema, n8n + Uptime, portal, Zero-Trust.

## Config en repo

- `config/tenants/local-services.json` — nombre comercial **Equipa**; ajustar `platform_domain` si el entorno no es smiletripcare staging.

## Go-live (humano)

- Runbook: **`docs/runbooks/LOCAL-SERVICES-GO-LIVE.md`**
- Onboarding recomendado en repo: **`./scripts/opsly.sh create-tenant`** (ver runbook genérico `docs/runbooks/ONBOARDING-NEW-CLIENT.md`).

## Prompts Cursor

- `@.cursor/prompts/local-services-tech-builder.md` — Week 1 técnico (API, migraciones, book).
- Este archivo — contexto marca + tenant productivo.

## Cuidados

- Invitaciones / Resend: dominio verificado si el email del owner no es de prueba.
- Tras go-live, anotar en `AGENTS.md` (🔄) fecha y entorno **live**.

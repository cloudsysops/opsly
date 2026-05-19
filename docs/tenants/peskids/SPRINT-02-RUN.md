---
status: active
owner: product
last_review: 2026-05-19
tenant_slug: peskids
---

# Peskids Sprint 02 — MVP que corre (Opsly)

Sprint 01 = diseño. **Sprint 02 = runtime mínimo** en Opsly antes de extraer a `peskids-platform`.

## Qué se implementó

| Pieza | Ubicación |
|-------|-----------|
| Migración SQL | `supabase/migrations/0053_peskids_mvp.sql` |
| POST lead público | `POST /api/public/tenants/peskids/leads` |
| POST feedback público | `POST /api/public/tenants/peskids/feedback` |
| Dashboard owner (JWT portal) | `GET /api/portal/tenant/peskids/peskids/summary` |
| Formularios HTML | `apps/api/public/peskids/lead-form.html`, `feedback-form.html` |
| Smoke script | `scripts/peskids-mvp-smoke.sh` |

**Approval-first:** sin email automático al padre ni auto-reply WhatsApp.

## Pasos operativos (humano)

### 1. Aplicar migración Supabase

```bash
cd /path/to/intcloudsysops
npx supabase link --project-ref <ref>   # si no enlazado
npx supabase db push
```

Verificar tablas: `platform.peskids_leads`, `platform.peskids_feedback`.

### 2. Desplegar API

Merge PR → workflow Deploy → `docker compose pull app` en VPS (o stack habitual).

### 3. Smoke

```bash
API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh
```

Esperar `HTTP 201` en POST lead (si tenant `peskids` está `active` en DB).

### 4. Formularios

- `https://api.<PLATFORM_DOMAIN>/peskids/lead-form.html`
- Owner dashboard vía portal: `GET …/api/portal/tenant/peskids/peskids/summary` con Bearer JWT

### 5. Invitar owner al portal (si falta)

`./scripts/onboard-tenant.sh` o flujo invitaciones existente para `peskids`.

## Criterios de hecho Sprint 02

- [ ] Migración `0053` aplicada en Supabase prod/staging
- [ ] POST lead → 201 + fila en `peskids_leads`
- [ ] POST feedback rating 2 → `needs_attention: true`
- [ ] Owner ve summary con JWT portal
- [ ] VPS n8n/uptime healthy ([OPS-RUNBOOK.md](./OPS-RUNBOOK.md))

## Siguiente (extracción)

Cuando lo anterior esté estable 2–4 semanas → [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md).

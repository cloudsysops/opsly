---
status: active
owner: product
last_review: 2026-05-21
tenant_slug: peskids
---

# Peskids Sprint 02 — MVP que corre (Opsly)

Sprint 01 = diseño. **Sprint 02 = runtime mínimo** en Opsly antes de extraer a `peskids-platform`.

**Despliegue producción API:** [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md) (smoke PASS 2026-05-21).

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
doppler run --project ops-intcloudsysops --config prd -- npx supabase db push
# Dry-run: npx supabase db push --dry-run
```

Verificar tablas: `platform.peskids_leads`, `platform.peskids_feedback`.

**Prod 2026-05-21:** migración al día (`Remote database is up to date`).

### 2. Desplegar API

**Flujo canónico (cuando CI Deploy esté verde):**

Merge en `main` → workflow **Deploy** → en VPS:

```bash
cd /opt/opsly/infra
docker compose -f docker-compose.platform.yml --env-file /opt/opsly/.env pull app
docker compose -f docker-compose.platform.yml --env-file /opt/opsly/.env up -d --no-deps --force-recreate app
```

**Flujo alternativo (CI rojo / imagen GHCR sin rutas Peskids):** ver [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md) — build `intcloudsysops-api:peskids-latest` en VPS.

### 3. Smoke

```bash
API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh
```

Esperar `HTTP 201` en POST lead (tenant `peskids` `active` en `platform.tenants`).

### 4. Formularios

- `https://api.op-sly.com/peskids/lead-form.html`
- `https://api.op-sly.com/peskids/feedback-form.html`
- Owner dashboard vía portal: `GET /api/portal/tenant/peskids/peskids/summary` con Bearer JWT

### 5. Invitar owner al portal (si falta)

`./scripts/onboard-tenant.sh` o flujo invitaciones existente para `peskids` (owner: `sierrasantiago90@gmail.com`).

## Criterios de hecho Sprint 02

- [x] Migración `0053` aplicada en Supabase prod (2026-05-21)
- [x] POST lead → 201 + fila en `peskids_leads` (smoke prod)
- [x] POST feedback rating 2 → `needs_attention: true` (smoke prod)
- [ ] Owner ve summary con JWT portal (pendiente demo owner)
- [x] VPS n8n/uptime healthy ([OPS-RUNBOOK.md](./OPS-RUNBOOK.md))

## Bloqueantes conocidos (post-deploy)

| Bloqueante | Mitigación |
|------------|------------|
| Deploy CI falla (`npm ci` / lockfile) | Build API en VPS; arreglar lockfile en `main` |
| `ghcr.io/.../api:latest` sin rutas Peskids | Usar `APP_IMAGE=intcloudsysops-api:peskids-latest` hasta nuevo push CI |
| PAT `GHCR_TOKEN` en Doppler sin `read:packages` | Rotar PAT o usar token del job Deploy; ver [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md) |

## Siguiente (extracción)

Cuando lo anterior esté estable 2–4 semanas → [FUTURE-REPO-SEED.md](./FUTURE-REPO-SEED.md).

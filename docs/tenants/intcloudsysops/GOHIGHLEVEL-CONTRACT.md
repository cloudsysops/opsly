---
status: draft
owner: operations
last_review: 2026-06-04
tenant_slug: intcloudsysops
---

# Intcloudsysops — GoHighLevel Contract (Agency)

> **Estado 2026-06-09:** GHL es **compatibilidad temporal** para ICSO. Camino principal: [`TWENTY-CRM.md`](TWENTY-CRM.md) (`INTCLOUDSYSOPS_GHL_ENABLED=false` por defecto). No usar GHL para nuevas integraciones de captura web.

Capa comercial de **Intcloudsysops LLC** (agencia). Usa credenciales `GOHIGHLEVEL_*` — distintas de la subcuenta Peskids (`GOHIGHLEVEL_PESKIDS_*`).

## Private Integration (Doppler `prd`)

| Variable | Valor / notas |
|----------|----------------|
| `GOHIGHLEVEL_API_KEY` | Token integración agencia |
| `GOHIGHLEVEL_API_URL` | `https://services.leadconnectorhq.com` |
| `GOHIGHLEVEL_API_VERSION` | `2021-07-28` |
| `GOHIGHLEVEL_LOCATION_ID` | `qD7Z9jt3owk0LMtKElow` |

**Validación:**

```bash
./scripts/validate-ghl-config.sh --tenant intcloudsysops
# alias: --tenant agency
```

## Scopes recomendados (Private Integration agencia)

- `locations.readonly`
- `locations/tags.readonly` + `locations/tags.write`
- `locations/customFields.readonly` + `locations/customFields.write`
- `forms.readonly` + `forms.write` (opcional)
- `opportunities.readonly` (validar pipeline)
- `calendars.readonly` + `calendars.write` + `calendars/events.write` (Discovery Call)
- `contacts.readonly` + `contacts.write`

## Provision API

Manifest: `docs/examples/intake/intcloudsysops.json`

```bash
./scripts/ghl-provision-intcloudsysops.sh              # dry-run
./scripts/ghl-provision-intcloudsysops.sh --execute    # aplicar en GHL

npm run ghl-provision -- \
  --manifest docs/examples/intake/intcloudsysops.json \
  --tenant intcloudsysops \
  --dry-run
```

Reportes: `docs/artifacts/provisioning/provision-report-intcloudsysops.{json,md}`

**Estado API (2026-06-04):** 13 `already_exists` (tags, custom fields, calendario Discovery Call). **Pendiente: 5 manual UI** (checklist abajo).

## Manual UI — checklist agencia (5 ítems)

**Runbook:** [`GHL-AGENCY-MANUAL-UI-CHECKLIST.md`](GHL-AGENCY-MANUAL-UI-CHECKLIST.md)

```bash
./scripts/ghl-agency-manual-checklist.sh   # URLs + copy en terminal
npm run ghl:agency-manual-checklist
```

| # | Ítem | Nombre exacto en GHL |
|---|------|----------------------|
| 1 | Pipeline | Opsly Agency Sales (7 stages) |
| 2 | Form | Opsly Agency Lead Capture |
| 3 | Email | Opsly — Welcome Lead |
| 4 | Email | Opsly — Discovery Call Confirmation |
| 5 | SMS | Opsly — Discovery Reminder |

Specs: `docs/examples/intake/intcloudsysops.json`. Tras UI: `./scripts/ghl-provision-intcloudsysops.sh --execute` (pipeline debe pasar a `already_exists`).

### Criterio de hecho (stack consultoría)

- [ ] 5 ítems manual UI completados
- [ ] Re-provision agencia sin `blocked`
- [ ] Smoke E2E Peskids (siguiente paso)
- [ ] Patrón replicable para nuevos blueprints

## Token / scopes — rotación y auto-provision

Si el token agencia devuelve HTTP 401 en tags, regenerar en GHL y actualizar Doppler:

```bash
doppler secrets set GOHIGHLEVEL_API_KEY --project ops-intcloudsysops --config prd
./scripts/ghl-scope-smoke.sh --tenant intcloudsysops
./scripts/ghl-provision-intcloudsysops.sh --execute
```

**Auto-provision mientras actualizas token:**

```bash
npm run ghl:agency-auto-provision
# poll cada 2 min; al detectar scopes OK ejecuta --execute solo
```

## UI-only (post-MVP)

- Workflows GHL (Lead Intake, follow-ups) — **legacy**; reemplazar con n8n + Supabase
- Plantillas email/SMS
- Ajustes finos de formularios / automations

## Apagado GHL (checklist operativo)

Ver checklist completo en [`TWENTY-CRM.md`](TWENTY-CRM.md#checklist-de-apagado-ghl-icso).

Scripts que siguen siendo legacy (no borrar hasta cero consumidores):

- `./scripts/ghl-provision-intcloudsysops.sh`
- `./scripts/icso-ghl-status.sh`
- `./scripts/ghl-configure-pipelines.sh --customer icso`

Código legacy en app: `apps/icso/lib/ghl-setup.ts`, `apps/icso/lib/gohighlevel-lead-sync.ts` (solo con `INTCLOUDSYSOPS_GHL_ENABLED=true`).

Opsly CRM n8n pack: `docs/n8n-workflows/crm/README.md` (tenant `intcloudsysops` en VPS).

---
status: deprecated
owner: operations
last_review: 2026-06-09
tenant_slug: peskids
---

> **Deprecado (2026-06-09):** Peskids migra a **Twenty CRM** (open source, self-hosted).  
> Runbook activo: [`TWENTY-CRM.md`](TWENTY-CRM.md). GHL sidecar desactivado por defecto (`PESKIDS_GHL_ENABLED=false`).

# Peskids GoHighLevel Contract

Punto de entrada mínimo para el primer slice comercial:

`lead enters -> gets registered -> receives follow-up -> appears in Opsly Executive`

## Private Integration (Opsly / Doppler `prd`)

**Agencia (Intcloudsysops LLC)** — no tocar para Peskids:

| Variable | Valor / notas |
|----------|----------------|
| `GOHIGHLEVEL_API_KEY` | Token integración agencia |
| `GOHIGHLEVEL_LOCATION_ID` | `qD7Z9jt3owk0LMtKElow` |

**Peskids — Academia de natación** (subcuenta dedicada):

| Variable | Valor / notas |
|----------|----------------|
| `GOHIGHLEVEL_PESKIDS_API_KEY` | Private Integration Token (solo Doppler) |
| `GOHIGHLEVEL_PESKIDS_API_URL` | `https://services.leadconnectorhq.com` |
| `GOHIGHLEVEL_PESKIDS_API_VERSION` | `2021-07-28` |
| `GOHIGHLEVEL_PESKIDS_LOCATION_ID` | `KJ5LawrOOe3hIerqtMRu` |
| `GOHIGHLEVEL_PESKIDS_PRIVATE_INTEGRATION_ID` | `6a1e407730bb8f804a59d247` |

**Consola GHL (Peskids):** [Private Integration](https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/settings/private-integrations/6a1e407730bb8f804a59d247)

MCP / `getGoHighLevelService()` registran `tenantId: peskids` con el prefijo `GOHIGHLEVEL_PESKIDS_*`.

**Scopes mínimos recomendados en la integración:**

- `locations.readonly` (validación / descubrir location)
- `locations/tags.readonly` + `locations/tags.write` (provision tags)
- `locations/customFields.readonly` + `locations/customFields.write` (provision fields)
- `forms.readonly` + `forms.write` (provision forms — opcional)
- `opportunities.readonly` (validar pipelines)
- `calendars.readonly` + `calendars.write` + `calendars/events.write` (Trial Class calendar + schedule)
- `contacts.readonly` + `contacts.write` (MCP / sync CRM)
- `conversations.write` solo si usarás envío desde Opsly (evitar auto-send sin approval; ver `WHATSAPP-CHANNEL.md`)

**Provision API (tags, fields, calendars):**

```bash
./scripts/ghl-provision-peskids.sh              # dry-run (default)
./scripts/ghl-provision-peskids.sh --execute    # apply after scopes OK
npm run ghl-provision -- --manifest docs/examples/intake/peskids.json --tenant peskids --dry-run
```

Agencia Intcloudsysops: [`docs/tenants/intcloudsysops/GOHIGHLEVEL-CONTRACT.md`](../intcloudsysops/GOHIGHLEVEL-CONTRACT.md) — `./scripts/ghl-provision-intcloudsysops.sh`

Reportes: `docs/artifacts/provisioning/provision-report-peskids.{json,md}`

**Estado execute (2026-06-04):** `--execute` aplicó **11** recursos (tags, custom fields, calendarios Trial Class + Assessment). Quedan **5** `manual_required` (plantillas email/SMS y form en UI GHL).

**Validación local (no imprime el token):**

```bash
./scripts/validate-ghl-config.sh --tenant peskids
./scripts/validate-ghl-config.sh          # agencia Intcloudsysops
```

Tras cambiar secretos en Doppler, refrescar API en VPS: `./scripts/vps-refresh-api-env.sh`

## Webhook (legacy)

**Endpoint app Peskids (self-hosted):**

`POST /api/webhooks/gohighlevel`

Requiere `PESKIDS_GHL_ENABLED=true`. Con el flag en `false` (default), responde `200` con `{ status: "disabled" }` sin procesar eventos.

**Endpoint histórico Opsly API (documentación anterior):**

`POST /api/public/tenants/peskids/webhooks/gohighlevel/leads`

**Required payload**

```json
{
  "event_id": "evt_123",
  "event_type": "lead.created",
  "tenant_slug": "peskids",
  "source": "gohighlevel",
  "lead_id": "ghl_contact_123",
  "pipeline_stage": "Trial Class",
  "occurred_at": "2026-06-01T10:00:00.000Z",
  "lead": {
    "parent_name": "Maria Rodriguez",
    "phone": "+573001112233",
    "email": "maria@example.com",
    "child_name": "Mateo",
    "age": 8,
    "interest": "Trial class"
  },
  "automation": {
    "welcome_message": true,
    "reminder": true,
    "trial_class_invitation": true
  }
}
```

## Pipeline stages

- `New Lead`
- `Contacted`
- `Trial Class`
- `Enrolled`
- `Active Student`
- `Renewal`

## Persistence

The webhook writes to `platform.peskids_leads` with idempotency on `(tenant_slug, lead_id)`.

Minimum tracked fields:

- `lead_id`
- `source`
- `stage`
- `created_at`

Additional traceability fields:

- `parent_name`
- `child_name`
- `age`
- `interest`
- `event_id`
- `automation_ready`

## Automation handoff

The API emits a compact n8n envelope with the three starter actions only:

- `welcome_message`
- `reminder`
- `trial_class_invitation`

No WhatsApp, email, or calendar engine lives in Opsly. n8n remains the operational executor.

**n8n webhook:** `POST {N8N_WEBHOOK_BASE_URL}/peskids-lead-intake` — see `.n8n/1-workflows/peskids/peskids-lead-intake.json` and `./scripts/smoke-peskids-n8n-lead-intake.sh`.

## Executive read model

`GET /api/admin/peskids/peskids/executive`

Metrics exposed:

- New leads
- Clases prueba
- Inscripciones
- Alumnos activos
- Conversión
- Fuentes de captación
- Revenue
- Pending payments
- Alerts

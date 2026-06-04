---
status: draft
owner: operations
last_review: 2026-06-04
tenant_slug: intcloudsysops
---

# Intcloudsysops — GoHighLevel Contract (Agency)

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

**Estado (2026-06-04):** Peskids completo. Agencia: token Doppler (`GOHIGHLEVEL_API_KEY`, integration `6a1e2b7830bb8f3a824f783a`) devuelve HTTP 401 en tags — **regenerar token** en GHL y actualizar Doppler.

**Auto-provision mientras actualizas token:**

```bash
npm run ghl:agency-auto-provision
# poll cada 2 min; al detectar scopes OK ejecuta --execute solo
```

**Rotación token:**

```bash
doppler secrets set GOHIGHLEVEL_API_KEY --project ops-intcloudsysops --config prd
./scripts/ghl-scope-smoke.sh --tenant intcloudsysops
./scripts/ghl-provision-intcloudsysops.sh --execute
```

## UI-only (no API)

- Workflows GHL (Lead Intake, follow-ups)
- Plantillas email/SMS
- Ajustes finos de formularios

Opsly CRM n8n pack: `docs/n8n-workflows/crm/README.md` (tenant `intcloudsysops` en VPS).

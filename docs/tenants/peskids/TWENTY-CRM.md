---
status: active
owner: peskids
last_review: 2026-06-09
tenant: peskids
---

# Peskids — Twenty CRM (reemplazo de GoHighLevel)

## Objetivo

Migrar el CRM comercial de **GoHighLevel (SaaS de pago)** a **Twenty CRM** (open source, self-hosted en el VPS Opsly), manteniendo:

- Captura de leads en Supabase (`platform.peskids_leads`) como fuente operativa
- Automatización vía **n8n CRM Starter Pack** + **Resend**
- Operaciones (clases, familias, docentes) en la app Peskids

## Estado en repo (2026-06-09)

| Componente | Estado |
|-----------|--------|
| Cliente `@intcloudsysops/services/twenty` | Implementado en `lib/services/twenty/` |
| Sync al crear lead (`POST /api/leads`) | `syncLeadToCrm()` → Twenty si está configurado |
| GoHighLevel sidecar | **Desactivado por defecto** — requiere `PESKIDS_GHL_ENABLED=true` |
| Migración DB | `0082_peskids_twenty_crm_ids.sql` (`twenty_person_id`, `twenty_opportunity_id`) |
| Compose VPS | `infra/docker-compose.twenty.yml` |
| Instancia prod | **Pendiente** — no hay contenedor Twenty en VPS (verificado 2026-06-09) |

## Arquitectura

```mermaid
flowchart LR
  Web[Peskids landing form] --> Leads[POST /api/leads]
  Leads --> Twenty[Twenty REST API]
  Leads --> API[Opsly API public lead]
  API --> DB[(platform.peskids_leads)]
  n8n[n8n CRM workflows] --> Resend[Email welcome]
  n8n --> DB
  Admin[Peskids admin] --> DB
```

## Despliegue Twenty en VPS

### 1. Secretos Doppler (`ops-intcloudsysops/prd`)

```bash
# URL pública (Traefik)
doppler secrets set TWENTY_SERVER_URL="https://crm-peskids.op-sly.com" --project ops-intcloudsysops --config prd

# Generar (no reutilizar en chat):
openssl rand -base64 32   # TWENTY_APP_SECRET
openssl rand -base64 32   # TWENTY_ENCRYPTION_KEY
openssl rand -base64 24   # TWENTY_PG_PASSWORD

doppler secrets set TWENTY_APP_SECRET="..." TWENTY_ENCRYPTION_KEY="..." TWENTY_PG_PASSWORD="..." \
  --project ops-intcloudsysops --config prd
```

Regenerar `.env` en VPS (`./scripts/vps-bootstrap.sh`) y levantar:

```bash
./scripts/tenants/setup-twenty-peskids.sh
```

### 2. DNS

Añadir registro `crm-peskids.op-sly.com` → Cloudflare proxy ON (misma IP VPS).

### 3. API key Twenty → Peskids

Tras crear workspace admin en Twenty:

```bash
doppler secrets set \
  TWENTY_API_URL="https://crm-peskids.op-sly.com" \
  TWENTY_API_KEY="..." \
  PESKIDS_TWENTY_ENABLED="true" \
  PESKIDS_GHL_ENABLED="false" \
  --project ops-intcloudsysops --config prd
```

Redeploy contenedor `peskids` + `app` (API).

### 4. Migración Supabase

```bash
npx supabase db push   # aplica 0082_peskids_twenty_crm_ids.sql
```

## Variables de entorno (app Peskids)

| Variable | Descripción |
|----------|-------------|
| `TWENTY_API_URL` | Base URL self-hosted (ej. `https://crm-peskids.op-sly.com`) |
| `TWENTY_API_KEY` | Bearer token desde Twenty Settings |
| `PESKIDS_TWENTY_ENABLED` | Default `true` si hay URL+key; `false` para pausar sync |
| `PESKIDS_GHL_ENABLED` | Default `false`; `true` solo durante dual-write temporal |
| `TWENTY_DEFAULT_OPPORTUNITY_STAGE` | Stage inicial (default `NEW`) |

## Pipeline sugerido (Twenty)

| Supabase `status` | Twenty opportunity stage |
|-------------------|--------------------------|
| `new` | NEW |
| `contacted` | SCREENING |
| `trial` | MEETING |
| `enrolled` | CUSTOMER |
| `active` | CUSTOMER |
| `renewal` | CUSTOMER |
| `archived` | LOST |

Ajustar stages según el workspace creado en Twenty (Settings → Objects → Opportunities).

## Import desde GoHighLevel

1. Exportar contactos CSV desde GHL antes de cancelar suscripción
2. Twenty → Import → People
3. Crear oportunidades manualmente o vía script (fase 2)

## n8n CRM pack

```bash
./scripts/install-crm-workflows.sh --tenant peskids --dry-run
./scripts/install-crm-workflows.sh --tenant peskids
```

Ver `.n8n/1-workflows/crm/` y `docs/n8n-workflows/crm/README.md`.

## Deprecación GHL

- Contrato legacy: [`GOHIGHLEVEL-CONTRACT.md`](GOHIGHLEVEL-CONTRACT.md) — no usar para nuevos flujos
- Webhooks GHL pueden permanecer hasta completar import; desactivar cuando Twenty esté estable

## Verificación

```bash
./scripts/tenants/verify-twenty-stack.sh --probe-api
TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids
```

Tests unitarios:

```bash
npm run test --workspace=@intcloudsysops/services -- twenty
npm run test --workspace=@intcloudsysops/peskids -- leads
```

## Enlaces

- Twenty docs: https://docs.twenty.com/developers/extend/api
- WhatsApp sin GHL: [`WHATSAPP-CHANNEL.md`](WHATSAPP-CHANNEL.md)
- Release 3 agenda: smoke `scripts/peskids/release3-agenda-smoke.sh`

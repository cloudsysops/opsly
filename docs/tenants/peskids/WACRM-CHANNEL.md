---
status: draft
owner: peskids
last_review: 2026-06-09
---

# Peskids — canal wacrm (híbrido con Twenty)

**Estado:** opcional, flag `WACRM_PESKIDS_ENABLED=false` por defecto.

## Qué usar

| Necesidad | Sistema |
|-----------|---------|
| Responder WhatsApp, inbox, asignación | wacrm (`https://wa-peskids.op-sly.com`) |
| Pipeline matrícula, oportunidades | Twenty |
| Leads operativos, auditoría | Supabase `platform.leads` |
| Automatización | n8n `n8n_peskids` |

## No duplicar

- No usar el pipeline Kanban de wacrm en producción.
- No sustituir Twenty ni Jelou sin ADR; un solo proveedor WA primario activo.

## Activación

```bash
# Tras Twenty estable
./scripts/tenants/bootstrap-wacrm.sh --slug peskids --dry-run
./scripts/tenants/doppler-configure-wacrm-prd.sh --tenant peskids --execute  # flags OFF
# Meta + sidecar VPS → smoke → luego WACRM_PESKIDS_ENABLED=true
./scripts/tenants/wacrm-smoke.sh --slug peskids
```

## Variables Doppler

- `WACRM_PESKIDS_ENABLED`
- `WACRM_PESKIDS_SERVER_URL`
- `WACRM_PESKIDS_WEBHOOK_SECRET`
- `WACRM_PESKIDS_SYNC_TWENTY` (`notes-only` recomendado)

## Relacionado

- Contrato: `docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md`
- WhatsApp general: `docs/tenants/peskids/WHATSAPP-CHANNEL.md`
- Twenty: `docs/tenants/peskids/TWENTY-CRM.md`

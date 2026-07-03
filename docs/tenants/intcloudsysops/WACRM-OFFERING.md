---
status: draft
owner: intcloudsysops
last_review: 2026-06-09
---

# ICSO — oferta wacrm + Twenty (agency tenant)

ICSO vende automatización WhatsApp + CRM. En el tenant `intcloudsysops` el stack piloto es:

- **Marketing / leads:** `apps/icso` → API Opsly → Twenty (post `feat/icso-twenty-crm`)
- **Inbox WA (opcional):** wacrm sidecar `wa-intcloudsysops.op-sly.com`
- **Control plane:** Mission Control + `config/tenants/intcloudsysops.json`

## Flags

| Variable | Uso |
|----------|-----|
| `WACRM_INTCLOUDSYSOPS_ENABLED` | Activa enlace inbox |
| `WACRM_INTCLOUDSYSOPS_SERVER_URL` | URL pública sidecar |
| `INTCLOUDSYSOPS_TWENTY_ENABLED` | CRM (Twenty) |
| `INTCLOUDSYSOPS_GHL_ENABLED` | Legacy OFF |

## Bootstrap

```bash
./scripts/provisioning/bootstrap-tenant.sh --launch clients/intcloudsysops.launch.json --dry-run
./scripts/tenants/bootstrap-wacrm.sh --slug intcloudsysops --dry-run
```

## Cliente final

Clonar vertical + launch; activar wacrm solo si el cliente contrata inbox WA:

```bash
./scripts/provisioning/clone-vertical-launch.sh --vertical ventas --slug <cliente> --dry-run
```

Contrato híbrido: `docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md`

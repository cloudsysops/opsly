---
status: canon
owner: intcloudsysops
last_review: 2026-06-09
---

# ICSO — paquete reusable WhatsApp-first

Paquete para **vender e implantar** en clientes nuevos sin fork por tenant: mismo contrato que Peskids, activación por flags.

## Contenido del paquete

| Pieza | Ubicación |
|-------|-----------|
| Vertical blueprint | `config/vertical-blueprints/whatsapp-first.json` |
| Tenant pattern | `config/patterns/tenant/whatsapp-first-stack.json` |
| Opsly module pattern | `config/patterns/opsly/wacrm-channel.json` |
| Contrato híbrido | `docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md` |
| Lib flags | `lib/wacrm-channel` |
| n8n plantilla | `docs/examples/n8n/wacrm-inbound-twenty-note.json` |
| Compose ejemplo | `infra/templates/wacrm/docker-compose.wacrm-tenant.yml.example` |

## Onboarding cliente nuevo (ICSO)

```bash
# 1. Clonar vertical WhatsApp-first
./scripts/provisioning/clone-vertical-launch.sh \
  --vertical whatsapp-first \
  --slug <cliente> \
  --business-name "Cliente SA" \
  --domain <cliente>.op-sly.com \
  --email owner@cliente.com \
  --dry-run

# 2. Plan + bootstrap
npm run client:plan -- --tenant-slug <cliente>
./scripts/provisioning/bootstrap-tenant.sh \
  --launch clients/<cliente>.launch.json --dry-run

# 3. Twenty + wacrm (tras contrato firmado)
./scripts/tenants/bootstrap-twenty.sh --tenant <flag>   # peskids|icso mapping
./scripts/tenants/bootstrap-wacrm.sh --slug <cliente>
```

## Tenant piloto ICSO (agency)

- Launch: `clients/intcloudsysops.launch.json` (`vertical: ventas` hoy; puede añadir `whatsapp-first-stack` en `pattern_ids`)
- Marketing: `apps/icso` → Twenty post-merge `feat/icso-twenty-crm`
- Oferta comercial: `docs/tenants/intcloudsysops/WACRM-OFFERING.md`

## Qué vende ICSO vs qué es Opsly core

| ICSO (cliente) | Opsly core (no duplicar) |
|----------------|--------------------------|
| Número Meta del cliente | Patrones + scripts |
| Sidecar wacrm por tenant | Twenty stack compartido o por tenant |
| Workflows n8n customizados | `install-crm-workflows.sh` base |
| Dominio `wa-<slug>.op-sly.com` | Traefik + Doppler |

## Flags por slug

Convención: `WACRM_{SLUG_UPPER}_*` (slug `intcloudsysops` → `WACRM_INTCLOUDSYSOPS_*`).

## No incluido (evitar segunda plataforma)

- Fork de wacrm dentro del monorepo
- Pipeline comercial en wacrm
- Segundo CRM activo sin `TWENTY_*_ENABLED`
- DB wacrm replicada en Supabase `platform`

## Referencia piloto

Peskids cutover detallado: `docs/tenants/peskids/WACRM-TWENTY-CUTOVER.md`

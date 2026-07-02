---
status: active
owner: intcloudsysops
last_review: 2026-07-02
tenant: intcloudsysops
---

# ICSO — Twenty CRM (migración desde GoHighLevel)

## Estado en `peskids-review` (2026-07-02)

| Área | Rama actual | Rama con código Twenty |
|------|-------------|-------------------------|
| `POST /api/leads` | **GHL** (`GoHighLevelClient`) | `feat/icso-twenty-crm` → Supabase + Twenty |
| Flags Doppler | Preparables vía scripts | `INTCLOUDSYSOPS_*` en `lib/services/twenty` |
| Migración DB | `0081` schema | `0083` external ids en `feat/icso-twenty-crm` |
| Smoke | `scripts/icso/lead-capture-smoke.sh` | `TWENTY_SMOKE_EXPECT_IDS` tras merge |

**No reimplementar aquí:** mergear PR [#661](https://github.com/cloudsysops/opsly/pull/661) (`feat/icso-twenty-crm`) cuando Peskids Twenty esté validado en prod.

## Scripts compartidos (ya en repo)

```bash
# Pre-config Doppler (GHL off; Twenty on cuando exista API key ICSO)
./scripts/tenants/doppler-configure-twenty-prd.sh --tenant icso --dry-run

# Infra Twenty (misma instancia VPS que Peskids o subdominio crm-intcloudsysops)
./scripts/tenants/generate-twenty-secrets.sh --execute --tenant icso

# Smoke actual (GHL)
./scripts/tenants/twenty-crm-smoke.sh --tenant icso --dry-run

# Tras merge Twenty + API key
echo "<key>" | ./scripts/tenants/twenty-apply-api-key.sh --tenant icso \
  --api-url https://crm-intcloudsysops.op-sly.com
TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant icso
```

## Legacy GHL (temporal)

- Código: `apps/icso/lib/ghl-setup.ts`, `@intcloudsysops/services/gohighlevel`
- Scripts: `ghl-provision-intcloudsysops.sh`, `icso-ghl-status.sh` (auditoría)
- Contrato: [`GOHIGHLEVEL-CONTRACT.md`](GOHIGHLEVEL-CONTRACT.md)
- Apagado: `INTCLOUDSYSOPS_GHL_ENABLED=false` en Doppler (default tras `doppler-configure-twenty-prd.sh`)

## Cutover

Seguir [`docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md`](../../blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md) sección **Parallel: ICSO**.

## Enlaces

- Peskids runbook (patrón): [`../peskids/TWENTY-CRM.md`](../peskids/TWENTY-CRM.md)
- PR ICSO Twenty: `feat/icso-twenty-crm`

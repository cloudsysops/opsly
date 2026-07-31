# Academy Blueprint (machine pack)

Reusable Academy vertical for Opsly/ICSO. **Peskids** is the pilot tenant; **ICSO** is the platform that operates tenants — not a customer tenant.

## Layout

```text
blueprints/academy/
  blueprint.yaml
  tenant.schema.json
  modules/*.yaml
  seed/
  workflows/
  smoke/
  README.md
```

Human-facing contract and agent baseline: `docs/blueprints/academy/`.

## Defaults (safe)

| Policy | Value |
|--------|-------|
| GHL | disabled / legacy archived |
| WhatsApp outbound | approval_first |
| Payments | disabled |
| WACRM | optional, off until authorized |
| Franchise model | inside `tenant_slug` (no tenant per sede) |

## Validate

```bash
npm run validate:academy-blueprint
bash blueprints/academy/smoke/tenant-smoke.sh
```

## Next Academy tenant

Use the generator instead of hand-copying files — it validates against
`tenant.schema.json`/`config/tenants/schema.tenant-config.json`, picks a free
`internal_port`, and prints the exact remaining manual/infra steps (sourced
from `config/tenant-modules-catalog.json`) with a total time estimate:

```bash
# Preview only (writes nothing):
npm run blueprint:new-academy-tenant -- \
  --slug swim-cali --display-name "Swim Cali" \
  --domain https://www.swimcali.com --owner-email owner@swimcali.com \
  --primary-franchise-slug swim-cali-principal

# Add --write to actually create the files:
npm run blueprint:new-academy-tenant -- \
  --slug swim-cali --display-name "Swim Cali" \
  --domain https://www.swimcali.com --owner-email owner@swimcali.com \
  --primary-franchise-slug swim-cali-principal --write
```

This writes `config/blueprints/academy/instances/<slug>.json`,
`config/tenants/<slug>.json`, and templated seed files under
`config/tenants/<slug>/seed/`. It does **not** touch a live database,
deploy anything, or enable `blueprint.yaml`'s `provisioning` flag (that
stays `false` on purpose — see `scripts/ci/validate-academy-blueprint.mjs`).
Keep `owner_platform: icso` and `business_type: academy` — do not fork
Peskids for shared modules; apply the franchise seed only if the new
tenant needs multi-sede.

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

1. Copy `seed/tenant-settings.json` and set a new `slug`.
2. Keep `owner_platform: icso` and `business_type: academy`.
3. Provision via existing Opsly onboard scripts — do not fork Peskids for shared modules.
4. Apply franchise seed only if the vertical needs multi-sede.

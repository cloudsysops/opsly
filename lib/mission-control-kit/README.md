# @intcloudsysops/mission-control-kit

Contratos reutilizables para **Mission Control** (agency ICSO, tenants futuros, alineable a Moon).

## Install (workspace)

```json
"@intcloudsysops/mission-control-kit": "*"
```

## Quick start

```ts
import {
  createIcsoAgencyProfile,
  createTenantMissionControlProfile,
  sanitizeEntityCard,
  omitMrrUntilCommercialSource,
} from '@intcloudsysops/mission-control-kit';

const icso = createIcsoAgencyProfile();
const client = createTenantMissionControlProfile({
  tenantSlug: 'acme',
  productName: 'Acme Mission Control',
  shortName: 'Acme MC',
  basePath: '/admin',
});
```

## What this is / is not

| Is | Is not |
|----|--------|
| Nav + brand + confidence labels + sanitize | Second Opsly Moon / second orchestrator |
| Profile Zod schema for `config/mission-control/profiles` | Domain CRM schema per vertical |
| Presets agency/tenant | Hardcoded Peskids leads |

Docs: `docs/00-architecture/MISSION-CONTROL-KIT.md`

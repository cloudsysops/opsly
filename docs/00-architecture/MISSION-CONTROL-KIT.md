---
status: canon
owner: platform
last_review: 2026-08-07
type: architecture
tags:
  - opsly/mission-control
  - opsly/modularity
  - opsly/icso
---

# Mission Control Kit

**Módulo:** `@intcloudsysops/mission-control-kit` (`lib/mission-control-kit`)
**Contrato:** [MODULARITY-CONTRACT.md](../01-development/MODULARITY-CONTRACT.md) / ADR-044

## Tres Mission Controls (no confundir)

| Producto | App | Mode kit | Ámbito |
| --- | --- | --- | --- |
| **Opsly Moon** | `apps/admin` | `platform` | Control plane multi-tenant IntCloudSysOps |
| **ICSO Mission Control** | `apps/icso` `/mission-control` | `agency` | Pipeline/catálogo agency IntCloud SysOps |
| **Tenant Mission Control** | `apps/<slug>` (p. ej. Peskids `/admin`) | `tenant` | Ops del cliente final |

El kit **no** es un segundo orchestrator ni un segundo Moon. Solo contratos: profile, nav, health labels, sanitize PII, presets.

## Replicar para un cliente nuevo

1. Copiar `config/mission-control/profiles/_template.tenant.json` → `profiles/<slug>.json`.
2. En código:

```ts
import { createTenantMissionControlProfile } from '@intcloudsysops/mission-control-kit';

const profile = createTenantMissionControlProfile({
  tenantSlug: 'acme',
  productName: 'Acme Mission Control',
  shortName: 'Acme MC',
  basePath: '/admin',
  publicPanelUrl: 'https://acme.example.com',
});
```

3. Montar shell UI en `apps/<slug>` (thin) — dominio (leads, clases, etc.) **solo** en el tenant.
4. Activar por `tenant_slug` / env; no fork permanente del kit.
5. Runbook: [MISSION-CONTROL-TENANT-ROLLOUT.md](../runbooks/MISSION-CONTROL-TENANT-ROLLOUT.md)

## ICSO

- Rutas: `/mission-control/*`
- Profile: `config/mission-control/profiles/icso.json`
- Gate opcional: `ICSO_MC_ACCESS_TOKEN` (cookie `icso_mc_token` o header `x-icso-mc-token`)
- Datos: deals Supabase `intcloudsysops_*` + commercial catalog; **sin** Peskids PII; **sin** MRR ficticio

## Relación con Moon (#922)

Moon puede adoptar el mismo kit (`mode: platform`) en un PR posterior; hoy Moon y el kit conviven sin bloquearse.

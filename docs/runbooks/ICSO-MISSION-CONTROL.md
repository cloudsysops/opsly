---
status: canon
owner: operations
last_review: 2026-08-07
type: runbook
tags:
  - opsly/icso
  - opsly/mission-control
---

# ICSO Mission Control — Operations

## URL

`/mission-control` en el sitio ICSO (dev `:3015`).

## Gate

```bash
# Doppler / env app icso
ICSO_MC_ACCESS_TOKEN=<random>
```

Cookie: `icso_mc_token=<token>`  
Header: `x-icso-mc-token: <token>`

Sin token en env → abierto (solo dev); UI muestra warning.

## Datos

| Vista | Fuente |
| --- | --- |
| Pipeline | `intcloudsysops_deals` (si Supabase) |
| Catálogo / módulos | `content/commercial-catalog.json` |
| Integraciones | flags env (nombres, no secretos) |

## Separación

- No Opsly Moon (`apps/admin`)
- No Peskids Mission Control
- No deploy desde UI

## Rollback

Quitar rutas `apps/icso/app/mission-control` o feature-disable vía reverse proxy; kit permanece usable por otros tenants.

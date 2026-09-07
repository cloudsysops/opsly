---
status: canon
owner: operations
last_review: 2026-09-07
---

# Ventana de cambios en producción (noche)

Peskids y el control plane Opsly están **operativos de día**. La ventana **no se ensancha** para poner CI verde.

## Regla (tras desacoplar merge de prod)

| Acción | Cuándo |
|--------|--------|
| **Merge a `main`** (CI verde) | Cualquier hora — **no** despliega producción |
| **Deploy staging** (`/opt/opsly-staging`) | Automático en push a `main` |
| **Promote production** (VPS `/opt/opsly`, Peskids, Panini) | Solo **ventana nocturna** `America/Bogota` **22:00–06:00** |
| Docs, skills, reglas Cursor | De día |
| Emergencia prod | Label **`hotfix-prod`** + `force_daytime` en promote |

## Ventana nocturna (solo promote)

- Zona: **`America/Bogota`**
- Permitido: **22:00 inclusive → 06:00 exclusive**
- Cron de GitHub es **UTC**. Delay del scheduler no autoriza promote; el run **schedule** fuera de ventana hace **skip (exit 0)**.

## Paths

El check `production-change-window` en PRs ya **no bloquea merge diurno** de `apps/`/`infra/`: merge ≠ prod. El gate de promote sigue fail-closed.

## Labels

| Label | Uso |
|-------|-----|
| `night-merge` | Cola **MERGE_TO_MAIN** (crons + catch-up diurno si GitHub retrasó el de 01:00) |
| `safe-daytime` | Legacy; ya no es obligatorio para merge de runtime |
| `hotfix-prod` | Emergencia de promote diurno |

## Comandos

```bash
node scripts/ci/check-production-change-window.mjs --check-now
node scripts/ci/check-production-change-window.mjs --mode promote --event workflow_dispatch
node scripts/ci/check-production-change-window.mjs --mode pr --paths apps/peskids/app/page.tsx
```

Doc de pipeline: [`RELEASE-AUTOMATION.md`](RELEASE-AUTOMATION.md) · cola: [`NIGHT-MERGE.md`](NIGHT-MERGE.md)

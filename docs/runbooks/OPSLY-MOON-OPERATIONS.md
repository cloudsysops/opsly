---
status: canon
owner: operations
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
---

# Opsly Moon — Operations

## Arranque local (sin VPS)

```bash
cd apps/admin
npm run type-check
# opcional: npm run dev -p 3001  (no en paralelo con otros builds pesados)
```

Abrir `http://localhost:3001/moon`.

## Validación mínima

```bash
npx tsx --test apps/admin/lib/moon/__tests__/moon-unit.test.ts
npm run type-check --workspace=@intcloudsysops/admin
npm run validate-structure
```

## Fuentes

Ver `docs/00-architecture/OPSLY-MOON-DATA-SOURCES.md` y este espejo runbook.

## Capacidad VPS

Si `docs/ops/ACTIVE-CAPACITY-ALERT.md` está `active`: no deploy pesado, no builds Docker paralelos, validar en secuencia.

## Incidentes UI

1. Fallo API tenants → empty/error state (no mocks en prod).
2. Costs → etiquetar ESTIMADO.
3. Approvals vacíos → empty profesional.
4. Command Center → solo deep-links; no LLM sin auth humana.

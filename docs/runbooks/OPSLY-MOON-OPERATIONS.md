---
status: canon
owner: platform
last_review: 2026-08-07
type: runbook
tags:
  - opsly/moon
  - opsly/operations
---

# Opsly Moon — Operaciones

## Alcance

Operar el control plane `apps/admin` (/moon) sin tocar el panel Peskids ni desplegar desde la UI Moon.

## Capacidad VPS

Antes de cualquier build/deploy: leer `docs/ops/ACTIVE-CAPACITY-ALERT.md` y `docs/runbooks/VPS-MEMORY-CAPS.md`.  
Si alerta **active**: no builds pesados concurrentes; no deploy Moon de día; smoke secuencial.

## Validación local (secuencial)

```bash
npm run test:moon --workspace=@intcloudsysops/admin
npm run type-check --workspace=@intcloudsysops/admin
npm run validate-structure
```

No levantar suites paralelas grandes en el mismo host que el VPS bajo presión.

## Fuentes

Ver `docs/00-architecture/OPSLY-MOON-DATA-SOURCES.md` y este runbook hermano `OPSLY-MOON-DATA-SOURCES.md`.

## Incidentes típicos

| Síntoma | Acción |
| --- | --- |
| Home sin tenants | Verificar API `/api/tenants` + sesión admin; no rellenar mocks |
| Costs vacíos | `/api/admin/costs` + Doppler; etiqueta ESTIMADO |
| Command “sin efecto” | Esperado dry-run — solo navegación |
| Badge “Producción” en staging | Revisar `NEXT_PUBLIC_ENV` en build |

## Enlaces

- [[../00-architecture/OPSLY-MOON]]
- [[OPSLY-MOON-ROLLBACK]]
- [[VPS-MEMORY-CAPS]]

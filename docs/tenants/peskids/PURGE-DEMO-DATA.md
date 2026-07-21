---
status: canon
owner: operations
last_review: 2026-07-21
---

# Peskids — Limpiar datos demo antes de estudiantes reales

> Objetivo: dejar producción limpia de filas `demo-seed:v1` / `*.demo@peskids.co` sin truncar tablas ni tocar al owner.

## Qué NO borrar

- Owner: `sierrasantiago90@gmail.com`
- Pools reales (`seed-peskids-pools.sh`)
- `tenant_settings`
- Cualquier fila **sin** marker `demo-seed:v1` y **sin** email `*.demo@peskids.co`

## 1) Inventario (obligatorio)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/purge-peskids-demo-data.sh --dry-run
```

Revisar la lista de IDs con Sierra / ops antes de borrar.

## 2) Purge (solo tras revisión)

```bash
PESKIDS_PURGE_DEMO_CONFIRM=yes doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/purge-peskids-demo-data.sh --execute --purge-auth --purge-class
```

Orden de borrado: followups → feedback → leads → students → (opcional) clase demo → (opcional) Auth demo.

## 3) CRM Twenty (humano)

Si hubo sync de leads demo, borrar contactos/oportunidades con email `*.demo@peskids.co` en Twenty.

## 4) Seeds bloqueados en prd

Los scripts `seed-peskids-demo-students.sh`, `seed-peskids-demo-class.sh` y `peskids-orchestrator.sh seed-demo` **exigen**:

```bash
PESKIDS_ALLOW_DEMO_SEED=1
```

Sin ese flag, se niegan (fail-closed).

## 5) Verificar UI

- `/admin` — interesados / familias vacíos o solo reales
- Login demo (`*.demo@peskids.co`) ya no entra
- Landing + formulario público listos para captar familias reales

## Enlaces

- Script: `scripts/purge-peskids-demo-data.sh`
- Guard: `scripts/lib/peskids-demo-seed-guard.sh`
- Demo seed (no usar en prd): `docs/tenants/peskids/DEMO-SCRIPT.md`

---
status: canon
owner: operations
last_review: 2026-07-27
---

# Ventana de cambios en producción (noche)

Peskids y el control plane Opsly están **operativos de día**. Para no interferir con matrículas, WhatsApp, admin y clases:

## Regla

| Acción | Cuándo |
|--------|--------|
| Merge a `main` que toque **runtime / deploy / infra / migraciones** | Solo en **ventana nocturna** `America/Bogota` **22:00–06:00** |
| Deploy a VPS / GHCR de Peskids (u otros tenants en prod) | Misma ventana nocturna |
| Docs, skills, reglas Cursor, copy sin runtime | **Sí de día** (sin label) |
| Cambio mínimo que **no** afecta producción ni operación | De día solo con label GitHub **`safe-daytime`** |
| Emergencia (outage / seguridad) | De día con label **`hotfix-prod`** + aprobación humana |

## Ventana nocturna

- Zona: **`America/Bogota`**
- Horario permitido: **22:00 inclusive → 06:00 exclusive**
- Fuera de esa franja, CI `production-change-window` falla en PRs de impacto prod, y `Deploy Peskids` no despliega (salvo `force_daytime` / `hotfix-prod`).

## Paths de impacto (noche o hotfix)

- `apps/**` (incluye Peskids, API, portal, admin, …)
- `infra/**`
- `supabase/**`
- `scripts/` de deploy/VPS/peskids (`*deploy*`, `peskids-*`, `vps-*`, …)
- `.github/workflows/deploy*.yml`

## Paths seguros de día (solo estos en el PR)

- `docs/**`, `*.md` de gobernanza, `.cursor/**`, `.agents/**`, `skills/**`
- Plantillas GitHub que no despliegan

Si el PR mezcla docs + `apps/peskids` → se trata como impacto prod.

## Labels

| Label | Uso |
|-------|-----|
| `night-merge` | Cola de **merge automático nocturno** (01:00 Bogotá): CI verde de día (este label **pasa** el gate `production-change-window` sin autorizar merge diurno) → squash-merge → Deploy → smoke → rollback si falla. Ver [`NIGHT-MERGE.md`](NIGHT-MERGE.md) |
| `safe-daytime` | Humano certifica: no afecta prod/ops; merge de día OK |
| `hotfix-prod` | Emergencia; merge/deploy de día OK |

## Merge mientras duermes

1. De día: PR listo + CI verde + label **`night-merge`**.
2. A la 01:00 corre [`.github/workflows/night-merge.yml`](../../.github/workflows/night-merge.yml).
3. Si el Deploy o el smoke fallan, el job intenta **rollback** de `main` y avisa por Discord.

## Agentes / Cursor

No mergear ni desplegar Peskids/runtime de día. Abrir PR, dejar listo, añadir **`night-merge`** (o merge en ventana nocturna). Ver `.cursor/rules/production-change-window.mdc`.

## Comandos

```bash
# ¿Estamos en ventana? (exit 0 = sí)
node scripts/ci/check-production-change-window.mjs --check-now

# Simular paths de un PR
node scripts/ci/check-production-change-window.mjs --paths apps/peskids/app/page.tsx
```

## Enforce en GitHub

1. Workflow **Production change window** en PRs (status check).
2. Añadir check **`production-change-window`** a branch protection de `main` (Settings → Branches).
3. Deploy Peskids: gate nocturno + input `force_daytime` en `workflow_dispatch`.

---
status: canon
owner: operations
last_review: 2026-07-27
---

# Ventana de cambios en producción (noche)

Peskids está **operativo de día**. La ventana nocturna protege únicamente cambios cuyo blast radius puede afectar Peskids o superficies compartidas de producción.

## Regla

| Acción | Cuándo |
|--------|--------|
| Promoción/deploy a producción de runtime / infra / migraciones | Solo en **ventana nocturna** `America/Bogota` **22:00–06:00** |
| Deploy a VPS / GHCR de Peskids (u otros tenants en prod) | Misma ventana nocturna |
| Docs, skills, reglas Cursor, copy sin runtime | **Sí de día** (sin label) |
| Cambio fuera del blast radius de Peskids (agentes, tooling interno, docs, research, etc.) | **Sí de día** si CI/review pasan |
| Cambio ambiguo que el gate marca como impacto pero un reviewer confirma que no afecta Peskids | De día con label GitHub **`safe-daytime`** |
| Emergencia (outage / seguridad) | De día con label **`hotfix-prod`** + aprobación humana |

## Ventana nocturna

- Zona: **`America/Bogota`**
- Horario permitido: **22:00 inclusive → 06:00 exclusive**
- Fuera de esa franja, la promoción de producción falla. El merge a `main` no despliega Peskids.

## Paths con impacto Peskids (noche o hotfix)

Impacto directo:
- `apps/peskids/**`
- `apps/peskids-franchise/**`
- `apps/intcloudsysops/**` (contiene superficies, runtime y migraciones Peskids actualmente dispersas)
- `.n8n/1-workflows/peskids/**`
- `scripts/peskids*`
- workflows específicos de deploy/setup Peskids

Superficies compartidas que pueden afectar Peskids:
- `apps/api/**`
- `infra/**`
- `supabase/**`
- `packages/**`
- `lib/**`
- scripts/workflows de deploy/VPS/onboarding compartidos
- `package.json` / `package-lock.json`

Cambios fuera de ese blast radius —por ejemplo orchestrator, agent tooling, prompts, docs o Mission Control no desplegado junto con Peskids— pueden mergearse de día si CI y revisión están verdes.

Si el PR mezcla docs + `apps/peskids` → se trata como impacto Peskids.

## Labels

| Label | Uso |
|-------|-----|
| `night-merge` | Cola de **merge automático nocturno** (01:00 Bogotá): CI verde de día (este label **pasa** el gate `production-change-window` sin autorizar merge diurno) → squash-merge → Deploy → smoke → rollback si falla. Ver [`NIGHT-MERGE.md`](NIGHT-MERGE.md) |
| `safe-daytime` | Reviewer certifica: el cambio marcado por el gate no puede afectar Peskids; merge de día OK |
| `hotfix-prod` | Emergencia; merge/deploy de día OK |

## Merge mientras duermes

1. De día: PR revisado, CI verde y staging verificado.
2. En la ventana: ejecutar **Promote Peskids release candidate** con el SHA completo.
3. Si deploy o smoke fallan, se restaura el último artefacto SHA conocido.

## Agentes / Cursor

Los agentes pueden mergear de día cambios fuera del blast radius de Peskids cuando CI y revisión estén verdes. Si el cambio toca o puede afectar Peskids, el merge queda para la ventana nocturna salvo `safe-daytime` revisado o `hotfix-prod`. Ver `.cursor/rules/production-change-window.mdc`.

## Nightly merge + upgrades + cleanup

PRs con label **`night-merge`** se squash-mergean a la **01:00 America/Bogota**. Después: nightly-ops (~01:15) y **Night cleanup** (03:30) con revisión anterior/posterior. Ver [`NIGHTLY-OPS-UPGRADE.md`](NIGHTLY-OPS-UPGRADE.md) y [`NIGHT-CLEANUP.md`](NIGHT-CLEANUP.md).

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

### Peskids Docker gotcha (2026-09-10)

- Next **15.5** en `apps/peskids`: `next build` ya usa webpack. **No** pasar `--webpack` ni `--turbopack` en `apps/peskids/Dockerfile`.
- Ese flag rompe GHCR (`unknown option '--webpack'`) y deja prod atrás de `main`.
- Guard CI: `scripts/ci/check-peskids-docker-build-flags.sh` (job `scripts-check`).
- Tras merge a `main`: Actions → **Deploy Peskids**. De día solo con `force_daytime=true` + label `hotfix-prod` / humano.

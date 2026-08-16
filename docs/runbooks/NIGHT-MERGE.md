---
status: canon
owner: operations
last_review: 2026-08-15
---

# Night merge automático (mientras duermes)

Cada noche (~**01:00 America/Bogota**) GitHub Actions:

1. Busca PRs abiertos con label **`night-merge`**
2. Valida: no draft, `MERGEABLE` (reintenta si GitHub devuelve `UNKNOWN`), checks CI en verde (sin FAILURE ni pending; ignora `production-change-window`)
3. Squash-merge + borra la rama
4. Espera el workflow **Deploy** en `main` cuyo `headSha` sea el SHA **después** del merge (nunca un Deploy viejo fallido)
5. Smoke: `api.{PLATFORM_DOMAIN}/api/health` + `peskids.{PLATFORM_DOMAIN}/`
6. Si Deploy o smoke fallan → **rollback vía PR** (`revert/night-merge-*` + `hotfix-prod` + squash admin). No hace `git push origin main` (branch protection lo rechaza).

## Cómo encolar (de día)

1. Abre/deja el PR listo con CI verde.
2. Añade label: **`night-merge`**.
3. No hace falta que estés despierto: el cron lo mergea.

```bash
gh pr edit <N> --repo cloudsysops/opsly --add-label night-merge
```

## Labels relacionados

| Label | Efecto |
|-------|--------|
| `night-merge` | Cola de merge automático nocturno |
| `safe-daytime` | Merge de día OK (sin impacto prod) |
| `hotfix-prod` | Emergencia de día |

## Manual / prueba

Actions → **Night merge** → Run workflow:

- `dry_run=true` — solo valida, no mergea
- `force=true` — ignora ventana (solo emergencias)

## Local

```bash
# Dry-run (requiere gh auth)
DRY_RUN=1 NIGHT_MERGE_FORCE=1 ./scripts/ci/night-merge-and-verify.sh
```

## Si falla el rollback automático

```bash
# Ver último SHA bueno en el log del job / Discord
git fetch origin
git log origin/main --oneline -15
# Revert manual de squash commits o reset coordinado (evitar --force a main sin humano)
```

## Relación con n8n nightly

El upgrade n8n + rollback de contenedores (`scripts/nightly-ops-upgrade.sh`, ~01:15) es **aparte**. Este workflow cubre **git merge → deploy → smoke → git rollback**.

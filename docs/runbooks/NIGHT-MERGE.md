---
status: canon
owner: operations
last_review: 2026-09-07
---

# Night merge = MERGE_TO_MAIN (no production)

GitHub Actions squash-mergea PRs con label **`night-merge`**. Eso **no** despliega producción.

1. Busca PRs abiertos con label **`night-merge`**
2. Omite denylist (`NIGHT_MERGE_DENY_PRS`, default **1123**)
3. Valida: no draft, checks verdes (ignora `production-change-window`)
4. Squash-merge
5. Espera el workflow **Deploy** en `main` (ahora **staging only**)
6. Smoke staging opcional (`STAGING_SMOKE_API_URL`)
7. Si staging falla → rollback de `main` vía revert PR

Promote: [`RELEASE-AUTOMATION.md`](RELEASE-AUTOMATION.md) / `.github/workflows/promote-production.yml`

## Horarios (UTC, Bogotá UTC−5, sin DST)

| Bogotá | UTC cron | Por qué |
|--------|----------|---------|
| 23:00 | `0 4 * * *` | Sobrevive delay de Actions |
| 01:00 | `0 6 * * *` | Canónico |
| 04:00 | `0 9 * * *` | Reintento |
| 09:00 | `0 14 * * *` | Catch-up si el cron de 01:00 aterrizó a las 06:10 (2026-09-07) |
| 15:00 | `0 20 * * *` | Catch-up tarde |

Merge **no** está atado a 22:00–06:00. Promote **sí**.

## Cómo encolar

```bash
gh pr edit <N> --repo cloudsysops/opsly --add-label night-merge
```

## Manual

Actions → **Night merge** → `dry_run=true` valida sin mergear.

```bash
DRY_RUN=1 ./scripts/ci/night-merge-and-verify.sh
```

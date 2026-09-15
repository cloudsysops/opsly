---
status: canon
owner: operations
last_review: 2026-09-09
---

# Night merge automático (mientras duermes)

Cada noche (~**01:00 America/Bogota**) GitHub Actions:

1. Busca PRs abiertos con label **`night-merge`**
2. Valida: no draft, `MERGEABLE` (reintenta si GitHub devuelve `UNKNOWN`), checks CI en verde (sin FAILURE ni pending; ignora `production-change-window`)
3. Squash-merge + borra la rama
4. Espera el workflow **Deploy** en `main` cuyo `headSha` sea el SHA **después** del merge (nunca un Deploy viejo fallido). Deploy usa `concurrency` por rama (un SSH a la vez) y el health **público** lo hace el runner (no el VPS vía Cloudflare; el hairpin fallaba el job con la API ya arriba).
   Si no aparece ningún Deploy después de 120 segundos, el workflow verifica que `main` siga en el mismo SHA y despacha `Deploy` automáticamente para ese `main`. Si `main` avanzó o el dispatch falla, conserva el rollback y notifica para revisión humana.
5. Smoke: `api.{PLATFORM_DOMAIN}/api/health` + **`https://www.peskids.com/api/health`** (prod Peskids; no `peskids.op-sly.com`)
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

## Relación con n8n nightly y night cleanup

El upgrade n8n + rollback de contenedores (`scripts/nightly-ops-upgrade.sh`, ~01:15) es **aparte**. Este workflow cubre **git merge → deploy → smoke → git rollback**.

A las **03:30 Bogotá** corre [Night cleanup](./NIGHT-CLEANUP.md): revisión de health **antes y después**, higiene de ramas mergeadas y prune Docker ligero. No mergea PRs.

## Por qué Deploy no arranca tras el bot (2026-09-09)

GitHub **no dispara** otros workflows cuando el push a `main` lo hace `GITHUB_TOKEN` (el squash del job Night merge). Por eso el 2026-09-09 el bot mergeó #1149, esperó Deploy 25 min, timeout, y abrió el revert falso #1153 (cerrado; `main` conservó #1149).

Mitigación en este script:

1. Tras mergear, **despacha** `Deploy` con `gh workflow run`.
2. Si a los 120 s sigue ausente, reintenta el dispatch (mismo SHA).
3. Un revert se **abre** como PR `hotfix-prod` y se notifica a Discord; **no** se auto-mergea (`NIGHT_MERGE_AUTO_ROLLBACK_MERGE` default `0`).

## Cola 2026-09-09 (una sola PR stacked)

No etiquetar a la vez #1156 y un PR que ya incluye esos commits.

| Orden | PR | Qué | Label `night-merge` |
|-------|-----|-----|---------------------|
| 1 | **#1154** (rebased onto #1156) | audit lockfile + dispatch Deploy + no auto-rollback | **SÍ — única de esta noche** |
| 2 | #1155, #1150, #1151, #1144, #1146, #1147 | gameplay / key hygiene / vendor / peskids rollback / gamer plane | **NO** hasta que #1154 esté en `main` y se rebaseen otra vez |

Agentes post-merge: [`docs/01-development/night-queue/010-night-merge-wave2-rebase.md`](../01-development/night-queue/010-night-merge-wave2-rebase.md) (el dispatcher copia a `.cursor/prompts/queue/`). Disparo sin esperar chat: `scripts/ops/dispatch-prompt-queue.sh` (launchd) o n8n `docs/n8n-workflows/night-agent-queue.json`. **No** usar `docs/ACTIVE-PROMPT.md` como shell en el VPS.

```bash
# Instalar launcher local (Mac, escribe ~/Library/LaunchAgents — no toca prod)
./scripts/ops/install-night-agent-launchd.sh
# Primera ola a partir de 22:00 Bogotá (idempotente; no-op de día)
./scripts/ops/night-merge-wave1.sh --dry-run
```

## Enlaces relacionados

- [[NIGHT-CLEANUP|Night cleanup]]
- [[PRODUCTION-CHANGE-WINDOW|Ventana de producción]]
- [[01-development/AGENT-PROMPT-QUEUE|Cola de prompts]]

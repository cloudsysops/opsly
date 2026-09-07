---
status: canon
owner: operations
last_review: 2026-09-07
---

# Night cleanup (revisión anterior y posterior)

Limpieza automática en **madrugada**, dentro de la ventana
`America/Bogota` **22:00–06:00**. No sustituye Night merge ni nightly-ops
upgrade: corre **después** de ambos y **revisa salud antes y después**.

## Hosts (no confundir)

| Rol | URL canónica |
| --- | --- |
| **Peskids producción** | **`https://www.peskids.com`** |
| Peskids staging | `https://peskids-staging.op-sly.com` |
| Opsly API | `https://api.op-sly.com` |
| No es prod | `peskids.op-sly.com` (308 hacia www) |

Night cleanup y Night merge fuman **`www.peskids.com/api/health`**, no el alias `op-sly`.

## Qué no es

- No es un segundo data-assurance / QA discovery.
- No aplica migraciones (`0098`/`0099`/`0103+`).
- No hace `docker system prune --volumes` ni `volume prune`.
- No hace `git push --force` a `main`.
- No reinicia ni redeploya Peskids.

## Orden nocturno

| Hora (Bogotá) | Quién | Qué |
| --- | --- | --- |
| **22:10** | [Unattended release](./UNATTENDED-RELEASE.md) | Revalida RC aprobado → Deploy Peskids (SHA exacto) o dry-run |
| 01:00 | [Night merge](./NIGHT-MERGE.md) | Squash-merge PRs `night-merge` → Deploy → smoke |
| 01:15 | [Nightly ops upgrade](./NIGHTLY-OPS-UPGRADE.md) | pull + n8n + smoke (si el cron VPS está instalado) |
| **03:30** | **Night cleanup** (este runbook) | pre-review → higiene → post-review |

El cron local `infra/cron/opsly-cleanup` (03:00 UTC, agresivo los domingos)
es **legado**. No lo actives en paralelo: el workflow GHA es el canónico
con revisión. Domingo `volume prune` queda **fuera** de este loop.

## Revisión anterior

1. Health público: `api.{PLATFORM_DOMAIN}/api/health`, `www.peskids.com/api/health`, staging.
2. `git fetch --prune` + `git-branch-hygiene.sh` (solo lectura).
3. Discord: snapshot pre.
4. VPS (si hay SSH): `df`, `docker system df`, `docker ps`.

## Limpieza segura

| Superficie | Acción | Guardrail |
| --- | --- | --- |
| Git remotes | Borra ramas **ya mergeadas** en `main` | Protege `main` y heads con PR abierto |
| PRs `auto-fix/*` | Cierra si tienen **0** commits únicos vs `main` | No toca PRs con label `night-merge` |
| VPS Docker | `image prune` unused **>7 días**, builder cache, contenedores **parados** | Falla si `peskids` desaparece |

## Revisión posterior

1. Mismos health probes.
2. Comparación: si API o Peskids **prod** pasan de 2xx/3xx a fallo → el job **falla**.
3. Staging que cae → **warning**, no bloquea (staging puede estar en repair).
4. Artifact `night-cleanup-review` + Discord post.

## Cómo disparar

Actions → **Night cleanup** → Run workflow:

- `dry_run=true` — lista, no borra ramas ni cierra PRs
- `force=true` — ignora ventana (solo prueba)
- `skip_vps=true` — solo git + health
- cron diario 03:30 Bogotá aplica merged remotes + cierra auto-fix stale

```bash
# Local (no muta GitHub si DRY_RUN=1)
NIGHT_CLEANUP_FORCE=1 DRY_RUN=1 ./scripts/ci/night-cleanup-and-verify.sh

# Comparación de fixtures
./scripts/ci/__tests__/night-cleanup-and-verify.test.sh
```

## Relación con scripts existentes

| Script | Rol |
| --- | --- |
| `scripts/ci/night-cleanup-and-verify.sh` | Orquestador GHA (pre/post) |
| `scripts/ci/night-cleanup-review.sh` | Snapshot health |
| `scripts/ci/night-cleanup-vps.sh` | Prune ligero en host (sin sudo) |
| `scripts/git-branch-hygiene.sh` | Auditoría, no borra |
| `scripts/git-branch-cleanup.sh` | Archiva y opcionalmente borra mergeadas |
| `scripts/vps-cleanup-robust.sh` | Manual / cron legado; `--aggressive` solo humano |

# GitHub PAT — `GITHUB_TOKEN` vs `GITHUB_TOKEN_N8N`

## Qué es

Un **personal access token (PAT)** con permisos suficientes para la **API REST de GitHub** cuando Opsly debe:

- Actualizar `docs/ACTIVE-PROMPT.md` vía API (`CursorWorker`, MCP `execute_prompt`, ML `write-active-prompt`).
- Abrir issues desde el health worker (opcional).

Scope típico: **`repo`** (classic) o permisos de **Contents** en el repo `cloudsysops/opsly` (fine-grained).

## Nombre en Doppler / `.env`

| Variable | Uso |
|----------|-----|
| **`GITHUB_TOKEN`** | **Nombre recomendado.** Alineado con convenciones habituales y con `gh auth login` / CLI. |
| **`GITHUB_TOKEN_N8N`** | **Legado.** Nombre histórico cuando el flujo pasaba por **n8n** llamando a la API de GitHub. Sigue siendo leída si `GITHUB_TOKEN` está vacío. |

El código resuelve el PAT así: **`GITHUB_TOKEN` primero, luego `GITHUB_TOKEN_N8N`.**

## No confundir con el flujo “solo VPS / CLI”

En el servidor (`/opt/opsly`), el script **`scripts/cursor-prompt-monitor.sh`** lee **`docs/ACTIVE-PROMPT.md` en disco** y ejecuta el payload en shell **sin pasar por la API de GitHub**. Eso es independiente del PAT: sirve para automatización local en el VPS.

Si quieres **subir** cambios al repo remoto, suele usarse **`git`** / **`gh`** en el VPS o el PAT anterior para la API.

## Compose / Doppler

En `infra/docker-compose.platform.yml`, servicios **mcp** y **orchestrator** reciben ambas variables (vacías si no existen). En Doppler puedes migrar de a una:

```bash
doppler secrets set GITHUB_TOKEN --project ops-intcloudsysops --config prd < token.txt
# opcional: eliminar GITHUB_TOKEN_N8N cuando ya no lo necesites
```

## Referencias

- `apps/orchestrator/src/lib/github-pat.ts` — `resolveGithubPat()`
- `scripts/check-tokens.sh` — exige al menos uno de los dos nombres

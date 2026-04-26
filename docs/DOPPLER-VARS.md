# Variables Doppler / secretos — referencia

Proyecto típico en Doppler: `ops-intcloudsysops`, configs `prd` (producción), `stg` (staging), `qa`, `dev`.

### CI (GitHub Actions)

Workflow [`.github/workflows/validate-doppler.yml`](../.github/workflows/validate-doppler.yml): instala la CLI de Doppler y ejecuta [`scripts/validate-doppler-vars.sh`](../scripts/validate-doppler-vars.sh) con argumentos **`ops-intcloudsysops prd`** y **`ops-intcloudsysops stg`**.

En el repo → **Settings → Secrets and variables → Actions** define:

- `DOPPLER_TOKEN_PRD` — token con lectura del proyecto (config `prd`).
- `DOPPLER_TOKEN_STG` — token con lectura (config `stg`). Puede ser el mismo service token si tiene acceso a ambas configs.

Lista de variables obligatorias: `config/doppler-ci-required.txt` y, si existe, `config/doppler-ci-required-prd.txt` / `config/doppler-ci-required-stg.txt` (tienen prioridad sobre el `.txt` genérico por config).

**Runbook paso a paso (GitHub, local, troubleshooting):** [DOPPLER-CI-RUNBOOK.md](./DOPPLER-CI-RUNBOOK.md).

## Config `stg` (staging) — crear y poblar desde `prd`

Objetivo: un entorno **stg** con los mismos secretos que `prd`, luego sustituir solo lo que debe ser distinto (p. ej. Stripe **test**).

### 1) Crear la config `stg`

```bash
doppler configs create stg --project ops-intcloudsysops
```

(Si ya existe, Doppler devolverá error; puedes omitir este paso.)

### Copia incremental (solo claves que faltan en `stg`)

Sin JSON masivo ni sobrescribir lo ya definido en `stg`:

```bash
./scripts/sync-doppler-prd-to-stg.sh
./scripts/sync-doppler-prd-to-stg.sh --dry-run   # solo lista acciones, no escribe
```

Edita el array `EXCLUDE_VARS` en el script si quieres preservar más overrides en `stg`.

### 2) Clon completo vía JSON (`prd` → `stg`)

Útil para un **espejo inicial**; si `upload` falla, usa el pipeline `jq` más abajo. Para mantener `stg` al día sin pisar overrides, prefiere **`sync-doppler-prd-to-stg.sh`** (arriba).

| Paso  | Acción                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Descargar JSON de `prd` a un fichero temporal (contiene secretos: bórralo después).                                             |
| **B** | Subir ese JSON a la config `stg`.                                                                                               |
| **C** | Si el upload falla, usar **solo** el pipeline de normalización (paso B2) — no hace falta listar ni revisar valores en terminal. |

**A — Descarga**

```bash
doppler secrets download --project ops-intcloudsysops --config prd --format=json /tmp/opsly-prd-secrets.json
```

**B — Upload directo**

```bash
doppler secrets upload /tmp/opsly-prd-secrets.json --project ops-intcloudsysops --config stg
```

**B2 — Si el upload rechaza nombres de variables** (mensaje tipo _name may not start with a number_): Doppler exige nombres `LIKE_THIS` (empiezan por letra o `_`). El export puede traer entradas que no son nombres válidos o valores anidados. Normaliza y vuelve a subir **sin imprimir nada en pantalla**:

```bash
jq '
  with_entries(select(.key | test("^[A-Za-z_][A-Za-z0-9_]*$"))) |
  map_values(
    if type == "object" and (.computed != null) then .computed
    elif type == "string" then .
    else null end
  ) |
  with_entries(select(.value != null))
' /tmp/opsly-prd-secrets.json > /tmp/opsly-prd-upload.json

doppler secrets upload /tmp/opsly-prd-upload.json --project ops-intcloudsysops --config stg
rm -f /tmp/opsly-prd-secrets.json /tmp/opsly-prd-upload.json
```

Lo que el `jq` descarta no llega a `stg`: corrige el nombre en **prd** en el dashboard (Doppler) o copia ese secreto a mano. Último recurso: duplicar config en la UI o `doppler secrets set` por variable.

### 3) Stripe en `stg`

Si **`STRIPE_PUBLIC_KEY`**, **`STRIPE_SECRET_KEY`** y **`STRIPE_WEBHOOK_SECRET`** ya están definidos en `stg` (clon desde `prd` o carga previa), **no hace falta** volver a configurarlos.

Solo si quieres **sustituir** por otras claves (p. ej. solo test en staging):

```bash
doppler secrets set STRIPE_PUBLIC_KEY "pk_test_..." --project ops-intcloudsysops --config stg
doppler secrets set STRIPE_SECRET_KEY "sk_test_..." --project ops-intcloudsysops --config stg
doppler secrets set STRIPE_WEBHOOK_SECRET "whsec_..." --project ops-intcloudsysops --config stg
```

### 4) Verificar (opcional)

```bash
doppler secrets list --project ops-intcloudsysops --config stg | grep STRIPE
```

### 5) Probar Notion MCP contra `stg` (puerto 3015)

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops
MCP_PORT=3015 doppler run --project ops-intcloudsysops --config stg -- \
  npm run dev --workspace=@intcloudsysops/notion-mcp
```

Otra terminal:

```bash
sleep 2
curl -s http://127.0.0.1:3015/ready | python3 -m json.tool
```

Esperado: `status: ok` y títulos de las cinco bases (mismas variables `NOTION_DATABASE_*` que en el resto de configs; en `stg` puedes apuntar a bases Notion de staging si las creaste).

## LLM Gateway (Beast Mode v2)

| Variable                                     | Uso                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`                          | Anthropic (Haiku / Sonnet).                                                                      |
| `REDIS_URL`                                  | Cache de respuestas + estado de salud de proveedores.                                            |
| `REDIS_PASSWORD`                             | Si el cliente Redis lo requiere aparte de la URL.                                                |
| `LLM_GATEWAY_PORT`                           | Puerto del HTTP `/health` del proceso gateway (default `3010`).                                  |
| `LLM_CACHE_TTL_SECONDS`                      | TTL del cache Redis de prompts (default `7200`).                                                 |
| `OLLAMA_URL`                                 | Base URL de Ollama (default `http://localhost:11434`).                                           |
| `OLLAMA_MODEL`                               | Modelo Ollama por defecto (default `nemotron-3-nano:4b`; override p. ej. `nemotron-3-nano:30b`). |
| `OPENROUTER_API_KEY`                         | OpenRouter (fallback económico).                                                                 |
| `OPENAI_API_KEY`                             | OpenAI (`gpt-4o`, `gpt-4o-mini`) como fallback.                                                  |
| `OPENROUTER_HTTP_REFERER`                    | Opcional: cabecera HTTP-Referer para OpenRouter.                                                 |
| `DISCORD_WEBHOOK_URL`                        | Alertas cuando un proveedor pasa a `down` o se recupera.                                         |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Opcional: `usage_events`.                                                                        |

## Notion MCP (`apps/notion-mcp`)

| Variable                  | Uso                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NOTION_TOKEN`            | Secret de integración interna (`secret_…`) desde [my-integrations](https://www.notion.so/my-integrations). |
| `NOTION_DATABASE_TASKS`   | UUID de la base **Tasks** (conexión de la integración a la página).                                        |
| `NOTION_DATABASE_SPRINTS` | Base **Sprints**.                                                                                          |
| `NOTION_DATABASE_STANDUP` | Base **Daily Standup**.                                                                                    |
| `NOTION_DATABASE_QUALITY` | Base **Quality Gates**.                                                                                    |
| `NOTION_DATABASE_METRICS` | Base **Metrics**.                                                                                          |
| `MCP_PORT`                | Puerto HTTP del servicio (default `3013`).                                                                 |

Arranque local con secretos: `npm run dev:notion-mcp` (inyecta Doppler `prd`). Comprobar: `GET /ready` debe devolver los títulos de las cinco bases.

### Notion MCP — config `qa` (espejo; **no tocar `prd`**)

Objetivo: mismo `NOTION_TOKEN` que prod (o uno con acceso al workspace QA) y cinco bases en Notion QA, **sin cambiar código** de `notion-mcp`.

**Importante — nombres de variables en Doppler:** el servicio solo lee estas claves (no existen `NOTION_DATABASE_TENANTS`, etc. en el código). En **qa** debes guardar los UUID de tus bases QA **usando obligatoriamente** `TASKS` / `SPRINTS` / `STANDUP` / `QUALITY` / `METRICS`. Los títulos en Notion pueden ser otros; `/ready` mostrará el título real de cada base.

| Variable Doppler (fija en código) | Base sugerida en Notion QA (nombre visible) |
| --------------------------------- | ------------------------------------------- |
| `NOTION_DATABASE_TASKS`           | Tenants (QA)                                |
| `NOTION_DATABASE_SPRINTS`         | Agents (QA)                                 |
| `NOTION_DATABASE_STANDUP`         | FeedbackChat (QA)                           |
| `NOTION_DATABASE_QUALITY`         | Logs (QA)                                   |
| `NOTION_DATABASE_METRICS`         | Config (QA)                                 |

Cada base debe tener la integración Notion **conectada** (Connections → tu integration).

#### 1) Verificar token en `prd` (solo lectura; no modifica prod)

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops
doppler secrets get NOTION_TOKEN --project ops-intcloudsysops --config prd --plain | wc -c
```

(No pegues el valor en chats; puede ser `secret_…` o `ntn_…` según la integración.)

#### 2) Copiar token `prd` → `qa`

**Opción A — CLI (un solo valor, sin log en pantalla recomendable):**

```bash
doppler secrets set NOTION_TOKEN "$(doppler secrets get NOTION_TOKEN --project ops-intcloudsysops --config prd --plain)" \
  --project ops-intcloudsysops --config qa
```

**Opción B — UI:** [Doppler qa](https://dashboard.doppler.com/workplace) → proyecto `ops-intcloudsysops` → config **qa** → `NOTION_TOKEN` → pegar el mismo valor que en `prd` → Save.

#### 3) UUIDs en Notion QA

En cada base: **Share** o barra de URL → copiar el ID (32 hex con guiones, entre el host y `?`).

#### 4) Verificar token en `qa`

```bash
doppler secrets get NOTION_TOKEN --project ops-intcloudsysops --config qa --plain | wc -c
```

#### 5) Arrancar MCP contra **qa** (puerto 3014)

`npm run dev:notion-mcp` está fijado a `prd`; para **qa** usa `doppler run` explícito:

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops
MCP_PORT=3014 doppler run --project ops-intcloudsysops --config qa -- \
  npm run dev --workspace=@intcloudsysops/notion-mcp
```

Otra terminal:

```bash
curl -s http://127.0.0.1:3014/ready | python3 -m json.tool
```

Esperado: `status: ok` y en `notion.databases` los cinco títulos (p. ej. «Tenants (QA)», …).

## Plataforma (otros)

Ver también `scripts/check-tokens.sh` para la lista de variables validadas contra Doppler `prd`.

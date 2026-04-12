# Variables Doppler / secretos — referencia

Proyecto típico en Doppler: `ops-intcloudsysops`, config `prd` (producción) o `dev`.

## LLM Gateway (Beast Mode v2)

| Variable | Uso |
|----------|-----|
| `ANTHROPIC_API_KEY` | Anthropic (Haiku / Sonnet). |
| `REDIS_URL` | Cache de respuestas + estado de salud de proveedores. |
| `REDIS_PASSWORD` | Si el cliente Redis lo requiere aparte de la URL. |
| `LLM_GATEWAY_PORT` | Puerto del HTTP `/health` del proceso gateway (default `3010`). |
| `LLM_CACHE_TTL_SECONDS` | TTL del cache Redis de prompts (default `7200`). |
| `OLLAMA_URL` | Base URL de Ollama (default `http://localhost:11434`). |
| `OLLAMA_MODEL` | Modelo Ollama por defecto (default `llama3.2`). |
| `OPENROUTER_API_KEY` | OpenRouter (fallback económico). |
| `OPENAI_API_KEY` | OpenAI (`gpt-4o`, `gpt-4o-mini`) como fallback. |
| `OPENROUTER_HTTP_REFERER` | Opcional: cabecera HTTP-Referer para OpenRouter. |
| `DISCORD_WEBHOOK_URL` | Alertas cuando un proveedor pasa a `down` o se recupera. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Opcional: `usage_events`. |

## Notion MCP (`apps/notion-mcp`)

| Variable | Uso |
|----------|-----|
| `NOTION_TOKEN` | Secret de integración interna (`secret_…`) desde [my-integrations](https://www.notion.so/my-integrations). |
| `NOTION_DATABASE_TASKS` | UUID de la base **Tasks** (conexión de la integración a la página). |
| `NOTION_DATABASE_SPRINTS` | Base **Sprints**. |
| `NOTION_DATABASE_STANDUP` | Base **Daily Standup**. |
| `NOTION_DATABASE_QUALITY` | Base **Quality Gates**. |
| `NOTION_DATABASE_METRICS` | Base **Metrics**. |
| `MCP_PORT` | Puerto HTTP del servicio (default `3013`). |

Arranque local con secretos: `npm run dev:notion-mcp` (inyecta Doppler `prd`). Comprobar: `GET /ready` debe devolver los títulos de las cinco bases.

### Notion MCP — config `qa` (espejo; **no tocar `prd`**)

Objetivo: mismo `NOTION_TOKEN` que prod (o uno con acceso al workspace QA) y cinco bases en Notion QA, **sin cambiar código** de `notion-mcp`.

**Importante — nombres de variables en Doppler:** el servicio solo lee estas claves (no existen `NOTION_DATABASE_TENANTS`, etc. en el código). En **qa** debes guardar los UUID de tus bases QA **usando obligatoriamente** `TASKS` / `SPRINTS` / `STANDUP` / `QUALITY` / `METRICS`. Los títulos en Notion pueden ser otros; `/ready` mostrará el título real de cada base.

| Variable Doppler (fija en código) | Base sugerida en Notion QA (nombre visible) |
|-----------------------------------|---------------------------------------------|
| `NOTION_DATABASE_TASKS` | Tenants (QA) |
| `NOTION_DATABASE_SPRINTS` | Agents (QA) |
| `NOTION_DATABASE_STANDUP` | FeedbackChat (QA) |
| `NOTION_DATABASE_QUALITY` | Logs (QA) |
| `NOTION_DATABASE_METRICS` | Config (QA) |

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

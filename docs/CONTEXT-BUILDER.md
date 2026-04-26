# Context Builder

Librería (`apps/context-builder`) que mantiene **contexto de sesión** por tenant en Redis y prepara mensajes para el LLM (incluyendo resumen cuando la conversación crece).

## Cómo funciona el session context

- Clave Redis: `tenant:{tenant_slug}:session:{session_id}`.
- Estructura `SessionContext` (`builder.ts`): `messages`, `summary` opcional, `metadata`, etc.
- `getSessionContext` / `saveSessionContext` serializan JSON en Redis.
- `buildContextForLLM` concatena historial + nuevo mensaje del usuario y estima tokens (heurística ~4 caracteres por token).

## TTL y auto-summarize

- `SESSION_TTL` por defecto: **3600 s** (1 h) en `saveSessionContext`.
- Si `messages.length > 10`, se llama `summarizeSession` (vía `llmCall` del gateway), se guarda `summary` y se recorta el historial a los últimos 4 mensajes para mantener ventana acotada.

## Cómo integrar en un nuevo servicio

```typescript
import {
  buildContextForLLM,
  saveSessionContext,
  getSessionContext,
} from '@intcloudsysops/context-builder';

const built = await buildContextForLLM(
  'acme',
  sessionId,
  'Nueva pregunta',
  'Eres un asistente útil.'
);
// usar built.messages y built.system con llmCall
```

Variables: `REDIS_URL`, `REDIS_PASSWORD` (coherentes con el despliegue).

En **Docker**, el servicio `context-builder` expone **GET `/health`** y **POST `/v1/context`** (`{ "query": "..." }` → `{ context, cache_hit, sources, digest }`) en `CONTEXT_BUILDER_PORT` (default **3012**).

## Repo-First RAG (índice local, estilo Obsidian)

- **Índice:** `config/knowledge-index.json` — por cada `.md`: `path`, `title` (primer `#`), `keywords` (derivados de `##`, nombre de archivo y título), `size_bytes`; más `topics` (token → rutas) para búsqueda rápida.
- **Generación:** `./scripts/index-knowledge.sh` usa `find` (excluye `node_modules`, `.git`, `dist`, `.next`, etc.) y `scripts/generate-knowledge-index.mjs`. Variables: `OPSLY_ROOT` (default raíz del repo; en VPS `/opt/opsly`), `KNOWLEDGE_INDEX_OUT` (default `config/knowledge-index.json`; en VPS se puede usar `/tmp/opsly-knowledge-index.json` para depuración).
- **API:** `buildContextFromQuery(query)` empaqueta fragmentos en `<context_bundle>`; `loadIndex` / `search` desde `@intcloudsysops/context-builder/indexer` filtran entradas sin leer todos los ficheros.
- **Caché Redis:** clave `opsly:ctx:{sha256(query)}`, TTL **24 h** (`CONTEXT_CACHE_TTL_SECONDS` en código).
- **Variables:** `OPS_REPO_ROOT` (raíz del clone), `KNOWLEDGE_INDEX_PATH` (ruta al JSON que consume el servicio).

**LLM Gateway:** con `LLM_GATEWAY_REPO_CONTEXT=true` y `CONTEXT_BUILDER_URL=http://context-builder:3012`, `llmCall` antepone el bloque al **system**. Usar `skip_repo_context: true` en llamadas auxiliares (p. ej. planner JSON, resúmenes de sesión).

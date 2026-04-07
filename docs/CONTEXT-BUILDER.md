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
} from "@intcloudsysops/context-builder";

const built = await buildContextForLLM("acme", sessionId, "Nueva pregunta", "Eres un asistente útil.");
// usar built.messages y built.system con llmCall
```

Variables: `REDIS_URL`, `REDIS_PASSWORD` (coherentes con el despliegue).

En **Docker**, el servicio `context-builder` expone solo **GET `/health`** en `CONTEXT_BUILDER_PORT` (default **3012**); la lógica principal es para importación como paquete desde API u otros workers.

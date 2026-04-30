# Opsly MCP Tool Skill

> **Triggers:** `mcp`, `tool`, `oauth`, `pkce`, `openclaw`, `mcp tool`, `tool definition`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-api`, `opsly-tenant`, `opsly-llm`

## Cuándo usar

Al agregar o modificar tools del MCP OpenClaw en `apps/mcp/`.

## Plantilla de tool

```typescript
// apps/mcp/src/tools/mi-feature.ts
import { z } from 'zod';
import { opslyFetch } from '../lib/api-client.js';
import type { ToolDefinition } from '../types/index.js';

export const miTool: ToolDefinition<{ param: string }, { result: unknown }> = {
  name: 'nombre_tool',
  description: 'Qué hace, qué devuelve y cuándo usarla. Una o dos frases claras.',
  inputSchema: z.object({
    param: z.string().describe('Qué es este parámetro'),
  }),
  handler: async (input) => {
    const data = await opslyFetch(`/api/endpoint/${encodeURIComponent(input.param)}`);
    return { result: data };
  },
};
```

Registrar la tool en `apps/mcp/src/server.ts` (`registerTools` / `adaptTool`).

## Scopes OAuth (obligatorio al exponer la tool)

Los scopes por nombre de tool viven en **`apps/mcp/src/server.ts`** (`TOOL_REQUIRED_SCOPES`). Cada tool nueva debe tener entrada ahí, alineada con:

- `tenants:read` / `tenants:write`
- `metrics:read`
- `invitations:write`
- `executor:write`

OAuth / PKCE: `apps/mcp/src/auth/` y `docs/adr/ADR-009-openclaw-mcp-architecture.md`.

## Reglas

- `description` clara; `inputSchema` con `.describe()` por campo.
- Sin side effects no documentados (GitHub, Discord, Docker, etc.).
- Tests: mock de `opslyFetch` en `apps/mcp/__tests__/`.

## Errores comunes

| Error               | Causa                      | Solución                  |
| ------------------- | -------------------------- | ------------------------- |
| Tool not found      | No registrada en server.ts | Añadir en `registerTools` |
| OAuth scope missing | No en TOOL_REQUIRED_SCOPES | Añadir scope              |
| 401 Unauthorized    | Token expirado             | Refresh OAuth token       |

## MCP externo n8n (no es `apps/mcp`)

El proyecto [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) es un **segundo servidor MCP** para nodos/plantillas n8n. Configuración Opsly: **`docs/02-tools/N8N-MCP-INTEGRATION.md`**. No registrar sus tools dentro de `apps/mcp` salvo ADR explícito.

## Testing

```bash
# Ver tools disponibles
curl -sf http://localhost:3003/tools | jq '.[].name'

# Test tool manually
curl -X POST http://localhost:3003/tools/mi_tool \
  -H "Content-Type: application/json" \
  -d '{"param":"valor"}'
```

# Opsly MCP Tool Skill

## Cuándo usar

Al agregar o modificar tools del MCP OpenClaw en `apps/mcp/`.

## Plantilla de tool

```typescript
// apps/mcp/src/tools/mi-feature.ts
import { z } from "zod";
import { opslyFetch } from "../lib/api-client.js";
import type { ToolDefinition } from "../types/index.js";

export const miTool: ToolDefinition<{ param: string }, { result: unknown }> = {
  name: "nombre_tool",
  description:
    "Qué hace, qué devuelve y cuándo usarla. Una o dos frases claras.",
  inputSchema: z.object({
    param: z.string().describe("Qué es este parámetro"),
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

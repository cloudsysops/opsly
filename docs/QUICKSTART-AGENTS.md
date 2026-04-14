# Quickstart: agentes y tools con OpenClaw (Opsly)

Guía **alineada al monorepo actual**. Para el norte del producto y reglas fijas: `VISION.md` y `AGENTS.md`.

## Arquitectura real (no duplicar)

```
Cliente MCP / orquestador
    → apps/mcp (tools en TypeScript, OpenClawMcpServer)
    → apps/api (control plane HTTP: tenants, health, invitaciones, …)
    → apps/orchestrator (BullMQ + workers) — ver docs/ORCHESTRATOR.md
    → apps/llm-gateway (routing, cache, costos) — ver docs/LLM-GATEWAY.md
    → apps/context-builder (sesiones / contexto) — ver docs/CONTEXT-BUILDER.md
```

Persistencia ya definida en **schema `platform`** (no inventar tablas paralelas de “agentes”):

| Recurso | Migración de referencia |
|--------|-------------------------|
| Sesiones de agente / contexto | `supabase/migrations/0019_agent_sessions.sql` |
| Estado y métricas Hermes | `supabase/migrations/0028_hermes_tables.sql` |
| Sprints (Mission Control) | `supabase/migrations/0021_platform_sprints.sql` |

Decisiones de capa MCP: `docs/adr/ADR-009-openclaw-mcp-architecture.md`.  
Diseño orientativo OpenClaw: `docs/OPENCLAW-ARCHITECTURE.md`.

## Qué **no** hacer

- No crear tablas nuevas tipo `registered_agents` / `mcp_tools` si el caso de uso cabe en `platform.*` existente; cualquier modelo nuevo va con **ADR** y migración `0031_*` en `platform`, no en `public` sin revisión.
- No asumir que `apps/mcp` es Next.js: es **Node + TypeScript** (`createServer()` en `apps/mcp/src/server.ts`).
- No inventar endpoints REST de tools en el puerto MCP: el HTTP en **3003** expone **salud y OAuth** (`apps/mcp/src/http-health.ts`), no `POST /tools/...` genérico.
- No duplicar la UI: ya existe `apps/admin/app/agents/page.tsx` (métricas de **equipos** vía API).

## Cómo añadir una tool MCP

### 1. Definir la tool con el patrón del repo

Las tools son objetos `ToolDefinition` con `name`, `description`, `inputSchema` (Zod con `.safeParse` compatible) y `handler`. Ejemplo mínimo (patrón real en `apps/mcp/src/tools/metrics.ts`):

```typescript
import { z } from "zod";
import { opslyFetch } from "../lib/api-client.js";
import type { ToolDefinition } from "../types/index.js";

const inputSchema = z.object({
  ref: z.string().min(1),
});

export const miToolDeEjemplo: ToolDefinition<
  z.infer<typeof inputSchema>,
  unknown
> = {
  name: "mi_tool",
  description: "Breve descripción para el cliente MCP",
  inputSchema,
  handler: async (input) => {
    return opslyFetch(
      `/api/ruta/existente/${encodeURIComponent(input.ref)}`,
    );
  },
};
```

`adaptTool` en `server.ts` ya valida el input con `safeParse` del schema; el `handler` recibe el objeto tipado.

Si la tool solo llama a la API Opsly, reutiliza **`opslyFetch`** (`apps/mcp/src/lib/api-client.js`) para respetar base URL y cabeceras de admin.

### 2. Registrar en `createServer()`

En `apps/mcp/src/server.ts`:

1. Importa tu tool y envuélvela con **`adaptTool(...)`** (como el resto).
2. Añádela al array de `server.registerTools([...])`.
3. Si la tool debe exigir OAuth al usar `callTool` con `Authorization`, añade en **`TOOL_REQUIRED_SCOPES`** el nombre de la tool → scope (mismo patrón que `get_tenants`, `get_health`, etc.).

Los nombres de scopes convencionales están alineados con `docs/adr/ADR-009-openclaw-mcp-architecture.md` y el código actual.

### 3. Probar (sin curl ficticio a `/tools/...`)

**Tests unitarios** (patrón en `apps/mcp/__tests__/tools.test.ts`): mockear `opslyFetch` y llamar directamente a `handler` del `ToolDefinition`.

**Servidor MCP** (patrón en `apps/mcp/__tests__/server.test.ts` y `server-scope.test.ts`):

```typescript
import { createServer } from "../src/server.js";

const server = createServer();
const out = await server.callTool("get_health", {});
// Tools con scope requieren el tercer argumento { authorization: "Bearer ..." } cuando TOOL_REQUIRED_SCOPES[name] está definido
```

Comando:

```bash
npm run test --workspace=@intcloudsysops/mcp
```

**Arranque local** del proceso MCP:

```bash
cd apps/mcp && npm run dev
```

Al iniciar, el proceso escribe JSON con `tools: server.listTools()`. El **único** HTTP documentado en el puerto por defecto es:

- `GET http://127.0.0.1:3003/health` → `{ "status": "ok", "service": "mcp" }`
- Rutas OAuth: `/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token` (ver `apps/mcp/src/http-health.ts`).

La invocación de tools en producción es vía **protocolo MCP** (stdio o host que llama a `callTool`), no un REST genérico documentado aquí.

## Orquestador y LLM

- Encolado y workers: `docs/ORCHESTRATOR.md`.
- Llamadas modelo: **siempre** vía `apps/llm-gateway` según políticas del repo (`VISION.md`, `AGENTS.md`).

## Admin: “Agentes”

En local, el admin suele estar en el puerto **3001** (`next dev -p 3001`):

- Ruta: **`/agents`** → `apps/admin/app/agents/page.tsx` (datos de equipos desde la API; no es un registro de “agentes custom” en BD).

## Checklist rápido

| Pregunta | Respuesta esperada |
|----------|-------------------|
| ¿La guía usa solo componentes existentes? | Sí: MCP Node, `ToolDefinition`, `createServer`, tests Vitest, tablas `platform.*` citadas |
| ¿Propone tablas nuevas? | No |
| ¿Los comandos y rutas HTTP citados existen? | Sí: `npm run test --workspace=@intcloudsysops/mcp`, `GET /health` en MCP; no se documentan endpoints inventados |

---

*Última alineación: monorepo Opsly — `apps/mcp` como fuente de verdad para tools.*

---
status: draft
owner: operations
last_review: 2026-05-24
type: package-doc
tags:
  - opsly/package
---

# Opsly Vercel AI SDK (marketplace)

> **Triggers:** `ai sdk`, `vercel ai`, `streamtext`, `generatetext`, `useChat`, `tool calling react`, `structured output llm`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-llm`, `opsly-frontend`, `opsly-api`, `opsly-mcp`
> **Origen:** adaptación de la skill *ai-sdk* del marketplace Cursor (Vercel). Uso **acotado** dentro de las reglas de producto Opsly.

## Cuándo usar

- Construir UI conversacional o streaming en **`apps/portal`**, **`apps/admin`** o **`apps/web`**.
- Prototipos de herramientas con `streamText` / `generateText` / `tool` del paquete `ai` y proveedores `@ai-sdk/*`.
- Integrar **MCP → AI SDK** solo si el diseño lo aprueba y no duplica OpenClaw innecesariamente.

## Regla de oro Opsly

- El **control plane** de IA (costos, routing, políticas multi-tenant) sigue siendo **LLM Gateway + Orchestrator** (`opsly-llm`, `docs/OPENCLAW-ARCHITECTURE.md`).
- El AI SDK en el monorepo es adecuado para **experiencia de usuario** (chat, streaming en el navegador) siempre que las llamadas **sensibles a costo o datos de tenant** pasen por APIs que internamente usen el gateway u otra capa aprobada — **no** exponer claves de proveedor en el cliente.

## Mapa de rutas (monorepo)

| App        | Uso típico                                      |
| ---------- | ----------------------------------------------- |
| `apps/web` | Workspace / marketing / checkout según producto |
| `apps/portal` | Dashboard cliente, chat asistido           |
| `apps/admin`  | Herramientas internas                       |

Patrones de archivo comunes (Vercel): `app/api/chat/**`, `lib/ai/**` — en Opsly equivalente bajo `apps/<app>/...`.

## Checklist antes de merge

- Sin `any`; sin secretos en código o `NEXT_PUBLIC_*` inadecuados.
- `npm run type-check` del workspace tocado.
- Si el endpoint nuevo es público o multi-tenant: **Zero-Trust** y revisión de seguridad (`docs/SECURITY_CHECKLIST.md`).

## Documentación

- [AI SDK docs](https://sdk.vercel.ai/docs)
- [Providers](https://sdk.vercel.ai/providers)

## Cuándo **no** usar esta skill como fuente única

- Jobs BullMQ, workers, MCP tools de plataforma → **`opsly-orchestrator`**, **`opsly-mcp`**, **`opsly-llm`**.

---

## Enlaces relacionados

- [[packages/skills/README|skills]]
- [[README|Inicio]]

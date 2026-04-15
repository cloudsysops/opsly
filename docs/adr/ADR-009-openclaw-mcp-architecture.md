# ADR-009: OpenClaw MCP Server Architecture

**Estado:** ACEPTADO  
**Fecha:** 2026-04-07

## Contexto

Opsly necesita un MCP server para que Claude pueda controlar el platform
directamente desde el chat, un orquestador que coordine agentes (Cursor,
n8n, Claude) y una capa ML para ofrecer IA a los tenants.

## Decisión

Construir en 3 capas desacopladas:

### Capa 1 — MCP Server (`apps/mcp/`)

- Protocol: Model Context Protocol (MCP)
- Runtime: Node.js + TypeScript
- Tools expuestos:
  - `get_tenants` -> `GET /api/tenants`
  - `get_tenant` -> `GET /api/tenants/:ref`
  - `onboard_tenant` -> `POST /api/tenants`
  - `suspend_tenant` -> `POST /api/tenants/:id/suspend`
  - `resume_tenant` -> `POST /api/tenants/:id/resume`
  - `send_invitation` -> `POST /api/invitations`
  - `get_metrics` -> `GET /api/metrics/system`
  - `get_health` -> `GET /api/health`
  - `execute_prompt` -> escribe `docs/ACTIVE-PROMPT.md` via GitHub API
  - `list_ai_integrations` -> catálogo de integraciones (Cursor/GitHub prompt, Docker, LLM Gateway, NotebookLM); opcional snapshots `/health` de servicios internos (`MCP_*_URL`)
  - `probe_platform_component` -> GET `/health` allowlist (llm-gateway, orchestrator, context-builder, mcp)
  - `get_docker_containers` -> `GET /api/admin/docker/containers`

### Capa 2 — Orquestador (`apps/orchestrator/`)

- Queue: BullMQ + Redis (infra existente)
- Jobs:
  - `CursorJob` -> escribe `ACTIVE-PROMPT.md`
  - `N8nJob` -> dispara webhook n8n
  - `NotifyJob` -> Discord
  - `DriveJob` -> sync Drive
- Motor de decisiones:
  - Recibe intent de MCP
  - Decide qué agente ejecuta
  - Trackea estado del job
  - Reporta resultado

### Capa 3 — ML Layer (`apps/ml/`)

- Per-tenant AI:
  - WhatsApp bot con LLM (via n8n + Claude API)
  - RAG sobre documentos del tenant
  - Clasificación de leads
- Infraestructura:
  - Vector store: pgvector en Supabase
  - LLM: Claude API (Anthropic)
  - Embeddings: activar proveedor soportado por API vigente (feature-flag)

## Consecuencias

- MCP se integra con Claude via conector MCP.
- Orquestador usa Redis existente (sin infraestructura nueva).
- ML Layer es opcional por tenant (feature flag por plan).
- ADR-001 (compose por tenant), ADR-002 (Traefik) y ADR-004 (schema platform)
  permanecen vigentes.

## No objetivos

- Kubernetes
- Servicios externos de ML fuera del stack actual sin ADR adicional
- Cambiar Traefik
- Cambiar el esquema base existente de Supabase

---

## Autenticación — OAuth 2.0 + PKCE

Adoptamos el estándar OAuth 2.0 + PKCE descrito para MCP en:

- [Model Context Protocol — Authentication](https://spec.modelcontextprotocol.io/specification/authentication/)

**Razones**

- Compatibilidad con clientes OAuth (p. ej. Claude.ai) cuando el ecosistema exponga registro de MCPs.
- Estándar de la industria: no se redefine el flujo fuera del spec.
- PKCE para clientes públicos sin `client_secret`.

**Implementación en `apps/mcp/`**

- Descubrimiento: `GET /.well-known/oauth-authorization-server` (issuer, `authorization_endpoint`, `token_endpoint`, `token_endpoint_auth_methods_supported: ["none"]` para clientes públicos PKCE, `code_challenge_methods_supported: S256`, scopes).
- Autorización: `GET /oauth/authorize` con `response_type=code` (obligatorio, OAuth 2.0), `code_challenge` / `code_challenge_method`, redirección con `code`. Códigos de autorización almacenados en **Redis** (misma instancia que cache LLM), TTL 10 min.
- Token: `POST /oauth/token` (`Content-Type: application/x-www-form-urlencoded`) con `grant_type=authorization_code`, `code`, `code_verifier`, `client_id`.
- Access tokens: JWT firmados (secreto `MCP_JWT_SECRET`, o mismo material que admin solo si cumple longitud mínima en entornos sin secreto dedicado).
- Compatibilidad hacia atrás: `Authorization: Bearer` con `PLATFORM_ADMIN_TOKEN` sigue aceptado en la capa MCP (equivale a scope `*`).

**Cliente OAuth registrado (bootstrap)**

- `client_id`: `claude-ai`
- Redirects: `https://claude.ai/oauth/callback`, `http://localhost:3000/oauth/callback`
- Scopes soportados: `tenants:read`, `tenants:write`, `metrics:read`, `invitations:write`, `executor:write`

**Herramientas y scopes**

| Tool | Scope |
|------|--------|
| `get_tenants`, `get_tenant` | `tenants:read` |
| `onboard_tenant`, `suspend_tenant`, `resume_tenant` | `tenants:write` |
| `get_health`, `get_metrics` | `metrics:read` |
| `send_invitation` | `invitations:write` |
| `execute_prompt` | `executor:write` |

La verificación de scope aplica cuando el transporte hacia `callTool` incluye `Authorization`. Las llamadas in-process sin header conservan el comportamiento previo (tests y runners locales).

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

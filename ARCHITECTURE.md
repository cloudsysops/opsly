# Opsly - Architecture Snapshot

Este archivo resume el estado arquitectónico actual del monorepo.

## Tecnologías instaladas

- **Frontend / UI**
  - Next.js 15
  - React 19
  - TypeScript (strict)
  - Tailwind CSS
  - SWR
- **Backend / API**
  - Next.js Route Handlers (Node runtime para rutas críticas)
  - Supabase (`@supabase/supabase-js`)
  - Stripe
  - Redis (`redis`, `ioredis`)
- **Orquestación y Jobs**
  - BullMQ
  - Orchestrator service (`apps/orchestrator`)
  - Workers especializados (notify, drive, backup, health, n8n, cursor)
- **IA / Agentes**
  - LangChain (`langchain`)
  - LangSmith (`langsmith`) con tracing por env vars
  - Tavily (`@tavily/core`)
  - Tool Registry dinámico (manifests + búsqueda por capacidades)
- **Infra / DevOps**
  - Docker Compose
  - Traefik v3
  - Doppler (gestión de secretos)
  - GitHub Actions (CI/CD)

## Patrones usados

- **Zero-Trust portal auth**
  - `runTrustedPortalDal(request, fn)`
  - `resolveTrustedPortalSession(...)`
- **Repository pattern**
  - Repositorios de datos (ej. billing, webhook, tenant)
- **Factory / Registry pattern**
  - `ToolRegistry` + `ToolManifest` para herramientas de agentes
- **Event-driven / queue-based orchestration**
  - Jobs en BullMQ con `idempotency_key`, `request_id`, `tenant_id`
- **Graceful degradation**
  - Fallbacks cuando Redis/servicios externos no están disponibles
- **Observabilidad estructurada**
  - Logs JSON para planner, workers y metering

## Estado actual

- **Portal Billing Summary**
  - Endpoint protegido y operativo con costo asentado + pendiente (Redis)
  - Manejo explícito de degradación de Redis con warning en stderr
- **Mission Control**
  - Heartbeats en Redis (`heartbeat:*`) para API y Orchestrator
  - Endpoint `/api/infra/status` protegido con auth portal
  - Dashboard `/mission-control` con polling y estados healthy/degraded/down
- **AI Tooling Fase 1 (Tool Wisdom)**
  - `ToolManifest` definido con `capabilities` y `riskLevel`
  - `InMemoryToolRegistry` con `search(query)` por coincidencia textual
  - Herramientas base registradas (`dummy_square`, `tavily_search`, mocks internos)
- **QA Regresión**
  - Tests para `/api/infra/status` (401/200)
  - Tests para Mission Control (Unauthorized y sesión válida)

## Referencias internas

- Arquitectura detallada previa: `docs/ARCHITECTURE.md`
- Roadmap y visión: `VISION.md`
- Contexto operativo de sesiones: `AGENTS.md`

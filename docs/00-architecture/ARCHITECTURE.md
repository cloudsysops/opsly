# Opsly Architecture (Authority)

This document is the single technical authority for runtime architecture at the platform level.

## Runtime Topology

- Control plane:
  - `apps/api`
  - `apps/admin`
  - `apps/portal`
  - `apps/orchestrator`
  - `apps/llm-gateway`
  - `apps/context-builder`
  - `apps/mcp`
- Data plane:
  - Supabase (`platform` + tenant schemas)
  - Redis/BullMQ
- Edge plane:
  - Traefik v3
  - Cloudflare proxy (recommended)

## App Classification

### Active modules

- `apps/api`
- `apps/admin`
- `apps/portal`
- `apps/orchestrator`
- `apps/llm-gateway`
- `apps/context-builder`
- `apps/mcp`
- `apps/notebooklm-agent`
- `apps/ml`

### Shared packages and runtime state

- `packages/skills` (skills catalog + manifest tooling)
- `runtime/context/system_state.json` (runtime operational state)

### Deprecated/archived modules

- `apps/context-builder-v2` (deprecated, see `.deprecation.yml`)
- `apps/experimental/ai-evolution-archive`
- `apps/experimental/ingestion-service-archive`
- `apps/experimental/mission-control-archive`

## Design Principles

1. Extend existing modules; do not create parallel runtimes.
2. Keep backward compatibility for APIs and queue contracts.
3. Prefer incremental changes validated by type-check/tests.
4. Route AI calls through orchestrator + llm-gateway patterns.

## Hive / SwarmOps Runtime (2026-04-28)

- The orchestrator now includes a Hive coordination layer in `apps/orchestrator/src/hive`.
- Core components:
  - `QueenBee` for objective decomposition and role-based subtask assignment.
  - `HiveStateStore` for shared runtime state in Redis.
  - `PheromoneChannel` for inter-bot signaling via Redis Pub/Sub.
  - Specialized bot roles (`coder`, `researcher`, `tester`, `deployer`, `doc-writer`, `security`).
- Internal control-plane endpoints:
  - `POST /internal/hive/objective`
  - `GET /internal/hive/objective/:taskId`
  - `GET /internal/hive/task/:taskId` (alias)
  - `GET /internal/hive/bots`
  - `GET /internal/hive/stats`
- Security posture: internal Hive endpoints require admin bearer token and initialize Hive handler before operations.

## References

- `VISION.md`
- `AGENTS.md`
- `docs/adr/ADR-031-experimental-consolidation.md`
- `docs/adr/ADR-032-scripts-organization.md`

# Opsly Architecture

## Control plane vs data plane

| Aspect  | Control plane                                          | Data plane                                                       |
| ------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Role    | Billing, tenancy metadata, orchestration, admin API    | Per-tenant n8n, Uptime Kuma, and their persisted volumes         |
| Runs as | Next.js app + workers using BullMQ                     | Docker Compose stacks generated per tenant                       |
| Data    | Supabase `platform` schema, Stripe, Redis job metadata | Tenant Postgres schemas (`tenant_{slug}`), container volumes     |
| Ingress | Traefik → platform host (e.g. `admin.*`)               | Traefik → per-tenant hosts (`n8n-{slug}.*`, `uptime-{slug}.*`)   |
| Scaling | Horizontal app replicas sharing Redis/Supabase         | More tenants → more container sets; port pool limits concurrency |

## Onboarding flow

1. Customer completes Stripe Checkout; Stripe emits `checkout.session.completed`.
2. Next.js webhook route verifies the signature and parses session metadata (slug, plan, email).
3. API creates or updates the tenant row in Supabase with `status = provisioning`.
4. A BullMQ job is enqueued with tenant id, slug, and service list (e.g. n8n, uptime).
5. Worker loads plan defaults and allocates host ports from `platform.port_allocations` (atomic claim of free rows).
6. Worker renders `infra/templates/docker-compose.tenant.tpl` into a tenant compose file under the tenants path.
7. Worker runs `docker compose up` (or equivalent) against the Docker socket to start n8n and Uptime Kuma.
8. Health checks pass; worker sets `status = active` and stores connection metadata.
9. Resend sends the welcome email; Discord webhook posts a summary if configured.
10. Traefik picks up container labels; tenant UIs are reachable on subdomain routes.

## Port allocation strategy

- A reserved pool of rows in `platform.port_allocations` defines candidate host ports per service type.
- On provision, the orchestrator selects rows where `tenant_id` is null, ordered by `port`, and assigns them to the tenant and service name in one transaction per port.
- Published ports in generated compose map `PORT_N8N` and `PORT_UPTIME` to n8n (5678) and Uptime Kuma (3001) internally.
- On suspend or teardown, ports are released by clearing `tenant_id` and resetting the service marker so they return to the free pool.

## Tenant isolation model

- **Postgres:** Logical isolation via dedicated schemas per tenant (`tenant_{slug}`) and RLS policies on shared tables where applicable.
- **Runtime:** Separate Docker networks/volumes per tenant stack; no shared data directories between slugs.
- **Routing:** Distinct Traefik host rules per tenant service; TLS termination at the edge.
- **Secrets:** Tenant-specific n8n encryption and basic-auth material injected at compose generation time.

## Backup strategy

- Nightly or on-demand job (GitHub Actions or cron) runs `scripts/backup-tenants.sh`.
- Active tenants are listed from Supabase (`platform.tenants`); each `tenant_{slug}` schema is dumped with `pg_dump`, gzipped, and uploaded to S3 under `opsly/backups/{UTC-date}/{slug}.sql.gz`.
- Old date prefixes can be pruned per retention policy in the same script.
- Restore uses `scripts/restore-tenant.sh` to pull a dated object from S3 and pipe into `psql` against `DB_CONNECTION_STRING` (run only with operational approval).

## Development environment

```
Developer laptop (Cursor, Node 20, Supabase CLI)
        │
        ├─► Local: apps/web (next dev) + .env or Doppler
        │
        ├─► Optional SSH → older Mac (Colima) for Docker socket parity
        │
        └─► docker compose -f infra/docker-compose.platform.yml (Traefik, Redis, app image)
```

Production mirrors this with a VPS path: GitHub Actions deploys to `/opt/opsly`, rebuilds the app image or pulls `latest`, and restarts the `app` service while Traefik and Redis stay up.

## Multi-Cloud Strategy (Provider Adapter)

Opsly puede orquestar despliegues en cuentas de cliente en **AWS**, **Azure** y **GCP** sin acoplar el control plane a un SDK concreto.

### Patrón Provider Adapter

- **Contrato único:** `CloudProvider` en `apps/api/lib/cloud-providers/interface.ts` define `estimateProvisioningCost`, `provisionResources` y `validateCredentials`.
- **Registro:** `apps/api/lib/cloud-providers/registry.ts` resuelve `getCloudProvider("aws" | "azure" | "gcp")` y cachea instancias. Nuevos proveedores se añaden registrando una clase que implementa la interfaz; las rutas HTTP y la facturación de plataforma no cambian.
- **Implementaciones:** cada proveedor vive en su módulo (p. ej. `aws-provider.ts`). El MVP usa estimaciones fijas o placeholders; la evolución natural es Pricing API / Terraform por proveedor detrás del mismo contrato.

### Cost transparency & authorization

1. El cliente solicita una **cotización** con `POST /api/provisioning/quote` (`provider`, `plan`): la API suma el **coste cloud estimado** (adaptador) y el **fee de gestión Opsly** (`opslyManagementFeeUsd`, configurable con `OPSLY_MANAGEMENT_FEE_USD`).
2. La respuesta incluye `terms` por proveedor y montos en USD; no se persisten credenciales en este paso.
3. El **portal** (`/onboarding/authorize-deployment`) muestra el desglose y exige **checkbox explícito** antes de habilitar “Desplegar Infraestructura”; el despliegue real y el almacenamiento seguro de credenciales son iteraciones posteriores sobre `provisionResources` y flujos de onboarding.

Objetivo: **passthrough de coste de nube** (según uso real del cliente) **+ comisión Opsly**, con **autorización informada** antes de mutar infraestructura en la cuenta del cliente.

## Ingestion Bunker (disaster recovery / recepción)

Si el API principal (`app`, p. ej. en Vercel o el contenedor Next) no está disponible, los webhooks de Stripe y otros eventos **no deben perderse**.

- **Servicio:** `apps/ingestion-service` — Express mínimo, **sin** dependencias de `apps/api`. Usa el **mismo Redis** (`REDIS_URL` / `REDIS_PASSWORD`) que BullMQ en el resto de Opsly.
- **Endpoints:** `POST /ingest/stripe` (cuerpo crudo → cola `webhooks-processing`), `POST /ingest/event` (JSON `{ type, tenantId, data }` → cola `general-events`). Respuestas **202 Accepted** con encolado inmediato.
- **Orquestador:** workers `WebhooksProcessingWorker` y `GeneralEventsWorker` consumen esas colas. El de Stripe **verifica la firma** con `STRIPE_WEBHOOK_SECRET` y reenvía el cuerpo a `OPSLY_API_INTERNAL_URL` (p. ej. `http://app:3000`) en `/api/webhooks/stripe`, donde corre la lógica de negocio existente. Los eventos generales se loguean o se reenvían si `OPSLY_GENERAL_EVENTS_FORWARD_URL` está definida.
- **Despliegue:** compose `ingestion-bunker` en `infra/docker-compose.platform.yml` (host público opcional `ingest.${PLATFORM_DOMAIN}`); alternativa **systemd** en `infra/systemd/ingestion-bunker.service.example`. Ver `apps/ingestion-service/README.md`.

## OpenClaw per-tenant (Context Builder + MCP aislados)

La infraestructura OpenClaw (Context Builder + MCP) puede desplegarse **per-tenant** para agentes IA dedicados, mientras que **Orchestrator** y **LLM Gateway** permanecen centrales.

### Topología

```
                    VPS (Control Plane)
    ┌─────────────────────────────────────────┐
    │                                         │
    │  ┌─────────────────────────────────┐   │
    │  │ Orchestrator (centralizado)     │   │
    │  │ + LLM Gateway (centralizado)    │   │
    │  │ (Redis namespace: global:*)     │   │
    │  └─────────────────────────────────┘   │
    │              │    │                     │
    └──────────────┼────┼─────────────────────┘
                   │    │
         ┌─────────┘    └──────────┐
         │                         │
    ┌────▼─────────┐       ┌──────▼────────┐
    │ Tenant Alice  │       │ Tenant Bob     │
    │ Compose Stack │       │ Compose Stack  │
    │               │       │                │
    │ ┌───────────┐ │       │ ┌───────────┐  │
    │ │Context    │ │       │ │Context    │  │
    │ │Builder    │ │       │ │Builder    │  │
    │ │Port 3012  │ │       │ │Port 3012  │  │
    │ └───────────┘ │       │ └───────────┘  │
    │ ┌───────────┐ │       │ ┌───────────┐  │
    │ │MCP        │ │       │ │MCP        │  │
    │ │Port 3003  │ │       │ │Port 3003  │  │
    │ └───────────┘ │       │ └───────────┘  │
    │               │       │                │
    │ Redis NS:     │       │ Redis NS:      │
    │ tenant_alice  │       │ tenant_bob     │
    │ Schema:       │       │ Schema:        │
    │ tenant_alice  │       │ tenant_bob     │
    └───────────────┘       └────────────────┘
```

### Arquitectura

1. **Orchestrator centralizado**: coordina tareas globales vía BullMQ (redis `global:*` namespace).
2. **LLM Gateway centralizado**: cachea respuestas, enruta a proveedores LLM.
3. **Context Builder per-tenant**: se inicia en cada `docker-compose.tenant.yml`, aislado:
   - Env var: `TENANT_SLUG`, `REDIS_NAMESPACE=tenant_{slug}:openclaw`
   - Accede al schema Supabase `tenant_{slug}`
   - Captura contexto de: workflows n8n, eventos, logs, credenciales
4. **MCP per-tenant**: servidor MCP en cada tenant compose, aislado:
   - Env var: `TENANT_SLUG`, `MCP_PORT=3003`
   - Expone herramientas para agentes IA (leer workflows, ejecutar tareas n8n, etc.)
   - Networking: accesible desde Orchestrator via `mcp-{slug}:3003` (Docker network)

### Aislamiento

| Nivel          | Mecanismo                              | Ejemplo                          |
| -------------- | -------------------------------------- | -------------------------------- |
| **Redis**      | Namespace prefix per-tenant            | `tenant_alice:openclaw:*`        |
| **Supabase**   | Schema aislado per tenant + RLS        | Schema `tenant_alice` con RLS    |
| **Networking** | Docker network aislado per tenant      | Compose network `tenant_alice`   |
| **Secretos**   | Inyectados en Compose via `env_file`   | `secrets/tenant_{slug}.env`      |
| **Logs**       | Etiquetados con `TENANT_SLUG`          | CloudWatch `tenant_slug=alice`   |

### Variables Doppler

Ver `docs/04-infrastructure/DOPPLER-VARS.md` sección "OpenClaw per-tenant variables":

- `OPENCLAW_ENABLED`: habilita framework global
- `OPENCLAW_MODE`: `shared` (centralizado, legacy), `isolated` (per-tenant), `hybrid`
- `CONTEXT_BUILDER_TENANT_AWARE`: boolean
- `LLM_GATEWAY_TENANT_AWARE`: boolean (opcional; por ahora centralizado)

### Decisión de diseño

Ver **ADR-035** para rationale completa, alternativas y plan de rollout.

### Monitoreo

Agregar dimensión `tenant_slug` a métricas:

```
openclaw.context_builder.latency_ms{tenant_slug="alice"}
openclaw.mcp.tool_calls_total{tenant_slug="alice"}
openclaw.redis.namespace_bytes{tenant_slug="alice"}
```

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

## Secure Sandbox Worker

- **Worker:** `apps/orchestrator/src/workers/SandboxWorker.ts`
- **Job type:** `sandbox_execution`
- **Queue:** `openclaw` (consumido por worker dedicado con filtro por nombre de job)
- **Endpoint interno:** `POST /internal/enqueue-sandbox`
- **Status endpoint:** `GET /internal/job/:jobId`

Payload esperado:

```json
{
  "command": "echo hello sandbox",
  "image": "alpine:latest",
  "timeout": 300,
  "allowNetwork": false,
  "tenant_slug": "platform",
  "request_id": "req-123"
}
```

Controles de seguridad:

- Red deshabilitada por defecto (`run-in-sandbox.sh` usa `--network none` salvo `allowNetwork=true`).
- Timeout de ejecución aplicado por worker (máximo 1800s).
- Logs estructurados `worker_start|complete|fail` con worker `sandbox`.

## Research CLI Command

- **CLI:** `tools/cli/main.py`
- **Comando:** `research-run`
- **Fuente de datos:** `POST /v1/search` vía `tools/cli/research_client.py`
- **Salida:** reporte Markdown en `docs/research/` y artefactos opcionales JSON.

Uso:

```bash
python -m tools.cli.main research-run \
  --query "como implementar caching en llm gateway" \
  --tenant platform \
  --depth 2 \
  --save-artifacts
```

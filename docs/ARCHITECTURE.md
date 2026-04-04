# Opsly Architecture

## Control plane vs data plane

| Aspect | Control plane | Data plane |
|--------|---------------|------------|
| Role | Billing, tenancy metadata, orchestration, admin API | Per-tenant n8n, Uptime Kuma, and their persisted volumes |
| Runs as | Next.js app + workers using BullMQ | Docker Compose stacks generated per tenant |
| Data | Supabase `platform` schema, Stripe, Redis job metadata | Tenant Postgres schemas (`tenant_{slug}`), container volumes |
| Ingress | Traefik → platform host (e.g. `admin.*`) | Traefik → per-tenant hosts (`n8n-{slug}.*`, `uptime-{slug}.*`) |
| Scaling | Horizontal app replicas sharing Redis/Supabase | More tenants → more container sets; port pool limits concurrency |

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

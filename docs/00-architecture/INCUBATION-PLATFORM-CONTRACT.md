---
status: draft
owner: operations
last_review: 2026-05-25
type: architecture
tags:
  - opsly/architecture
---

# Incubation Platform Contract

Opsly is the incubation platform and control plane for future client platforms.
This first increment is read-only and keeps the current infrastructure model intact
(`docker compose`, Traefik, Redis, Supabase, no Kubernetes).

## Canonical contract

### Tenant lifecycle

- `incubated_tenant`
- `mvp_validation`
- `operational_stabilization`
- `dedicated_vps`
- `independent_platform`
- `connected_client_platform`

### Read model endpoints

- `GET /api/admin/mission-control`
- `GET /api/admin/mission-control/incubation`
- `GET /api/admin/agents`
- `GET /api/admin/tenants/registry`

### Data sources

- `config/platform-foundation.json`
- `config/opsly.config.json`
- `config/tenants/*.json`
- `config/agents-team.json`
- `config/agent-services.json`
- `config/agent-capabilities.json`

## What this increment does

- Defines the canonical tenant model.
- Defines a governed agent registry.
- Adds read-only health and readiness reporting.
- Exposes Mission Control as a read model.
- Adds an incubation machine view for per-tenant project plans.
- Keeps provisioning as a skeleton only.

## What this increment does not do

- No production deployment.
- No live tenant migration.
- No autonomous self-healing.
- No new control plane.
- No new infrastructure layer.

## Operating rules

- Approval-first AI.
- Workflow-first execution.
- Tenant-scoped operations only.
- Read models first, mutations later.
- Reversible by design.

# Opsly product consolidation registry

**Status:** Canonical operating guidance  
**Last reviewed:** 2026-08-28

Opsly is the reusable control plane; Peskids is the first real operating
tenant; Content Studio and Franchise Core are reusable capabilities. Agents
and workers execute approved work but never own business state.

## Canonical ownership

| Component | Classification | Responsibility |
| --- | --- | --- |
| `apps/peskids` | CANONICAL | Peskids product, auth entrypoint and admin UX |
| `apps/api` | CANONICAL | Shared APIs, tenant context and platform services |
| `apps/admin` | CANONICAL | Opsly operator UX and reusable Creator UX |
| `lib/franchise-core` | CANONICAL CAPABILITY | Franchise contracts and domain rules |
| `lib/content-studio` | CANONICAL CAPABILITY | Content projects, rights, approvals and provider adapters |
| `apps/orchestrator` | ACTIVE_SUPPORTING | BullMQ jobs and specialized workers |
| `apps/llm-gateway` | CANONICAL SUPPORTING | Model routing, cost and provider boundary |
| `apps/context-builder` | CANONICAL SUPPORTING | Governed repository/session context |
| `apps/mcp` | ACTIVE_SUPPORTING | Governed tools for agents and operators |
| `apps/agent-manager` | ACTIVE_SUPPORTING | Agent registry/lifecycle only |
| `apps/experimental/*` | ARCHIVE | Historical experiments; not production runtime |
| `infra/docker-compose.platform.yml` | CANONICAL_PRODUCTION | Main control-plane composition |
| `infra/docker-compose.local.yml` | CANONICAL_LOCAL | Local development composition |
| `infra/docker-compose.workers.yml` | CANONICAL_WORKER | Remote/ephemeral worker composition |

`task-orchestrator`, `context-builder-v2`, Hermes and alternative Compose
stacks require explicit classification before reuse. They must not become a
second production brain or execution path.

## Canonical execution path

```text
Peskids / Admin
  → Supabase session
  → tenant + unit context
  → authenticated API/domain service
  → Supabase/Postgres + RLS
  → domain event → BullMQ
  → OpenClaw / orchestrator
  → specialized worker
  → governed provider adapter
  → canonical state → Peskids UI
```

Rules:

- UI filtering is never authorization.
- Tenant, role and unit scope are resolved server-side.
- Agents and workers receive `tenant_slug`, `request_id` and minimum input.
- LLM traffic goes through the LLM Gateway.
- No new app, auth system, queue, database, orchestrator or Compose file is
  allowed unless the canonical path is proven insufficient in an ADR.

## Agent decision contract

Before changing code, an agent must identify the user-visible flow it
completes, secures, measures or unblocks; the existing canonical owner; and
the smallest testable delta. If these are unclear, the agent documents the gap
instead of creating infrastructure.

## Product flows

```text
Franchise: Candidate → Approval → Franchisee → Proposed Unit
           → Territory Review → Agreement Readiness → Opening Readiness

Marketing: Campaign → Content Project → Generate → Rights Review
           → Render → Visual Review → Human Approval → Export Ready
```

Undefined commercial, legal, payment and publication outcomes remain gated and
are represented as `PENDING`, `UNKNOWN` or `NOT_CONNECTED`.

## Compose governance

Every new Compose file requires an ADR with purpose, owner, environment,
difference from the canonical platform and lifecycle. Existing files are not
deleted by this registry; they are classified before reuse.


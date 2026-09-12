---
status: accepted
owner: architecture
last_review: 2026-09-11
type: adr
tags:
  - opsly/adr
  - opsly/crm
  - opsly/open-source
---

# ADR-042: Twenty is the canonical CRM

## Decision

Opsly standardizes on **Twenty CRM** as the canonical CRM for new implementations.

- Twenty = CRM system of record for commercial contacts/opportunities.
- Supabase/Opsly = operational application state.
- n8n = automation/integration glue.
- WhatsApp inbox remains a separate capability (wacrm/other approved OSS provider).
- GoHighLevel is **legacy migration history only** and must not be reintroduced into new runtime paths.

## Open-source integration model

Twenty is treated as an external open-source service, not vendored into the Opsly monorepo.

Canonical layout:

```
cloudsysops/opsly
~/.opsly/external-services/
└── twenty/
```

Opsly keeps:
- Docker Compose / deployment manifests
- adapters and API clients
- tenant configuration
- migrations for external IDs
- runbooks
- smoke tests
- version/tag/SHA pinning

Opsly does not copy the full Twenty source tree into this repository.

## Fork policy

Do **not** fork Twenty by default.

A fork is justified only when:
1. the requirement cannot be implemented via Twenty configuration, API, SDK/app model, workflows, or a thin Opsly adapter;
2. the patch is strategically important and maintainable;
3. license obligations have been reviewed;
4. upstream contribution is considered first where appropriate.

If a fork is required, create a dedicated repository such as:
`cloudsysops/twenty-opsly`, preserving upstream attribution/license.

## Runtime ownership

Twenty must not become a second Opsly orchestrator.

```
Opsly Control Plane
  ├─ AgentTask / BullMQ
  ├─ Policy / approvals
  ├─ Mission Control
  └─ Revenue workflows
          ↓
      Twenty API
          ↓
People / Companies / Opportunities
```

Twenty owns CRM UX/data for sales objects. Opsly owns orchestration, agent execution, approvals, business logic and cross-system analytics.

## GHL policy

GoHighLevel references may remain only in:
- historical migration docs
- legacy database migration history
- archived import/export procedures

They must be explicitly labelled `LEGACY/EOL` and must not be presented as an active provider option.

## Product implication

New client blueprints use:

```
crm_provider = twenty
```

or, for very small deployments:

```
crm_provider = supabase-only
```

No new GHL provider path is allowed without a new ADR.

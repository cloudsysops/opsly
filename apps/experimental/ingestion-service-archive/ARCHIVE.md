---
status: draft
owner: operations
last_review: 2026-05-24
type: app-doc
tags:
  - opsly/app
---

# ingestion-service Archive

Archived on 2026-04-24 per ADR-031.

## Why archived

- Module was exploratory and outside the active deploy path.
- Not currently required by production workflows.

## How to revive

1. Reintroduce as an active app in `apps/`.
2. Validate container build and runtime health.
3. Add CI coverage for build/test.
4. Document ownership and scope before reactivation.

---

## Enlaces relacionados

- [[apps/experimental/ingestion-service-archive/README|ingestion-service-archive]]
- [[README|Inicio]]

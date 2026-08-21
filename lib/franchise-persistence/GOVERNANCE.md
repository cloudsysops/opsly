---
title: "lib/franchise-persistence Governance"
---

# lib/franchise-persistence

Adapter: Postgres/Supabase for `@intcloudsysops/franchise-core`.

- No Peskids swim/CRM/payment-processor logic.
- Every query is tenant-scoped via `FranchiseActor.tenantId` resolved from auth, never from an untrusted body field alone.
- Royalty calculations remain immutable (0098 trigger + 0099 authenticated UPDATE deny).
- Opening checklists/tasks persist in 0100; activation is gated by `canActivateUnit`. Reminder events are contracts only (no n8n).

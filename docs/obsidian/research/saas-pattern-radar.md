---
status: evergreen
owner: operations
last_review: 2026-05-22
type: claim
tags:
  - claim
  - verified
  - opsly/saas
confidence: alta
related_sources:
  - obsidian/sources/saas-pattern-sources.md
---

# SaaS Pattern Radar

> The best SaaS repos repeat the same formula: landing, login, tenant, billing,
> audit, support, and a clean exit path.

## What to copy

- Marketing shell with clear value proposition.
- Authentication with invite flows for staff and simple sign-up for customers.
- RBAC with owner/admin/member/support roles.
- Billing and customer portal.
- Custom domains and white-label packaging.
- Admin dashboards with audit logs and operational actions.
- Session replay and analytics for troubleshooting and activation.

## What not to copy

- Hardcoded vendor assumptions that make migration painful.
- Product UI that hides operational controls.
- Shared credentials for staff.
- Unbounded feature scope without an exit model.

## Why it matters to Opsly

- Peskids can become a repeatable tenant package.
- Opsly can sell setup + managed operations.
- Future client platforms can be shipped from the same blueprint.

## Connections

- [[obsidian/research/pattern-constellation]]
- [[brain/agents/README]]
- [[brain/tenants/README]]
- [[brain/workflows/README]]


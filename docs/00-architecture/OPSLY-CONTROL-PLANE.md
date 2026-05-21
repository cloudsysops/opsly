---
status: canon
owner: architecture
last_review: 2026-05-21
---

# Opsly Control Plane

Opsly is the control plane for tenant incubation, provisioning, governance, and
agent coordination. It is not the long-term owner of tenant business data or
customer runtime infrastructure.

## Opsly Responsibilities

- Provision VPS environments for tenants.
- Monitor tenant health and service availability.
- Deploy tenant templates and automation packs.
- Manage the automation catalog.
- Coordinate AI agents and worker services.
- Maintain guardrails, auditability, and handoff records.
- Keep the shared platform and the tenant lifecycle consistent.

## Tenant Responsibilities

- Run business operations.
- Own business data.
- Own the domain when extracted.
- Approve go-live and extraction decisions.
- Maintain the commercial relationship and operating rules.

## Boundary Rules

- Opsly core stays shared.
- Tenant runtime can be moved, cloned, or retired independently.
- Shared control plane services do not migrate into tenant ownership.
- Tenant-specific credentials and integrations must remain isolated.

## Operating Model

- Incubate inside Opsly.
- Validate with real usage.
- Extract only when justified.
- Provision dedicated VPS from a standard template.
- Keep Opsly as the provisioning and governance layer.

## Agent Coordination

Opsly coordinates execution through role-based agents:

- planner.
- executor.
- reviewer/security.
- QA/browser.
- deploy/operator.
- docs/handoff.

All agent jobs must include tenant context and request tracking.


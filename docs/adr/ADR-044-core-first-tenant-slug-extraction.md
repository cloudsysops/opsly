---
status: draft
owner: architecture
last_review: 2026-05-25
type: adr
tags:
  - opsly/adr
---

# ADR-044 — Core-first multi-tenant development with `tenant_slug` activation and clean extraction

## Estado

Proposed / accepted operationally in repo policy on 2026-05-25.

## Arquitectos

- Claude
- Codex

## Contexto

Opsly incubates new tenants inside the shared control plane and shared VPS first.
As more tenants arrive, we need a default development pattern that avoids
tenant-specific forks for reusable capabilities.

Problems we want to prevent:

1. Repeating the same feature as `if tenant === "peskids"` logic across apps.
2. Building code that only works for one tenant and is expensive to reuse later.
3. Delaying extraction readiness until the tenant is already too coupled to Opsly.

We need one rule that works for:

- onboarding
- auth surfaces
- invitations
- marketplace/capabilities
- dashboards and workflows
- future tenant extraction to a dedicated VPS

## Decision

Build reusable capabilities once in Opsly core, activate them by `tenant_slug`,
and keep the product contract portable so a mature tenant can move to a
dedicated VPS with minimal code changes.

### Required pattern

1. Implement shared capability in Opsly core.
2. Configure tenant-specific behavior by `tenant_slug` and capability metadata.
3. Use branding, content, URLs, and permissions as tenant-specific layers.
4. Keep business logic reusable and avoid permanent per-tenant forks.
5. When the tenant proves stable usage and business value, extract to dedicated
   VPS using the same product contract.

### Allowed tenant-specific differences

- Branding and copy
- Login surface and public URLs
- Capability flags
- Data and permissions
- Deployment mode (`incubated` vs `dedicated`)

### Not allowed

- Permanent duplicated implementation for reusable features
- Hardcoded tenant branches as the primary architecture
- Building new features only inside one tenant app when the feature is clearly reusable

## Consequences

### Positive

- New tenants can reuse the same feature set with config only.
- Extraction path stays clean because the contract already exists in core.
- Operational docs, diagrams, and code can stay aligned around one rule.
- Tenant growth becomes a config + deployment problem, not a rewrite.

### Negative

- Requires more discipline up front.
- Core abstractions must be designed carefully to avoid over-generalization.
- Some tenant work will feel slower initially because we favor reuse and extractability.

### Mitigations

- Keep increment size small.
- Add `tenant_slug` tests at the helper layer.
- Document new capabilities in architecture docs before tenant-specific code lands.
- When a tenant needs a dedicated VPS, use extraction checklists instead of local hacks.

## Operational Rules

- Any reusable feature request should start in Opsly core.
- Any tenant-specific activation must be keyed by `tenant_slug`.
- Any extraction candidate must already have a shared implementation.
- Any new tenant must be added by configuration and capability registration, not by fork.

## Related Documents

- `AGENTS.md`
- `docs/01-development/MODULARITY-CONTRACT.md`
- `docs/01-development/VISION.md`
- `docs/00-architecture/TENANT-INCUBATION-LIFECYCLE.md`
- `docs/00-architecture/ARCHITECTURE.md`
- `docs/00-architecture/README.md`

## Referencias

- ADR-001: Docker Compose por tenant
- ADR-028: Patrón de onboarding por tenant
- ADR-029: Infraestructura compartida vs dedicada
- ADR-035: OpenClaw per-tenant

---

## Enlaces relacionados

- [[adr/README|adr]]
- [[brain/README|Brain Central]]

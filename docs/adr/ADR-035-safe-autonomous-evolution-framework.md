---
status: proposed
date: 2026-04-26
decision-makers:
  - operations
  - platform
---

# ADR-035 — SAFE-AEF (Safe Autonomous Evolution Framework)

## Context

Opsly already has:

- BullMQ orchestration in `apps/orchestrator`
- LLM routing and metering in `apps/llm-gateway`
- Canonical runtime context in `AGENTS.md` and `docs/01-development/VISION.md`

Current limitation is proactive autonomy with strict safety:

1. Research exists but is not standardized as a governance workflow.
2. Sandbox execution exists as scripts, not as first-class orchestrator jobs.
3. Self-evolution loops are partially implemented in CLI, not formalized in runtime contract.

## Decision

Adopt SAFE-AEF Phase 1 with four bounded capabilities:

1. **Research Tooling**
   - Add gateway-level research entrypoint (`web-search-tool`) for controlled external discovery.
2. **Sandbox Execution Path**
   - Add orchestrator `evolution-worker` stub that only runs in `dry-run` by default.
   - Any future destructive action must require human approval.
3. **Autonomy Policy**
   - Introduce a dedicated policy document for autonomous execution constraints.
4. **Operational Traceability**
   - Every autonomy action must carry `tenant_slug`, `request_id`, and `pipeline_stage`.

## Scope (Phase 1)

- Produce ADR and stubs only.
- Do not enable unattended destructive execution.
- Keep backward compatibility with existing jobs and workers.

## Non-Goals

- Full autonomous merge-to-main.
- Public sandbox endpoints.
- Replacing Compose control plane with Kubernetes.

## Security Constraints

- Sandbox default network mode is isolated (no implicit internal network access).
- Secrets are never emitted in logs.
- Autonomy workers run low priority and can be disabled with feature flags.
- Human approval remains mandatory before prod-impacting operations.

## Consequences

### Positive

- Clear architecture baseline for safe autonomy.
- Incremental adoption without breaking current production paths.
- Better auditability for autonomous proposals.

### Negative

- Additional operational complexity for policy and approval workflows.
- More configuration overhead (`feature flags`, `service accounts`, `secrets`).

## Rollout Plan

1. Add stubs (`web-search-tool`, `evolution-worker`, sandbox image base).
2. Validate with `type-check` + unit tests in touched workspaces.
3. Introduce guarded queue wiring in a separate ADR-linked increment.

## Related

- `docs/reports/AUTONOMY-GAP-ANALYSIS-2026-04-26.md`
- `docs/design/OAR.md`
- `docs/adr/ADR-027-hybrid-compute-plane-k8s.md`

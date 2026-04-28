---
status: proposed
date: 2026-04-27
decision-makers:
  - operations
  - platform
---

# ADR-036 — CLI Consolidation (`tools/cli` first, `apps/cli` later)

## Context

Opsly already has an operational CLI in `tools/cli` that covers critical autonomous flows
(`research-run`, orchestrator bridge, reporting helpers). A parallel `apps/cli` package does not
exist yet as a stable workspace and introducing it now would duplicate commands and maintenance.

Current constraints:

1. Autonomy rollout is in an incremental phase and already has active blockers (`llm-gateway`
   availability in local runtime).
2. We need a single source of truth for command behavior while security and runtime workflows
   stabilize.
3. The roadmap favors extension over re-architecture.

## Decision

Adopt a two-step CLI strategy:

1. **Now (default path):** keep `tools/cli` as canonical CLI implementation.
2. **Later (gated migration):** create `apps/cli` only after explicit readiness criteria are met.

No dual-write phase with independent command implementations is allowed.

## Why this decision

### Positive

- Prevents command drift and duplicated fixes.
- Reduces operational risk during autonomy activation.
- Keeps onboarding and runbooks consistent with current runtime.

### Trade-offs

- `tools/cli` remains in a non-workspace location for now.
- Packaging/distribution concerns are deferred until readiness.

## Readiness criteria to open `apps/cli`

All must be true:

1. `tools/cli` command contract documented (inputs, outputs, error codes).
2. Tests for critical commands are green in CI.
3. Release/versioning policy defined (semver + changelog).
4. Backward-compatibility shim plan defined.
5. Security review approved for command execution and bridge endpoints.

## Migration guardrails

When migration starts:

1. Build `apps/cli` as the only implementation target.
2. Convert `tools/cli` into a wrapper/delegator during transition.
3. Keep command names/flags backward compatible for at least one cycle.
4. Remove wrapper only after docs, runbooks, and automations are updated.

## Non-goals

- Creating `apps/cli` immediately without criteria.
- Maintaining two independent command implementations.
- Breaking existing scripts that call `tools/cli`.

## Related

- `docs/adr/ADR-035-safe-autonomous-evolution-framework.md`
- `docs/plans/AUTONOMOUS-EXECUTION-PLAN-2026-04-27.md`

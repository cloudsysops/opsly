# AUTONOMY GAP ANALYSIS — 2026-04-26

## Scope

Step 1 of SAFE-AEF (Gap Analysis) using current source of truth:

- `AGENTS.md`
- `docs/01-development/VISION.md`

## Executive Diagnosis

Opsly has strong orchestration foundations (BullMQ, LLM Gateway, structured logs, tenant-aware metadata), but remains mostly reactive. The three critical gaps blocking autonomous development are:

1. Controlled external research loop is incomplete.
2. Sandbox execution is not yet orchestrator-native.
3. Autonomous planning/evolution loop is not yet first-class in runtime governance.

## Gap 1 — External Research as a Governed Capability

### Current state

- Vision requires progressive autonomy and research-oriented agents.
- Existing stack has LLM Gateway + MCP + skills, but no fully standardized research workflow in orchestrator policy.
- `POST /v1/search` exists in gateway as a new base capability (feature-gated), and `opsly-researcher` skill exists, but governance contract is still partial.

### Why this blocks autonomy

Without a deterministic, auditable research path (query -> source scoring -> report artifact), autonomous agents cannot safely justify architectural/code decisions.

### Risk level

High (decision quality + traceability risk).

## Gap 2 — Safe Sandbox Execution Not Integrated into Core Job Graph

### Current state

- `scripts/run-in-sandbox.sh` exists and supports isolated execution (`--network none` default).
- Orchestrator supports rich job metadata and queue priority by plan.
- No dedicated `sandbox_execution` job type/worker lifecycle in orchestrator yet.

### Why this blocks autonomy

Autonomous installation/testing without first-class sandbox jobs forces ad-hoc execution paths and reduces enforceable policy controls (tenant, request_id, approvals, rollback).

### Risk level

Critical (security and blast-radius risk).

## Gap 3 — Autonomous Evolution Loop Lacks Formal Runtime Contract

### Current state

- OAR direction exists (`docs/design/OAR.md`) and AGENTS documents gradual autonomy.
- CLI-level evolution/proposal tools exist, but no canonical orchestrator contract for:
  - periodic gap analysis jobs,
  - proposal generation jobs,
  - approval-gated promotion jobs,
  - state persistence + audit trail as standard events.

### Why this blocks autonomy

Without a formal runtime contract, self-improvement remains experimental/manual and cannot scale safely across tenants/environments.

### Risk level

High (operational consistency + governance risk).

## Prioritized Order (for next phase design)

1. Gap 2 (Sandbox in orchestrator)
2. Gap 1 (Research workflow hardening)
3. Gap 3 (Formal evolution protocol in orchestrator/runtime)

## Approval Gate

This report completes SAFE-AEF Step 1.

Requested approval to proceed to Step 2 (Architecture Design) for:

- ADR draft for SAFE-AEF,
- orchestrator stubs (`sandbox_execution`, `evolution_worker`),
- security policy document for autonomous execution.

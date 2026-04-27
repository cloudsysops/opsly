# Security Policy — Autonomous Execution (SAFE-AEF Phase 1)

## Purpose

Define hard safety boundaries for autonomous research, sandbox execution, and proposal generation in Opsly.

## Mandatory Principles

- Zero-Trust by default.
- Human approval required for production-impacting actions.
- Backward compatibility with existing tenant/deploy flows.
- No secret exposure in logs, prompts, or generated artifacts.

## Allowed Autonomous Actions (Phase 1)

- Read-only analysis of repo state and docs.
- External research queries through approved gateway tools.
- Sandbox execution in isolated runtime for validation.
- Draft PR proposal generation (without auto-merge).

## Forbidden Autonomous Actions (Phase 1)

- Direct mutation of production infrastructure without approval.
- Direct write to secret stores unless explicitly approved and audited.
- Network access from sandbox to internal private planes by default.
- Destructive commands (`rm -rf`, forced resets, data drops) without explicit human authorization.

## Sandbox Requirements

- Default isolated networking.
- Ephemeral filesystem unless explicitly persisted.
- Non-root user for command execution.
- Runtime timeout and resource caps must be enforced in deployment layer.

## Traceability Requirements

Every autonomous action must include:

- `tenant_slug`
- `request_id`
- `pipeline_stage`
- execution timestamp

and must be emitted in structured logs.

## Approval Gates

- `sandbox`: automatic gate with tests/policy checks.
- `qa`: automatic + policy checks.
- `prod`: mandatory human approval.

## Incident Response

If an autonomy workflow violates policy:

1. Stop corresponding worker/queue immediately.
2. Collect logs by `request_id`.
3. Open incident report.
4. Add preventive rule before re-enabling.

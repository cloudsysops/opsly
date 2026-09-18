---
id: cloudflare-r2-agent-evidence-036
status: pending
owner: opencode-builder
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Cloudflare R2 — AgentTask evidence store

## Goal
Add Cloudflare R2 as the canonical object store for bounded AgentTask evidence/artifacts without changing BullMQ, Session Manager, or the control plane.

## Architecture
AgentTask -> ephemeral runtime -> sanitized evidence bundle -> R2 -> metadata/reference persisted by Opsly.

## Deliver
- storage adapter/interface for evidence objects
- R2/S3-compatible implementation
- deterministic object key scheme by tenant/task/runtime
- upload of evidence.json, test-results, bounded logs and optional artifacts
- retention metadata and content-type handling
- secret/config contract via Doppler
- dry-run/local fake adapter for tests only
- tests for redaction, path bounding, upload failure and retry behavior
- runbook for bucket creation, credentials, CORS and verification

## Guardrails
- no second queue or orchestrator
- no raw secrets, env dumps, tokens or unrestricted stdout
- no public bucket by default
- do not move transactional data from Supabase
- do not store runtime temp execution configs after completion

## Acceptance
- successful task can return an R2 evidence reference
- failed upload does not mark task evidence as successful
- object keys cannot escape tenant/task namespace
- idle/runtime execution model from #1216 remains unchanged

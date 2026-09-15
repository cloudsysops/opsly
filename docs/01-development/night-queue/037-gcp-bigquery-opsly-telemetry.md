---
id: gcp-bigquery-opsly-telemetry-037
status: pending
owner: opencode-builder
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# GCP BigQuery — Opsly telemetry sink

## Goal
Use BigQuery for historical Opsly telemetry/analytics while keeping Redis/BullMQ transient and Supabase transactional.

## Existing config to reuse
- GOOGLE_CLOUD_PROJECT_ID
- BIGQUERY_DATASET
- VERTEX_AI_REGION
- existing @intcloudsysops/telemetry package

## Deliver
- append-only telemetry sink behind existing telemetry abstraction
- schema for task lifecycle, runtime, node, tenant-safe dimensions, latency, result and evidence reference
- batched/non-blocking writes
- explicit disabled-by-default config
- retry/dead-letter behavior using existing mechanisms only
- cost/volume guardrails
- tests with mocked GCP client
- runbook to create dataset/table/service account and validate writes

## Guardrails
- BigQuery is analytics, not transactional state
- no prompt bodies, secrets, raw PII or unrestricted logs
- telemetry failure must not break task execution
- no new queue/orchestrator
- keep Doppler as canonical secret source

## Acceptance
- task completion emits a bounded telemetry event
- disabled/misconfigured GCP fails soft with observable warning
- schema is versioned
- tenant/task identifiers are safe and documented

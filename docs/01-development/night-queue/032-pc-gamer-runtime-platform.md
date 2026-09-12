---
id: pc-gamer-runtime-platform-032
status: pending
owner: opencode-builder
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Subagent A — PC Gamer Platform Runtime

## Role
Temporary builder role on existing workers. Do not create a new agent service.

## Goal
Make the existing PC Gamer compute node reliably claim Opsly jobs.

## Reuse
- config/compute-workers.json
- scripts/ops/compute-worker-router.mjs
- scripts/ops/board-assign-gpu-job.mjs
- scripts/ops/pc-gamer-heartbeat.sh
- Mission Control ComputeWorkersPanel
- existing BullMQ queues

## Deliver
- persistent worker bootstrap for pc-gamer-openclaw-01
- heartbeat freshness and activeJobs reporting
- local-only inference smoke
- media job smoke
- exact operator bootstrap command
- tests

## Prohibited
- new queue
- second orchestrator
- production DB access
- release authority
- public Redis/Ollama ports

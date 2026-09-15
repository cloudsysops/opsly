# Opsly Multi-Cloud Free-Tier Implementation — Master Execution Prompt

You are implementing the approved Opsly multi-cloud expansion. Do not redesign the core architecture.

## Canonical architecture invariants

Opsly keeps ONE control plane:
- DigitalOcean VPS = control plane / API / orchestrator
- Redis + BullMQ = canonical queues and transient execution state
- Supabase = transactional application data
- Mac + PC Gamer = execution nodes
- Session Manager = canonical ephemeral runtime lifecycle
- Doppler = canonical secret source

New cloud roles are intentionally narrow:
- Cloudflare R2 = AgentTask evidence/artifacts
- GCP BigQuery = analytics/telemetry only
- GCP Cloud Run = stateless integrations only
- Oracle Cloud = DR observer / encrypted backup receiver only

Never introduce:
- a second queue
- a second orchestrator
- a second active control plane
- persistent AI runtimes in cloud services
- transactional database migration just to consume free tier
- public Redis/database ports
- secrets in code, logs, prompts, evidence, or Terraform state

## Parallel workstreams

Execute these independently where possible:

1. #1228
   Workpack: docs/01-development/night-queue/036-cloudflare-r2-agent-evidence.md

2. #1229
   Workpack: docs/01-development/night-queue/037-gcp-bigquery-opsly-telemetry.md

3. #1230
   Workpack: docs/01-development/night-queue/038-cloud-run-stateless-integrations.md

4. #1231
   Workpack: docs/01-development/night-queue/039-oracle-dr-observer.md

5. #1232
   Review: docs/01-development/night-queue/040-multicloud-free-tier-governance.md

Epic: #1233

## Execution rules

For each implementation lane:
1. inspect existing abstractions before creating new ones;
2. reuse existing telemetry/storage/config/error patterns;
3. implement the minimum viable adapter/service;
4. add unit tests and failure-path tests;
5. add operator runbook and exact validation commands;
6. keep feature disabled by default until required configuration is present;
7. fail independently: cloud outage must not break core task execution;
8. produce a PR with explicit evidence.

## Required evidence per PR

Return:
- files changed
- tests executed + result
- config/secrets required (names only, never values)
- exact local smoke command
- exact cloud smoke command if credentials are available
- cost/free-tier assumptions that still need operator verification
- security risks
- rollback procedure
- confirmation that no second queue/orchestrator/control plane was added

## Completion gate

Do not declare production-ready until #1232 governance review reports no blocking duplication/security finding.

Start with #1228 and #1229 in parallel because they provide immediate value and are the least coupled to the control plane.

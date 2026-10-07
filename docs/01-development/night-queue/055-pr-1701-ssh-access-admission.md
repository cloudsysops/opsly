---
id: pr-1701-ssh-access-admission-055
status: pending
priority: P1
agent: local_hermes
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
workstream: pr-1701-ssh-access
conflict_key: opsly/pr-1701/ssh-access
semantic_scope: opsly/pr-1701/ssh-access/admission-055
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 10
resource_class: small
node_types: gamer
architecture_patterns: AgentTaskEnvelopeV1, BullMQ, Hermes, GitHub Agent Queue, dispatch-claim-v1
affected_paths: []
depends_on: []
---

# PR #1701 SSH Access — Canonical Admission Proof

## Goal

Prove Software Factory admission for `conflict_key=opsly/pr-1701/ssh-access` through the governed path:

`night-queue workpack → github-agent-queue-submit → POST /api/local/prompt-submit → BullMQ local-agents → eligible gamer worker claim`

## Why requires_pr=false

`requires_pr=true` is hard-denied by GitHub Agent Queue (`not eligible for autonomous GitHub dispatch yet`). PR #1701 being open does **not** unlock that gate. This admission workpack is intentionally `requires_pr: false` so the control plane can enqueue and claim without bypassing governance.

## Preconditions

If any precondition is missing, return `BLOCKED` with the exact missing item and do not fall back:

- Gamer worker `home-gpu-01` is online;
- `local_hermes` is claimed by the Gamer, not Mac;
- Hermes bridge `:5007` is healthy with auth configured;
- governed task contains `AgentTaskEnvelopeV1`;
- no paid provider fallback is enabled;
- no merge, deploy, DNS, n8n, OBS, or secret changes.

## Task

Read-only inspection only. Do not edit files, install packages, change configuration, start persistent services, merge, or deploy.

1. Confirm hostname / worker identity aligns with `smdqcia-pc` / `home-gpu-01`.
2. Confirm Hermes bridge health is reachable from the worker environment.
3. Confirm this job was received via the governed `local-agents` queue (not a manual paste).

Return exactly this marker on successful runtime output:

`PR1701_SSH_ADMISSION_OK`

## Hard boundaries

- Read-only task.
- No repository mutation.
- No merge / deploy / production changes.
- No forced claims or new queues.
- No Mac fallback.
- No paid API fallback.

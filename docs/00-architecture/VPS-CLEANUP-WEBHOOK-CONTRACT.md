---
status: draft
owner: operations
last_review: 2026-06-05
type: architecture
tags:
  - opsly/architecture
  - opsly/webhook
---

# VPS Cleanup Webhook Contract

Opsly receives infrastructure cleanup alerts as structured events.
The goal is to normalize the event, classify risk, and keep any dangerous action
behind approval-first boundaries.

## Event purpose

- Detect cleanup candidates after a Discord alert, monitor event, or n8n webhook.
- Separate reversible host cleanup from risky tenant or data operations.
- Keep automatic cleanup limited to safe, reversible actions.

## Canonical payload

Use [`config/vps-cleanup-webhook.schema.json`](../../config/vps-cleanup-webhook.schema.json).

Required fields:

- `source`
- `alert_type = vps_cleanup_request`
- `severity`
- `vps`
- `service`
- `message`
- `timestamp`

Optional fields:

- `tenant_slug`
- `requested_cleanup`
- `signals`
- `runbook_ref`

## Decision rules

- `safe-auto`: only host-level reversible cleanup is requested and no tenant-scoped action is present.
- `approval-required`: tenant-scoped cleanup, risky cleanup, or critical severity.
- `observe-only`: nothing safe to execute automatically.

## Safe actions

- `logs`
- `images`
- `stopped_containers`
- `unused_networks`

## Risky actions

- `volumes`

## API entrypoint

- `POST /api/admin/mission-control/vps-cleanup`

Authentication:

- Admin session, or
- `x-opsly-webhook-secret` matching `OPSLY_VPS_CLEANUP_WEBHOOK_SECRET`

## Expected behavior

- Normalize the event.
- Return a decision and suggested cleanup actions.
- Do not delete tenant data automatically.
- Do not prune volumes automatically.

## Next step

Wire the safe-auto branch to a dedicated cleanup executor only after approval
rules and host scope are verified on the VPS.

---
status: draft
owner: operations
last_review: 2026-06-05
type: runbook
tags:
  - opsly/runbook
---

# Runbook - VPS Cleanup Webhook

Use this runbook when a Discord alert or monitor event asks for VPS cleanup.

## What it does

- Validates the cleanup event.
- Classifies it as safe auto-cleanup, approval-required, or observe-only.
- Keeps tenant-scoped or risky cleanup behind approval.

## Webhook payload

Use the schema at [`../../config/vps-cleanup-webhook.schema.json`](../../config/vps-cleanup-webhook.schema.json).

Minimum payload:

```json
{
  "source": "discord",
  "alert_type": "vps_cleanup_request",
  "severity": "warning",
  "vps": "vps-dragon",
  "service": "docker",
  "message": "Limpieza en VPS",
  "timestamp": "2026-06-05T10:00:00.000Z"
}
```

## API call

```bash
curl -X POST https://api.op-sly.com/api/admin/mission-control/vps-cleanup \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Webhook-Secret: <secret>" \
  -d @cleanup-event.json
```

## Safe auto cleanup

- `logs`
- `images`
- `stopped_containers`
- `unused_networks`

## Always approval-required

- Any `tenant_slug`
- `volumes`
- `critical` severity

## Suggested response

- `safe-auto`: execute only reversible host cleanup.
- `approval-required`: open Mission Control approval queue.
- `observe-only`: keep monitoring, do not change state.

## Troubleshooting

- If the endpoint returns 403, verify the webhook secret.
- If the payload is rejected, validate it against the JSON schema.
- If the event requests volumes, treat it as approval-required.

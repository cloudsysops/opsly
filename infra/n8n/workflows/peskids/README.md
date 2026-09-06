# Peskids n8n workflows (canonical Pro exports)

Source of truth for **Peskids Pro 1.0** automation exports.

| Workflow | File | Default `active` |
|----------|------|------------------|
| Hot lead (event webhook) | `peskids-hot-lead-alert-webhook.json` | `false` |
| Daily digest + Discord gate | `peskids-daily-digest.json` | `false` |
| Operational notify | `peskids-operational-notify.json` | `false` |
| Lead aging scan 24h/48h | `peskids-lead-aging-scan.json` | `false` |

Legacy / fuller catalog remains in `.n8n/1-workflows/peskids/` (including the older
5-minute poll hot-lead that queried `public.leads`). Prefer these Pro exports for
new installs.

## Install

```bash
./scripts/install-peskids-n8n-workflows.sh --dry-run
# Prefer Pro catalog:
PESKIDS_N8N_WORKFLOWS_DIR=infra/n8n/workflows/peskids \
  ./scripts/install-peskids-n8n-workflows.sh --dry-run
```

Do **not** activate in production until Doppler flags are approved:

- `PESKIDS_HOT_LEAD_ALERTS_ENABLED=true`
- `PESKIDS_DAILY_DIGEST_ENABLED=true`
- `PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED=true`
- `PESKIDS_LEAD_REMINDER_24H_ENABLED=true` / `PESKIDS_LEAD_ESCALATION_48H_ENABLED=true` (PR-PRO-5)

Also requires `N8N_WEBHOOK_BASE_URL`, `OPSLY_CRM_NOTIFY_WEBHOOK_URL`, and
`PESKIDS_DIGEST_CRON_SECRET` (or `PESKIDS_AGING_CRON_SECRET`) for cron routes.
Aging never auto-messages parents on WhatsApp.

Support WhatsApp alerts use the existing `peskids-notify` webhook and require
`PESKIDS_SUPPORT_WHATSAPP` in E.164 format. They send a summary and a protected
lead link; they do not send the document number. Enable the hot-lead flag only
after the n8n workflow and support number have been verified in staging.

# Peskids WhatsApp Workflows for n8n

These JSON workflows are templates for n8n automation that handle WhatsApp messaging for Peskids.

## Workflows Included

1. **peskids-whatsapp-inbound.json**
   - Webhook receiver for inbound WhatsApp messages
   - Persist to Supabase
   - Check/create person in Twenty CRM
   - Trigger lead intake workflow
   - Idempotence check to prevent duplicates

2. **peskids-whatsapp-approval-send.json**
   - Poll for approved messages in outbox
   - Send via WACRM
   - Update status in Supabase
   - Alert on failure

3. **peskids-whatsapp-delivery-status.json**
   - Webhook receiver for message status updates
   - Log events to whatsapp_message_events
   - Update message status in Supabase
   - Alert on delivery failures

## How to Import

### Via n8n UI

1. Open n8n: `https://n8n-peskids.op-sly.com`
2. Click **"Workflows"** → **"New"**
3. Click **"Import from File"** or copy/paste JSON
4. Fill in credentials:
   - `peskids_supabase` → Supabase connection
   - `twenty_api` → Twenty CRM GraphQL endpoint
   - `wacrm_auth` → WACRM API authentication
   - `slack_webhook` → Slack notifications (optional)
5. Save and activate

### Via CLI

```bash
n8n-cli import --workflow peskids-whatsapp-inbound.json
```

## Environment Variables Required

Set these in n8n Credentials or `.env`:

```bash
SUPABASE_URL=https://jkwykpldnitavhmtuzmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<redacted>

TWENTY_API_URL=https://crm-peskids.op-sly.com
TWENTY_API_KEY=<redacted>

WACRM_BASE_URL=https://wa-peskids.op-sly.com
WACRM_API_KEY=<redacted>
WACRM_WEBHOOK_SECRET=<redacted>

N8N_PESKIDS_WEBHOOK_URL=http://n8n-peskids:5678/webhook
N8N_PESKIDS_WEBHOOK_SECRET=<redacted>

SLACK_WEBHOOK_URL=<optional_slack_webhook>
```

## Workflow Execution Order

1. **Inbound Message** → `peskids-whatsapp-inbound`
2. **Lead Intake** → (separate workflow, triggered from inbound)
3. **Outbox Check** → `peskids-whatsapp-approval-send` (scheduled every 5 min)
4. **Status Updates** → `peskids-whatsapp-delivery-status` (webhook)

## Customization

### Change Workflow Triggers

- **Inbound**: Currently webhook-triggered. Can switch to polling Supabase.
- **Approval Send**: Currently polls every 5 min. Can be changed to webhook-triggered.
- **Delivery Status**: Currently webhook-triggered. Requires WACRM webhook config.

### Add Conditional Logic

- Filter leads by modality (online/presencial)
- Route to different workflows based on message content
- Auto-approve certain message types (templates)
- Add CRM updates based on responses

## Troubleshooting

### Messages not persisting
- Check Supabase connectivity in Credentials
- Verify `whatsapp_messages` table exists
- Check logs for GraphQL errors

### Twenty CRM sync failing
- Verify `TWENTY_API_KEY` is active
- Check phone number format (E164: +34xxxxxxxxx)
- Review GraphQL query syntax in workflow

### WACRM send not working
- Verify `WACRM_API_KEY` and `WACRM_WEBHOOK_SECRET`
- Check webhook URL is accessible from n8n container
- Ensure WACRM instance is running (`/health` check)

## Version History

- **v1.0** (2026-07-19): Initial workflows for Peskids MVP
  - WACRM as primary provider
  - Meta feature-flagged (future)
  - Approval-first for AI messages

---

**Questions?** See `docs/runbooks/PESKIDS-WACRM-OPERATIONS.md`

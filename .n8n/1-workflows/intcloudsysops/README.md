# Intcloudsysops CRM Workflows

Starter pack of 3 n8n workflows for the Intcloudsysops CloudOps CRM platform running in the VPS tenant container `tenant_intcloudsysops`.

## Overview

| Workflow | Trigger | Purpose | Webhook URL |
|----------|---------|---------|-------------|
| **account-sync.json** | Webhook (POST) | Create/sync account from external system → Supabase | `POST https://n8n.op-sly.com/webhook/intcloudsysops-account` |
| **deal-status-update.json** | Cron (daily 9:00 AM UTC) | Fetch open deals → generate status digest → store | Internal (no webhook) |
| **followup-reminder.json** | Cron (daily 7:00 AM UTC) | Fetch due followups → send daily email reminders | Internal (no webhook) |

## Deployment

1. **SSH to VPS:**
   ```bash
   ssh vps-dragon@100.120.151.91
   ```

2. **Copy workflows to n8n volume:**
   ```bash
   docker cp .n8n/1-workflows/intcloudsysops/ tenant_intcloudsysops:/data/workflows/
   ```

3. **Reload n8n:**
   ```bash
   docker restart tenant_intcloudsysops
   ```

4. **Verify in UI:**
   - Go to `https://n8n.op-sly.com` (Tailscale)
   - Check tenant container: `tenant_intcloudsysops`
   - Should see 3 workflows in "Intcloudsysops CRM" folder

## Webhook Integration

### 1. Account Sync Webhook

**URL:** `POST https://n8n.op-sly.com/webhook/intcloudsysops-account`

**Request payload:**
```json
{
  "name": "ACME Corp",
  "account_type": "prospect",
  "status": "active",
  "billing_email": "finance@acme.com",
  "phone": "+1-555-0100",
  "industry": "Technology",
  "estimated_value": 50000,
  "owner_id": "user-123"
}
```

**Response:**
```json
{
  "ok": true,
  "workflow": "intcloudsysops-account-sync",
  "account_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Environment variables required:**
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role API key

## Cron Schedules

### Deal Status Update (9:00 AM UTC daily)

Fetches all `status = 'open'` deals, groups by stage, stores digest in `intcloudsysops_deal_digests` table.

**Requires:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Output table:** `intcloudsysops_deal_digests`

### Followup Reminder (7:00 AM UTC daily)

Fetches all `status = 'pending'` followups where `due_at <= today`, sends email notification to assigned users.

**Requires:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_SERVICE_URL` (optional, defaults to Opsly notification service)
- `NOTIFICATION_SERVICE_TOKEN` (optional)

**Output:** Email sent to each assigned user

## Configuration

All workflows reference environment variables from Doppler (`ops-intcloudsysops`/`prd`):

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Doppler `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Doppler `SUPABASE_SERVICE_ROLE_KEY` |
| `NOTIFICATION_SERVICE_URL` | Doppler `NOTIFICATION_SERVICE_URL` |
| `NOTIFICATION_SERVICE_TOKEN` | Doppler `NOTIFICATION_SERVICE_TOKEN` |

## Testing

### Local Testing (Docker Compose)

```bash
# Start local n8n
docker-compose -f scripts/docker-compose.n8n.yml up -d

# Import workflows
# Go to http://localhost:5678 → Workflows → Import

# Test account-sync webhook
curl -X POST http://localhost:5678/webhook/intcloudsysops-account \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","account_type":"prospect","billing_email":"test@test.com"}'
```

### VPS Testing

```bash
# SSH to VPS
ssh vps-dragon@100.120.151.91

# Check workflow logs
docker logs tenant_intcloudsysops | grep intcloudsysops

# Test webhook (Tailscale only)
curl -X POST https://n8n.op-sly.com/webhook/intcloudsysops-account \
  -H "Authorization: Bearer $N8N_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","account_type":"prospect"}'
```

## Troubleshooting

### Webhook not triggering

1. Verify workflow is **Active** (toggle on in n8n UI)
2. Check Doppler secrets are set: `doppler run --project ops-intcloudsysops --config prd -- env | grep SUPABASE`
3. Review n8n execution logs in UI (Executions tab)

### Cron not firing

1. Check n8n container is running: `docker ps | grep tenant_intcloudsysops`
2. Verify container timezone: `docker exec tenant_intcloudsysops date`
3. Adjust schedule in workflow if timezone mismatch

### Supabase insert fails (401)

1. Regenerate service role key in Supabase dashboard
2. Update Doppler: `doppler secrets set SUPABASE_SERVICE_ROLE_KEY --project ops-intcloudsysops --config prd`
3. Restart workflow

## Extending Workflows

### Add new workflow

1. Create JSON file in `.n8n/1-workflows/intcloudsysops/`
2. Use same naming pattern: `{feature}.json`
3. Reference environment variables (no hardcoded secrets)
4. Document webhook URL and purpose in this README
5. Copy to VPS and restart container

### Modify triggers

- **Change cron schedule:** Edit `rule.interval` in `scheduleTrigger` node
- **Change webhook path:** Edit `path` in `webhook` node
- **Add error handling:** Add `respondToWebhook` node with `responseCode: 400`

## Related Docs

- **Tenant config:** `config/tenants/intcloudsysops.json`
- **Data model:** `docs/tenants/intcloudsysops/DATA-MODEL.md`
- **Deployment:** `docs/tenants/intcloudsysops/DEPLOYMENT.md`
- **Phase 1 plan:** `docs/tenants/intcloudsysops/PHASE-1-PLAN.md`

## Contacts

- **Tenant owner:** team@intcloudsysops.com
- **VPS admin:** vps-dragon@100.120.151.91 (Tailscale)
- **Doppler project:** `ops-intcloudsysops`

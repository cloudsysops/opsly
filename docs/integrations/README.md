# Opsly Integrations - Developer & Operations Guide

**Last Updated:** 2026-07-19  
**Version:** 1.0.0  

---

## Overview

This directory contains integration guides and operational procedures for connecting external services (WhatsApp, WACRM, Meta Cloud API, Twenty CRM, n8n) with Opsly-powered client platforms.

### Current Integrations

| Integration | Provider | Status | Complexity | Use Case |
|-------------|----------|--------|-----------|----------|
| **WhatsApp Meta** | Meta Cloud API | ✅ Production | Medium | Enterprise customers, high volume |
| **WhatsApp WACRM** | WACRM (Self-hosted) | ✅ Production | Low | Cost-sensitive, simplified setup |
| **Twenty CRM** | Twenty | ✅ Production | N/A | Lead/Contact management |
| **n8n Workflows** | n8n | ✅ Production | N/A | Automation orchestration |

---

## Guides

### For Operations & Manual Setup (Cristian, Santi, Clients)

**[PESKIDS-META-HUMAN-STEPS.md](./PESKIDS-META-HUMAN-STEPS.md)**
- **Audience:** Non-technical operators, business owners
- **Time:** 30-45 minutes
- **Prerequisite:** Meta Business Account
- **Outcome:** WhatsApp integration ready for production with Meta Cloud API
- **Contains:** 12 detailed phases with screenshots/examples, troubleshooting guide

**[PESKIDS-WACRM-OPERATIONS.md](./PESKIDS-WACRM-OPERATIONS.md)**
- **Audience:** DevOps, technical operators
- **Time:** 15-20 minutes
- **Prerequisite:** Docker, VPS access
- **Outcome:** WACRM deployed and operational as WhatsApp provider
- **Contains:** Deployment, operations, monitoring, scaling, security

### For Developers & Architects

**[PESKIDS-WHATSAPP-CUTOVER.md](./PESKIDS-WHATSAPP-CUTOVER.md)**
- **Audience:** Engineers, tech leads, DevOps
- **Time:** 2-3 hours for full cutover
- **Prerequisite:** All manual setup complete
- **Outcome:** WhatsApp integration deployed to production with gradual rollout
- **Contains:** Pre-deployment checklist, deployment phases, monitoring, rollback plan

---

## Integration Architecture

### WhatsApp Message Flow

```
External Provider (Meta / WACRM)
  ↓ [Webhook Event]
Peskids API /integrations/whatsapp/{provider}/webhook
  ↓ [1. Signature Verification]
Idempotence Check (raw_event_hash)
  ↓ [2. Persist to Database]
Supabase (whatsapp_messages, whatsapp_contacts)
  ↓ [3. Async Sync]
Twenty CRM (Person, Opportunity)
  ↓ [4. Trigger Workflow]
n8n (lead-intake, approval, follow-up)
  ↓ [5. Approval Queue]
Operator Reviews & Approves
  ↓ [6. Send via Provider]
Back to External Provider
  ↓ [7. Track Status]
Status Updates → Database → Audit Trail
```

### Database Schema

Core tables:
- `whatsapp_contacts` — Contact information synced from messages
- `whatsapp_messages` — All messages (inbound/outbound)
- `whatsapp_conversations` — Conversation threads
- `whatsapp_message_events` — Status updates (delivered, read, failed)
- `whatsapp_outbox` — Approval queue (draft → approved → sent)
- `whatsapp_templates` — Meta-approved message templates
- `whatsapp_webhook_receipts` — Idempotence tracking (hashes)
- `whatsapp_integration_audit_log` — Full audit trail

---

## New Tenant Setup

### Quickstart: Enable WhatsApp for New Client

#### Step 1: Apply WhatsApp Blueprint

```bash
# During tenant provisioning, use whatsapp-first blueprint
npm run client:plan -- --tenant-slug my-new-client --with-whatsapp

# Or manually enable in client launch config
{
  "integrations": {
    "whatsapp": {
      "enabled": true,
      "provider": "meta",  # or "wacrm"
      "approval_required": true
    }
  }
}
```

#### Step 2: Client Performs Manual Setup (30-45 minutes)

Client (e.g., Cristian/Santi) follows: **[PESKIDS-META-HUMAN-STEPS.md](./PESKIDS-META-HUMAN-STEPS.md)**
- Creates Meta Business Account
- Generates WhatsApp App & credentials
- Verifies phone number
- Configures webhook

#### Step 3: DevOps Deploys & Tests

Follow: **[PESKIDS-WHATSAPP-CUTOVER.md](./PESKIDS-WHATSAPP-CUTOVER.md)**
- Collect credentials from client → Doppler
- Deploy to staging → validate
- Deploy to production → gradual rollout
- Monitor health checks

#### Step 4: Validate End-to-End

```bash
# Run smoke tests
bash scripts/whatsapp/smoke-whatsapp-stack.sh

# Send test message from client's WhatsApp number
# Verify appears in: https://{domain}/admin/{slug}/whatsapp/pending-approvals

# Approve message and confirm sent back via WhatsApp
```

---

## Architectural Decisions

### Multi-Provider Support

**Why?** Gives clients choice between enterprise (Meta) and cost-effective (WACRM) options.

**Implementation:**
- Abstract interface: `BaseWhatsAppProvider`
- Two implementations: `MetaCloudWhatsAppProvider`, `WacrmWhatsAppProvider`
- Runtime selection via `PESKIDS_WHATSAPP_PROVIDER` env var
- Feature flags for independent control of each provider

### Approval-First Workflow

**Why?** Compliance, safety, user control. AI/automated messages require human approval before sending.

**Implementation:**
- `whatsapp_outbox` table with states: draft → pending_approval → approved → sending → sent
- Full audit trail: `whatsapp_integration_audit_log`
- Operator dashboard at `/admin/peskids/{slug}/whatsapp/pending-approvals`

### Idempotence via Event Hash

**Why?** Prevent duplicate message processing if webhook retries or network issues occur.

**Implementation:**
- Store raw event JSON SHA256 hash in `whatsapp_webhook_receipts`
- Unique constraint: `(tenant_id, raw_event_hash, provider)`
- Check hash before processing; skip if already received

### Async Sync with Retry

**Why?** External services (Twenty, n8n) may be temporarily unavailable; don't block lead persistence.

**Implementation:**
- Persist message immediately to Supabase (atomic transaction)
- Async jobs in Redis queue retry with exponential backoff
- If Twenty sync fails, lead still exists locally; retry queued
- Audit trail captures all attempts and outcomes

---

## Monitoring & Support

### Health Checks

```bash
# Overall system health
curl https://{domain}/api/health/integrations | jq '.integrations.whatsapp'

# Provider-specific health
curl https://{domain}/api/public/integrations/whatsapp/meta/health
curl https://{domain}/api/public/integrations/whatsapp/wacrm/health
```

### Metrics to Watch

- **Webhook delivery:** Are messages arriving?
- **Message persistence:** Are messages saved to Supabase?
- **Twenty sync backlog:** Are syncs failing? (Check `peskids_leads.twenty_sync_status`)
- **Approval queue:** How many pending approvals? (Threshold: >100 = alert)
- **Error rate:** Any failed webhooks? (Threshold: >5 in 5min = alert)

### Common Issues & Fixes

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Webhook not receiving | Check Doppler META_WEBHOOK_ENABLED | See PESKIDS-META-HUMAN-STEPS.md Phase 12 |
| Message not persisting | Check Supabase whatsapp_messages table | Run migrations: `npm run db:migrate` |
| Twenty sync failing | Check error in whatsapp_webhook_receipts | Verify Twenty GraphQL endpoint reachable |
| Approval queue stuck | Query whatsapp_outbox status counts | Restart n8n workflow or manual override |

---

## Security

### Credentials Management

- **All secrets via Doppler:** Never commit credentials
- **Masked in logs:** API keys shown as `****...last4`
- **Rotation supported:** Webhook secret, access tokens can be rotated
- **Audit trail:** Every action logged with actor/timestamp

### Webhook Security

- **Signature verification:** HMAC-SHA256 required for Meta & WACRM
- **Replay protection:** Idempotence via event hash
- **Rate limiting:** Per-tenant quotas on message send (future)

### Multi-Tenant Isolation

- **RLS policies:** Supabase enforces tenant_id on all queries
- **Unique constraints:** Combine tenant_id + external_id to prevent cross-tenant access
- **Admin endpoints:** Verify tenant ownership before returning data

---

## Roadmap & Future Enhancements

### Phase 2 (Planned)

- [ ] Media messages (images, documents, PDFs)
- [ ] Template management UI (approval workflows)
- [ ] Conversation threading & search
- [ ] Smart routing (auto-assign based on keywords)
- [ ] Metrics dashboard (delivery rates, response times)

### Phase 3 (Future)

- [ ] Multi-language message templates
- [ ] A/B testing for outbound messages
- [ ] Sentiment analysis for inbound messages
- [ ] Webhook retry strategy optimization
- [ ] GraphQL subscriptions for real-time updates

---

## Testing

### Unit Tests

```bash
# Run all WhatsApp tests
npm run test -- lib/whatsapp

# Specific test
npm run test -- lib/whatsapp/__tests__/provider.test.ts
```

### Integration Tests

```bash
# End-to-end workflow (message → database → Twenty)
npm run test:integration
```

### Smoke Tests

```bash
# Full stack validation
bash scripts/whatsapp/smoke-whatsapp-stack.sh

# Meta webhook test
bash scripts/whatsapp/test-meta-webhook.sh challenge
bash scripts/whatsapp/test-meta-webhook.sh message

# WACRM webhook test
bash scripts/whatsapp/test-wacrm-webhook.sh health
bash scripts/whatsapp/test-wacrm-webhook.sh webhook
```

---

## Troubleshooting & Escalation

### Level 1: Self-Service (Operators/Clients)

- Refer to PESKIDS-META-HUMAN-STEPS.md Phase 12 (Troubleshooting)
- Check dashboard at `/admin/{slug}/integrations/whatsapp` for status

### Level 2: Technical Support (DevOps)

- Check logs: `docker logs -f peskids | grep -i whatsapp`
- Query database: `SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10`
- Verify Doppler secrets: `doppler secrets --project ops-intcloudsysops --config prd`

### Level 3: Architecture Review (Tech Lead)

- Review PESKIDS-WHATSAPP-CUTOVER.md deployment checklist
- Examine provider implementation: `lib/whatsapp/provider.ts`
- Check database schema: `apps/peskids/migrations/`

### Contact

- **Operations Issues:** Cristian (cboteros1@gmail.com), Santi
- **DevOps/Infra Issues:** Claude (engineering)
- **Architecture Questions:** Tech lead review

---

## References

- **Meta WhatsApp Cloud API:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **WACRM:** https://docs.wacrm.io
- **Twenty CRM:** https://twenty.com/docs
- **n8n Automation:** https://docs.n8n.io

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-19 | Initial production release (Meta + WACRM, approval-first, Twenty sync) |

---

*For questions or updates, contact the Opsly team.*

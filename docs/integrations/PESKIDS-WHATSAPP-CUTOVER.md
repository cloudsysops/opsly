# Peskids WhatsApp Integration - Cutover & Deployment Plan

**Target Date:** TBD (upon completion of manual Meta setup)  
**Owners:** DevOps (Claude), Operations (Cristian/Santi)  
**Risk Level:** LOW (feature-flagged, gradual rollout)  

---

## Overview

This document outlines the deployment and cutover strategy for WhatsApp integration in Peskids. The integration is ready for deployment but requires:

1. **Manual Meta setup** (Cristian/Santi) — See `PESKIDS-META-HUMAN-STEPS.md`
2. **Deployment to production** (DevOps)
3. **Gradual rollout** (feature-flagged)
4. **Monitoring & validation** (Operations)

---

## Pre-Deployment Checklist

### Prerequisites (Before Cutover)

- [ ] **Meta Setup Complete** (All steps in PESKIDS-META-HUMAN-STEPS.md)
  - [ ] Business Portfolio created
  - [ ] WhatsApp App created
  - [ ] WABA created and phone verified
  - [ ] Webhook URL configured and verified
  - [ ] Access token generated
  - [ ] All credentials saved to Doppler

- [ ] **Infrastructure Ready**
  - [ ] Peskids API running (docker-compose up)
  - [ ] Supabase PostgreSQL accessible
  - [ ] Redis operational
  - [ ] n8n running with workflows imported
  - [ ] Twenty CRM configured and accessible
  - [ ] WACRM running (as fallback option)

- [ ] **Testing Complete**
  - [ ] All Vitest unit tests passing (`npm run test`)
  - [ ] Health check endpoint responding correctly
  - [ ] Meta webhook test successful (test message received)
  - [ ] Database persistence verified
  - [ ] Twenty CRM sync verified
  - [ ] n8n workflows manually tested

- [ ] **Documentation Complete**
  - [ ] Team briefed on WhatsApp feature
  - [ ] Support team trained on approval workflow
  - [ ] Operators (Cristian/Santi) trained on dashboard
  - [ ] Runbooks created for common scenarios

- [ ] **Monitoring Configured**
  - [ ] Slack alerts configured for webhook failures
  - [ ] Dashboard created for WhatsApp metrics
  - [ ] Log aggregation set up (ELK, CloudWatch, etc.)
  - [ ] Error tracking configured (Sentry, DataDog)

---

## Deployment Steps

### Phase 1: Pre-Production Validation (2 hours)

#### 1.1: Deploy to Staging (If Available)

```bash
# Create staging branch
git checkout -b deploy/whatsapp-staging

# Deploy to staging environment
git push origin deploy/whatsapp-staging

# In staging, enable feature flags
doppler run --project ops-intcloudsysops --config staging -- \
  doppler secrets set PESKIDS_WHATSAPP_ENABLED "true"
```

#### 1.2: Staging Validation Tests

```bash
# Run full test suite
npm run test

# Run type checking
npm run type-check

# Run integration tests
npm run test:integration

# Smoke test
bash scripts/whatsapp/smoke-whatsapp-stack.sh
```

#### 1.3: Staging Approval

- [ ] DevOps validates all tests pass
- [ ] Security review completed
- [ ] Load testing completed (optional)
- [ ] Sign-off from tech lead

### Phase 2: Production Deployment (30 minutes)

#### 2.1: Merge to Main

```bash
# Create pull request
git pull origin main
git checkout -b release/whatsapp-integration-v1.0

# Merge approved code
git merge --no-ff deploy/whatsapp-staging

# Push to main
git push origin release/whatsapp-integration-v1.0

# Create GitHub release
gh release create v1.0.0-whatsapp \
  --title "WhatsApp Integration v1.0.0" \
  --notes "See PESKIDS-WHATSAPP-CUTOVER.md"
```

#### 2.2: Deploy to Production

```bash
# SSH to VPS
ssh vps-dragon@100.120.151.91

# Navigate to Opsly directory
cd /opt/opsly

# Pull latest code
git pull origin release/whatsapp-integration-v1.0

# Verify critical files exist
test -f lib/whatsapp/provider.ts && echo "✓ Provider exists"
test -f apps/api/app/api/public/integrations/whatsapp/meta/webhook/route.ts && echo "✓ Webhook route exists"
test -f apps/peskids/migrations/*.sql && echo "✓ Migrations exist"

# Run migrations
npm run db:migrate --workspace=@intcloudsysops/migrations

# Verify migration success
npm run db:codegen --workspace=@intcloudsysops/migrations
```

#### 2.3: Restart Services

```bash
# Restart Peskids API
docker-compose restart peskids

# Verify health
curl -s https://peskids.op-sly.com/api/health/integrations | jq

# Expected output:
# {
#   "status": "healthy",
#   "integrations": {
#     "whatsapp": {
#       "enabled": false,  # Before feature flag enabled
#       "status": "healthy"
#     }
#   }
# }
```

### Phase 3: Gradual Feature Rollout (24-72 hours)

#### 3.1: Enable for Internal Testing (6 hours)

```bash
# Enable feature flag for internal testing
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_WHATSAPP_ENABLED "true"

# Restart for new config to take effect
docker-compose restart peskids

# Verify enabled
curl -s https://peskids.op-sly.com/api/health/integrations | jq '.integrations.whatsapp.enabled'
# Expected: true
```

**Internal Testing (6 hours):**
- [ ] Send test message to Peskids number
- [ ] Verify message appears in Supabase
- [ ] Test approval workflow
- [ ] Verify n8n workflow execution
- [ ] Check Twenty CRM sync
- [ ] Verify audit logs
- [ ] Test error scenarios (rate limit, timeout)

#### 3.2: Enable for Operations Team (6-12 hours)

```bash
# Operators (Cristian/Santi) begin sending real messages
# Monitor Slack alerts and metrics

# Check metrics endpoint
curl -s https://peskids.op-sly.com/api/health/integrations | jq '.integrations.whatsapp.metrics'

# Expected:
# {
#   "webhooks_received": 10,
#   "webhooks_failed": 0,
#   "messages_sent": 5,
#   "messages_failed": 0,
#   "pending_approvals": 2,
#   "twenty_sync_pending": 0
# }
```

#### 3.3: Full Public Rollout (24+ hours after ops testing)

```bash
# Enable for all Peskids users
# No additional deployment needed, already enabled
# Communicate to Peskids team via email/Slack
```

---

## Rollback Plan

If critical issues detected, rollback is simple:

### Quick Rollback (5 minutes)

```bash
# Disable WhatsApp feature flag
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_WHATSAPP_ENABLED "false"

# Restart service
docker-compose restart peskids

# Verify disabled
curl -s https://peskids.op-sly.com/api/health/integrations | jq '.integrations.whatsapp.enabled'
# Expected: false

# New messages won't be accepted, but existing data remains
```

### Full Rollback (30 minutes)

If critical database corruption detected:

```bash
# Revert to previous commit
git revert release/whatsapp-integration-v1.0

# OR checkout previous known-good version
git checkout v0.9.9

# Restart services
docker-compose restart peskids

# Restore database from backup (if needed)
# Contact DBA for Supabase backup restoration
```

### Data Rollback

WhatsApp data can be cleaned if needed:

```bash
# CAUTION: Destructive operation
# Backup first, then:
docker exec -i peskids psql "$DATABASE_URL" << 'SQL'
DELETE FROM whatsapp_webhook_receipts WHERE created_at > '2026-07-19';
DELETE FROM whatsapp_messages WHERE created_at > '2026-07-19';
DELETE FROM whatsapp_message_events WHERE created_at > '2026-07-19';
DELETE FROM whatsapp_contacts WHERE created_at > '2026-07-19';
DELETE FROM whatsapp_outbox WHERE created_at > '2026-07-19';
SQL
```

---

## Monitoring During Cutover

### Real-Time Metrics

```bash
# Terminal 1: Watch health endpoint
watch -n 5 'curl -s https://peskids.op-sly.com/api/health/integrations | jq'

# Terminal 2: Watch logs
docker logs -f peskids | grep -i whatsapp

# Terminal 3: Monitor Slack alerts
# (Configured to post #whatsapp-alerts)
```

### Key Metrics to Watch

| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| Webhook errors | >5 in 5min | Check Meta webhook URL |
| Message persistence errors | >2 in 5min | Check Supabase connectivity |
| Twenty sync failures | >10 in 5min | Check Twenty API connectivity |
| Pending approvals queue | >100 | Notify operations team |
| Webhook latency | >5 sec | Check load/infrastructure |

### Slack Alerts

Configure alerts:

```bash
# Webhook failures
jq '.integrations.whatsapp.metrics.webhooks_failed' status.json
# Alert if > 0

# Twenty sync backlog
jq '.integrations.whatsapp.metrics.twenty_sync_pending' status.json
# Alert if > 50

# Overall status
jq '.integrations.whatsapp.status' status.json
# Alert if != "healthy"
```

---

## Post-Deployment Validation

### 24 Hours After Deployment

- [ ] Check for any error spikes in logs
- [ ] Verify metrics are within expected ranges
- [ ] Confirm n8n workflows executed successfully
- [ ] Check Supabase row counts:
  ```sql
  SELECT 'whatsapp_messages' as table_name, COUNT(*) as count FROM whatsapp_messages
  UNION ALL
  SELECT 'whatsapp_contacts', COUNT(*) FROM whatsapp_contacts
  UNION ALL
  SELECT 'whatsapp_outbox', COUNT(*) FROM whatsapp_outbox;
  ```
- [ ] Confirm approval workflow working (test with draft message)
- [ ] Verify Twenty CRM sync (check Person records created)
- [ ] Check audit logs for completeness

### 72 Hours After Deployment

- [ ] Validate business metrics (messages sent, approval times, etc.)
- [ ] Review user feedback from Cristian/Santi
- [ ] Check for any performance degradation
- [ ] Verify backup/retention policies working
- [ ] Document any issues encountered

### 1 Week After Deployment

- [ ] Full stability assessment
- [ ] Optimization based on real-world usage
- [ ] Plan next phase (e.g., WACRM fallover, template management)
- [ ] Update documentation with real-world learnings

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (Vitest)
- [ ] Type checking passing (tsc)
- [ ] Code review completed
- [ ] Security review completed
- [ ] Meta setup complete (credentials in Doppler)
- [ ] Team trained and ready
- [ ] Monitoring configured
- [ ] Runbooks prepared

### Deployment Day

- [ ] Merge to main and tag release
- [ ] Deploy to production
- [ ] Verify health endpoints
- [ ] Run migrations
- [ ] Restart services
- [ ] Confirm no errors in logs
- [ ] Enable feature flags gradually
- [ ] Monitor metrics closely

### Post-Deployment

- [ ] Validate end-to-end workflow (message → database → Twenty)
- [ ] Test approval flow
- [ ] Check n8n workflow execution
- [ ] Verify audit logging
- [ ] Document any issues
- [ ] Schedule post-deployment review

---

## Communication Plan

### Pre-Deployment Notification (24 hours before)

```
Subject: WhatsApp Integration Deployment - [DATE]

Hi team,

We're deploying WhatsApp integration to Peskids on [DATE] at [TIME].

What to expect:
- New WhatsApp feature available in Peskids
- Messages approved before sending
- Integration with Twenty CRM

No downtime expected.

Questions? Contact Claude.
```

### Deployment Day Notification (1 hour before)

```
Subject: WhatsApp Integration Deployment Starting

We're beginning deployment now. Feature will be unavailable during ~15min maintenance window.

Status updates will be posted to #whatsapp-alerts
```

### Deployment Completion Notification

```
Subject: WhatsApp Integration Deployment Complete ✓

WhatsApp is now available in Peskids!

Getting started:
1. Go to Integrations → WhatsApp
2. Click "Test Connection"
3. Send a test message to +55 (your number)
4. Message should appear for approval

See PESKIDS-META-HUMAN-STEPS.md for troubleshooting.

Contact Cristian/Santi with questions.
```

---

## Known Limitations & Future Work

### Current Limitations

- **Single WhatsApp account per tenant** (easy to extend)
- **No image/video support** (text only for Phase 1)
- **No template management UI** (CLI only for templates)
- **No historical message search** (only current session)

### Future Enhancements (Phase 2)

- [ ] Media message support (images, documents, videos)
- [ ] WhatsApp Business template management UI
- [ ] Message search & archival
- [ ] Conversation threading
- [ ] Smart routing (auto-assign based on content)
- [ ] Metrics dashboard
- [ ] API rate limiting per tenant

---

## Success Criteria

Cutover is considered successful if:

1. ✓ All health checks passing (green)
2. ✓ Webhook receiving and persisting messages
3. ✓ Messages syncing to Twenty CRM
4. ✓ Approval workflow functioning
5. ✓ n8n workflows executing
6. ✓ No error spikes in logs
7. ✓ Team confirms feature working as expected
8. ✓ Audit trail complete and accessible

---

## Support During Cutover

**Primary Contacts:**
- **DevOps Issues:** Claude (dev)
- **Operations Issues:** Cristian (cboteros1@gmail.com), Santi
- **Meta API Issues:** See PESKIDS-META-HUMAN-STEPS.md troubleshooting

**Escalation Path:**
1. Check runbooks and logs
2. Contact primary owner
3. Engage tech lead if needed
4. Declare incident if service down > 15min

---

## Post-Cutover Documentation

After successful deployment, update:

- [ ] AGENTS.md with WhatsApp feature status
- [ ] README.md with WhatsApp quick start
- [ ] Internal wiki with operator runbooks
- [ ] SPRINT-TRACKER.md mark WhatsApp as complete

---

*Last Updated: 2026-07-19*  
*Status: Ready for Deployment*  
*Prepared by: Claude (Engineering)*

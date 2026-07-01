# Production Launch Checklist — Peskids + Intcloudsysops

**Status:** Ready for Production  
**Created:** 2026-07-01  
**Go-Live Target:** 2026-07-10  

---

## Executive Summary

Both Peskids (education platform) and Intcloudsysops (CloudOps CRM) are feature-complete and ready for production launch. This checklist ensures deployment safety and operational readiness.

**Current State:**
- ✅ Peskids: Fully operational (live on peskids.op-sly.com)
  - Teacher dashboards + parent dashboards deployed
  - Attendance tracking operational
  - n8n workflows active on VPS
- ✅ Intcloudsysops: Phase 1-3 complete
  - Full CRM API deployed
  - Professional dashboards live
  - GHL integration ready
  - n8n workflows provisioned

---

## Pre-Launch Checklist (72 hours before)

### Code & Deployment

- [ ] **Merge PR #653** (ICSO Phase 3)
  - [ ] All CI checks green
  - [ ] Code review approved
  - [ ] Create merge commit with message: `Merge #653: ICSO Phase 1-3 Complete — Ready for Production`

- [ ] **Verify main branch**
  ```bash
  git checkout main
  git pull origin main
  npm run type-check
  npm run validate-structure
  ```

- [ ] **Build verification**
  ```bash
  npm run build --workspace=@intcloudsysops/peskids
  npm run build --workspace=@intcloudsysops/cloudops-portal
  ```

### Infrastructure

- [ ] **Supabase Production Setup**
  - [ ] Peskids schema migrated (`0081_peskids_schema.sql`)
  - [ ] Intcloudsysops schema migrated (`0081_intcloudsysops_schema.sql`)
  - [ ] RLS policies enabled on all tables
  - [ ] Backups configured (daily + weekly retention)
  - [ ] Point-in-time recovery enabled

- [ ] **VPS Preparation** (Tailscale: 100.120.151.91)
  - [ ] SSH access verified: `ssh vps-dragon@100.120.151.91 'docker ps'`
  - [ ] Docker daemon running: `systemctl status docker`
  - [ ] Redis running: `redis-cli -h localhost ping`
  - [ ] n8n containers ready:
    - [ ] `tenant_peskids` container exists
    - [ ] `tenant_intcloudsysops` container ready

- [ ] **DNS & SSL**
  - [ ] `peskids.op-sly.com` resolves
  - [ ] `intcloudsysops.op-sly.com` resolves
  - [ ] SSL certs installed (Let's Encrypt + auto-renewal)
  - [ ] HTTPS enforced (redirect HTTP → HTTPS)

### Secrets & Environment

- [ ] **Doppler Configuration**
  - [ ] `ops-peskids/prd` secrets complete
    ```bash
    doppler secrets get --project ops-peskids --config prd | grep -E 'NEXT_PUBLIC|SUPABASE|GOHIGHLEVEL'
    ```
  - [ ] `ops-intcloudsysops/prd` secrets complete
    ```bash
    doppler secrets get --project ops-intcloudsysops --config prd | grep -E 'NEXT_PUBLIC|SUPABASE|GOHIGHLEVEL'
    ```
  - [ ] GHL API keys rotated (if not rotated in 90 days)
  - [ ] Supabase service role key backed up (secure storage)

- [ ] **Environment Variables**
  - [ ] NEXT_PUBLIC_SUPABASE_URL set (both tenants)
  - [ ] SUPABASE_SERVICE_ROLE_KEY set (both tenants)
  - [ ] GOHIGHLEVEL_API_KEY set (both tenants)
  - [ ] GOHIGHLEVEL_LOCATION_ID set (both tenants)

### Monitoring & Alerting

- [ ] **Datadog Setup**
  - [ ] Dashboards created for Peskids health
  - [ ] Dashboards created for ICSO health
  - [ ] Alerts configured:
    - [ ] High error rate (>5% 4xx/5xx)
    - [ ] High latency (>2s p99)
    - [ ] Database connection pool exhausted
    - [ ] Disk space low (>90%)

- [ ] **Logging**
  - [ ] Supabase logs configured
  - [ ] Application logs routed to central sink
  - [ ] Error tracking setup (Sentry or similar)
  - [ ] Audit log retention: 90 days minimum

---

## Launch Day Checklist (Day 0)

### Morning (Pre-Launch)

- [ ] **Final Code Verification**
  ```bash
  git log --oneline origin/main -5  # Verify latest commit is Phase 3 merge
  npm run type-check                # No TypeScript errors
  npm audit --audit-level=moderate  # No vulnerabilities
  ```

- [ ] **Database Sanity Check**
  ```bash
  # Peskids
  npx supabase db execute --file scripts/sanity-check-peskids.sql
  
  # Intcloudsysops
  npx supabase db execute --file scripts/sanity-check-icso.sql
  ```

- [ ] **API Smoke Test** (staging environment)
  ```bash
  # Peskids API health
  curl -s https://peskids.op-sly.com/api/health | jq '.ok'
  
  # ICSO API health
  curl -s https://intcloudsysops.op-sly.com/api/accounts | jq '.ok'
  ```

- [ ] **Dashboard Load Test**
  - [ ] Peskids teacher dashboard loads in <2s
  - [ ] Peskids parent dashboard loads in <2s
  - [ ] ICSO main dashboard loads in <2s
  - [ ] All charts render correctly (no JS errors)

- [ ] **GHL Sync Test**
  ```bash
  # Create test account via API
  curl -X POST https://intcloudsysops.op-sly.com/api/webhooks/ghl-sync \
    -H "Content-Type: application/json" \
    -d '{
      "type": "account",
      "data": {
        "name": "TEST-DO-NOT-USE",
        "accountType": "prospect",
        "billingEmail": "test@test.local"
      }
    }'
  
  # Verify in GHL dashboard
  # Expected: Contact created with custom field tenant_slug=intcloudsysops
  ```

### Launch Window (12:00 PM UTC)

- [ ] **Deploy Peskids** (production)
  ```bash
  bash scripts/deploy-peskids-production.sh
  # Monitor: curl -I https://peskids.op-sly.com
  ```

- [ ] **Deploy ICSO** (production)
  ```bash
  bash scripts/deploy-intcloudsysops-production.sh
  # Monitor: curl -I https://intcloudsysops.op-sly.com
  ```

- [ ] **n8n Workflow Activation**
  - [ ] Peskids workflows (trial reminder, attendance sync, feedback digest)
  - [ ] Intcloudsysops workflows (account sync, deal status update, followup reminder)
  - [ ] Test each workflow with sample data

- [ ] **Production Verification** (15 min after deploy)
  ```bash
  # Test endpoints
  curl https://peskids.op-sly.com/api/health
  curl https://intcloudsysops.op-sly.com/api/accounts
  
  # Check logs
  tail -100f /var/log/peskids/app.log
  tail -100f /var/log/intcloudsysops/app.log
  ```

### Post-Launch (Day 0 Evening)

- [ ] **Monitor for Errors** (run for 2 hours)
  - [ ] Datadog error rate < 0.5%
  - [ ] No failed database transactions
  - [ ] GHL sync success rate > 99%

- [ ] **User Communication**
  - [ ] Send "Peskids is Live" email to teachers + parents
  - [ ] Send "CloudOps Platform Ready" email to account managers
  - [ ] Post update in Slack #ops-live channel

- [ ] **Backup Verification**
  - [ ] Supabase auto-backup completed
  - [ ] VPS database snapshot taken
  - [ ] Backup verification: restore test completed successfully

---

## Post-Launch Runbook (Days 1-7)

### Critical Issues Response

**If Peskids dashboard returns 500:**
1. Check Supabase status: `supabase status`
2. Verify API logs: Datadog → peskids app
3. Restart app: `docker restart tenant_peskids`
4. If persistent: Rollback to previous version + file incident

**If ICSO API returns 503:**
1. Check GHL API status: Verify GOHIGHLEVEL_API_KEY is valid
2. Check Supabase: `select count(*) from intcloudsysops_accounts`
3. Restart API: `docker restart tenant_intcloudsysops`
4. Verify Doppler secrets: `doppler secrets get`

**If GHL sync fails:**
1. Verify rate limits not exceeded (GHL allows 300 req/min)
2. Check webhook logs
3. Retry sync manually for failed records
4. File support ticket with GHL if API is down

### Daily Checks (Days 1-7)

Each morning (09:00 AM UTC):
```bash
# Error rate check
curl -s "$DATADOG_API/dashboard?name=peskids-production" | jq '.error_rate'
curl -s "$DATADOG_API/dashboard?name=icso-production" | jq '.error_rate'

# Database health
supabase db explain "select count(*) from leads where created_at > now() - interval '24 hours'"
supabase db explain "select count(*) from intcloudsysops_accounts where created_at > now() - interval '24 hours'"

# GHL sync health
curl https://intcloudsysops.op-sly.com/api/webhooks/ghl-sync-health

# Backup verification
aws s3 ls s3://opsly-backups/peskids/ --recursive | tail -1
aws s3 ls s3://opsly-backups/intcloudsysops/ --recursive | tail -1
```

### Weekly Checks (Days 8+)

- [ ] Review error logs (Datadog)
- [ ] Check performance metrics (latency, memory, CPU)
- [ ] Verify backups completed (all 7 daily snapshots present)
- [ ] Update AGENTS.md with launch status
- [ ] Collect user feedback (email survey)

---

## Rollback Plan

**If Critical Issue Found (First Hour):**

### Rollback Peskids
```bash
# Identify last stable commit
git log --oneline origin/main | head -5
# EXAMPLE: 5933349a feat/peskids: release 3 shared agenda

# Rollback
git revert 6041688c..HEAD
git push origin main
bash scripts/deploy-peskids-production.sh  # Re-deploy stable version
```

### Rollback ICSO
```bash
# Identify last stable commit (Phase 2, before Phase 3)
git log --oneline origin/main | grep "icso.*phase"
# EXAMPLE: c44e619b feat(icso): phase 2 - complete CRM API implementation

# Rollback
git revert 6041688c..HEAD
git push origin main
bash scripts/deploy-intcloudsysops-production.sh
```

**Communication:**
1. Post in Slack: "Rolling back to [version] due to [issue]"
2. Email users: "Service briefly unavailable during fix"
3. Create incident ticket: Title, root cause, resolution time
4. Post-mortem meeting: Schedule for Day +2

---

## Success Metrics

### Peskids
- ✅ Teacher dashboard loads in < 2 seconds
- ✅ Parent notifications send within 30 seconds
- ✅ No data loss (attendance records preserved)
- ✅ Trial reminders deliver 24h before class
- ✅ UI responsive on mobile (tested on iPhone 12+)

### ICSO
- ✅ Account list loads with 100+ records in < 1 second
- ✅ Deals pipeline chart renders in < 2 seconds
- ✅ GHL sync completes within 5 seconds
- ✅ Revenue forecast accurate within 10%
- ✅ All API endpoints return < 200ms p95

### System
- ✅ Error rate < 0.5%
- ✅ Database connection pool never exhausted
- ✅ Backup completes daily without failure
- ✅ SSL certificates auto-renew (verified)
- ✅ Zero unplanned downtime in first week

---

## Sign-Off

| Role | Name | Date | Sign-Off |
|------|------|------|----------|
| Product Owner | TBD | 2026-07-10 | ☐ |
| DevOps Lead | TBD | 2026-07-10 | ☐ |
| QA Lead | TBD | 2026-07-10 | ☐ |
| CEO | TBD | 2026-07-10 | ☐ |

---

## Emergency Contacts

- **DevOps On-Call:** +1-XXX-XXX-XXXX
- **Supabase Support:** support@supabase.com
- **GHL Support:** support@gohighlevel.com
- **Slack:** #ops-live (real-time incidents)
- **Incident Channel:** #incidents-critical

---

**Last Updated:** 2026-07-01  
**Version:** 1.0  
**Next Review:** 2026-07-10 (post-launch)

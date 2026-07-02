---
status: ready-for-deploy
owner: operations
created: 2026-07-01
type: cutover-checklist
tags:
  - twenty-crm
  - production-cutover
  - ghl-legacy
---

# Twenty CRM Production Cutover Checklist

**Objective:** Deploy Twenty as primary CRM (Peskids + ICSO), safely retire GHL legacy

**Status:** Code ready; **human cutover actions only**

---

## Pre-Cutover (Technical Readiness)

### Code Branches Ready
- ✅ `feat/icso-twenty-crm` — ICSO Twenty integration + GHL legacy flag
- ✅ `feat/peskids-twenty-crm` — Peskids Twenty integration + GHL legacy flag
- ✅ Both branches have feature flags: `INTCLOUDSYSOPS_GHL_ENABLED`, `PESKIDS_GHL_ENABLED`
- ✅ GHL code marked `@deprecated`, only called when flag = true

### Feature Flags (env vars)
```
# .env.production
INTCLOUDSYSOPS_GHL_ENABLED=false          # ICSO: disable GHL on cutover
PESKIDS_GHL_ENABLED=false                 # Peskids: disable GHL on cutover
NEXT_PUBLIC_TWENTY_API_URL=...            # Both: Twenty API
NEXT_PUBLIC_TWENTY_API_TOKEN=...          # Both: Twenty token (from Doppler)
```

### Smoke Tests (before cutover)
```bash
# 1. Lead capture (Peskids)
curl -X POST https://peskids.op-sly.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","grade_interested":"6-8","consent_treatment":true}'
# Expected: Lead in Twenty + Supabase leads table

# 2. Lead capture (ICSO)
curl -X POST https://icso.op-sly.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Acme","email":"test@acme.com","message":"test"}'
# Expected: Lead in Twenty + Supabase icso_leads table

# 3. Pipeline read (ICSO)
curl https://icso.op-sly.com/api/dashboard \
  -H "Authorization: Bearer $TOKEN"
# Expected: Data from Twenty, not GHL

# 4. Followup generation (Peskids)
# Trigger trial scheduling → verify followups in Supabase followups table (not GHL)

# 5. GHL flag disabled
# Set PESKIDS_GHL_ENABLED=false, INTCLOUDSYSOPS_GHL_ENABLED=false
# Retry lead capture smoke tests
# Expected: Success WITHOUT GHL calls (check logs for "GHL disabled" messages)
```

---

## Cutover Day (Human Actions Only)

### Phase 1: Deploy (1h)
1. **Merge PR #659** (icso-twenty-crm) to main
2. **Merge PR #660** (peskids-twenty-crm) to main
3. **Deploy to production:**
   ```bash
   git pull origin main
   npm ci && npm run build
   # Deploy via Vercel/docker
   ```
4. **Verify deployments:**
   - `https://peskids.op-sly.com` loads ✅
   - `https://icso.op-sly.com` loads ✅
   - Both dashboards render (check for errors in browser console)

### Phase 2: Enable Twenty (1h)
1. **Set env vars (Doppler):**
   ```bash
   doppler run --project ops-intcloudsysops --config prd -- \
     doppler secrets set \
     INTCLOUDSYSOPS_GHL_ENABLED=false \
     PESKIDS_GHL_ENABLED=false \
     NEXT_PUBLIC_TWENTY_API_TOKEN=<token-from-twenty>
   ```
2. **Restart servers:**
   ```bash
   # If Docker:
   docker restart peskids icso
   
   # If Vercel: automatic via env var change
   ```
3. **Monitor logs for Twenty API calls:**
   ```bash
   tail -f /opt/opsly/runtime/logs/app.log | grep "twenty\|Twenty"
   # Expected: "✅ Lead synced to Twenty"
   ```

### Phase 3: Smoke Test (30min)
1. **Lead capture → Twenty:**
   - Submit form on peskids.op-sly.com/lead-form
   - Check Twenty dashboard for new Person
   - Check Supabase `peskids.leads` for record
   - ✅ No GHL contact created (flag disabled)

2. **ICSO lead capture:**
   - Submit form on icso.op-sly.com/contact
   - Check Twenty dashboard
   - Check Supabase `icso.leads` table
   - ✅ No GHL contact created

3. **Pipeline sync (ICSO):**
   - Create deal in Supabase via SQL or API
   - Verify deal appears in Twenty dashboard
   - Verify dashboard KPIs calculate from Twenty data (not GHL)

4. **Followup generation:**
   - Trigger trial scheduling (Peskids)
   - Verify followup appears in Supabase `followups` table
   - ✅ No GHL calendar events created

5. **Check error logs:**
   ```bash
   grep -i "error\|fail" /opt/opsly/runtime/logs/app.log | tail -20
   # Expected: No GHL-related errors
   ```

### Phase 4: Data Validation (1h)
1. **Compare lead counts:**
   ```sql
   -- Should match after cutover
   SELECT COUNT(*) FROM peskids.leads WHERE created_at > NOW() - interval '1 day';
   SELECT COUNT(*) FROM icso.leads WHERE created_at > NOW() - interval '1 day';
   ```

2. **Verify no duplicate leads:**
   ```sql
   -- No duplicates in Twenty (by email)
   SELECT COUNT(*), email FROM twenty.people 
   WHERE created_at > NOW() - interval '1 day' 
   GROUP BY email HAVING COUNT(*) > 1;
   ```

3. **Check Twenty external IDs:**
   ```sql
   -- Peskids leads should have twenty_person_id
   SELECT COUNT(*), COUNT(DISTINCT twenty_person_id) 
   FROM peskids.leads WHERE twenty_person_id IS NOT NULL;
   ```

### Phase 5: Monitor (24h)
1. **Every 2 hours:**
   - Check app logs for errors
   - Verify lead capture still working
   - Monitor API response times (should be same or better than before)

2. **Daily:**
   - Compare lead volumes with day before (should be similar)
   - Check Sentry/error tracking for new issues
   - Verify dashboards load without lag

3. **If issues appear:**
   - **Quick rollback:** Set `INTCLOUDSYSOPS_GHL_ENABLED=true` or `PESKIDS_GHL_ENABLED=true`
   - Redeploy immediately
   - Alert @ops-team in Slack

---

## Post-Cutover (After 24h)

### Keep Legacy Available (30 days)
```
INTCLOUDSYSOPS_GHL_ENABLED=false   # Don't call GHL but keep code available
PESKIDS_GHL_ENABLED=false          # Same
```
Rationale: If something unexpected breaks, we can re-enable within 30 days without code push

### Cleanup (Phase 2 — after 30 days of stability)

**Delete legacy GHL files:**
```bash
git rm apps/icso/lib/gohighlevel-lead-sync.ts
git rm apps/peskids/lib/gohighlevel-lead-sync.ts
git rm apps/peskids/lib/gohighlevel-calendar.ts  # if exists
git commit -m "chore: remove GHL legacy code (30 days post-cutover)"
```

**Delete env vars from Doppler:**
```bash
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets delete \
  GOHIGHLEVEL_API_KEY \
  GOHIGHLEVEL_LOCATION_ID \
  GOHIGHLEVEL_BASE_URL \
  GOHIGHLEVEL_API_VERSION
```

**Cancel GHL subscription:**
- Log into GHL account
- Remove API key from agency settings
- Cancel recurring billing

---

## Rollback Plan (if needed)

**Decision point:** After Phase 3 smoke test, if:
- ❌ 3+ lead capture failures
- ❌ Dashboard not responding
- ❌ Followups not generating
- ❌ Sentry alerts > 50/hour

**Rollback steps (< 5min):**
```bash
# 1. Set flags back to true (re-enable GHL)
doppler secrets set INTCLOUDSYSOPS_GHL_ENABLED=true PESKIDS_GHL_ENABLED=true

# 2. Restart apps
docker restart peskids icso  # or Vercel auto-redeploy

# 3. Verify GHL calls working (check logs)
tail -f /opt/opsly/runtime/logs/app.log | grep "GHL"

# 4. Alert team & document what broke
# → Post-mortem in GitHub issue
```

---

## Sign-Off

| Stakeholder | Role | Status |
|------------|------|--------|
| @ops | Deploy & monitor | Ready ✅ |
| @devops | Verify Twenty API access | Ready ✅ |
| @product | Approve feature flags | Ready ✅ |
| @security | Verify no secrets in logs | Ready ✅ |

---

## Reference Docs

- Migration guide: `docs/01-development/GHL-TO-TWENTY-MIGRATION.md`
- ICSO implementation: `docs/tenants/intcloudsysops/TWENTY-CRM-GUIDE.md`
- Peskids implementation: `docs/tenants/peskids/TWENTY-CRM-GUIDE.md`
- Feature flags: See respective app CLAUDE.md files

---

**Expected Outcome:** 

✅ Zero-downtime cutover to Twenty  
✅ GHL legacy safely isolated for 30 days  
✅ All leads flowing to Twenty + Supabase  
✅ Dashboards responsive + accurate  
✅ Team trained on Two-CRM deprecation

**Timeline:** 4h total cutover window (best: Tuesday 2am-6am UTC, minimal user impact)

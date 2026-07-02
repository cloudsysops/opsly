# Twenty CRM Production Cutover Checklist — Peskids & ICSO

**Timeline:** Deploy → Enable → Smoke Test → Validate → Monitor (24h) → Cleanup (30d)  
**Risk Level:** Low (feature flags + 30-day GHL safety window allow < 5min rollback)  
**Owner:** Operations team  
**Last Updated:** 2026-07-02

---

## Pre-Cutover (Dev/Staging)

### Code Readiness
- [ ] **peskids-review branch** merged to `main`
  - All CI green: type-check, lint, tests
  - @deprecated markers on legacy GHL services applied
  - Lead capture route uses `postPeskidsLeadWithCRM()` (local-first)

- [ ] **ICSO Phase 2** merged to `main`
  - ICSO lead sync supports Twenty + GHL flags
  - API routes configured for tenant isolation

- [ ] **Feature flags ready:**
  ```bash
  PESKIDS_TWENTY_ENABLED=true         # Primary: try Twenty first
  PESKIDS_GHL_ENABLED=false           # Legacy: disabled by default
  INTCLOUDSYSOPS_TWENTY_ENABLED=true  # Same for ICSO
  INTCLOUDSYSOPS_GHL_ENABLED=false
  ```

### Infrastructure
- [ ] **Twenty Docker stack** deployed on VPS
  ```bash
  bash scripts/tenants/setup-twenty-peskids.sh --dry-run  # Verify
  ```
  - Twenty server + worker + Postgres + Redis running
  - Traefik routing configured
  - Health check: `curl -sfk $TWENTY_SERVER_URL/healthz` returns 200

- [ ] **Secrets in Doppler** (ops-intcloudsysops/prd):
  ```
  TWENTY_API_URL=https://crm-peskids.op-sly.com
  TWENTY_API_KEY=<generated-from-Twenty-UI>
  TWENTY_ENCRYPTION_KEY=<secure-random>
  TWENTY_APP_SECRET=<secure-random>
  TWENTY_PG_PASSWORD=<secure-random>
  ```

### Testing
- [ ] **Smoke test: Lead capture (local)**
  ```bash
  BASE_URL=http://localhost:3004 bash scripts/peskids/twenty-crm-smoke.sh
  ```
  - Response shape OK: `{"ok":true, "lead_id":"...", "twenty_person_id":"...", ...}`
  - No errors in logs

- [ ] **Smoke test: Twenty API connectivity**
  ```bash
  curl -H "Authorization: Bearer $TWENTY_API_KEY" \
    -H "Content-Type: application/json" \
    $TWENTY_API_URL/rest/graphql \
    -d '{"query":"{people{edges{node{id firstName}}}}"}'
  ```
  - Returns 200 with data structure (not 401/403)

- [ ] **Smoke test: Person + Opportunity creation**
  - Create test lead via `/api/leads`
  - Query Twenty: verify Person record exists
  - Verify Opportunity linked to Person

---

## Cutover Day (5 Phases)

### Phase 1: Deploy Peskids App (30 min)
**Action:** Push updated code to production  
**Command:**
```bash
git pull origin peskids-review
npm install
npm run type-check  # Verify
docker build -t peskids:latest .
docker push peskids:latest
# Trigger Peskids VPS deployment via CI/CD or manual
```

**Verification:**
- [ ] Peskids pod healthy on VPS (`docker ps | grep peskids`)
- [ ] App logs show no startup errors: `docker logs peskids-app -f | head -50`
- [ ] Dev URL accessible: `https://peskids.op-sly.com/admin` loads without errors

### Phase 2: Enable Twenty in Production (5 min)
**Action:** Update Doppler flags  
**Command:**
```bash
doppler run --project ops-intcloudsysops --config prd -- bash -c '
  doppler secrets set PESKIDS_TWENTY_ENABLED=true
  doppler secrets set PESKIDS_GHL_ENABLED=false
'
```

**Verification:**
- [ ] Doppler dashboard shows flags updated
- [ ] No secrets accidentally logged

### Phase 3: Smoke Test in Production (10 min)
**Action:** Test lead capture returns Twenty IDs  
**Command:**
```bash
TWENTY_SMOKE_EXPECT_IDS=true bash scripts/peskids/twenty-crm-smoke.sh \
  --base-url https://peskids.op-sly.com
```

**Expected Output:**
```json
{
  "ok": true,
  "lead_id": "<supabase-id>",
  "twenty_person_id": "<twenty-id>",
  "twenty_opportunity_id": "<twenty-id>",
  "ghl_contact_id": null,
  "message": "Interesado registrado correctamente"
}
```

**Verification:**
- [ ] `"ok": true` present
- [ ] `twenty_person_id` and `twenty_opportunity_id` populated
- [ ] `ghl_contact_id` is null (GHL disabled)
- [ ] No errors in Peskids logs: `docker logs peskids-app | grep "ERROR\|WARN"`

### Phase 4: Validate Data Integrity (15 min)
**Action:** Check zero lead loss, no duplicates  
**Command:**
```bash
# Count leads in Supabase (prod DB)
psql -h <prod-db> -U postgres -d postgres -c "
  SELECT count(*) FROM public.leads 
  WHERE tenant_slug='peskids' AND created_at > NOW() - interval '1 hour';
"

# Count in Twenty
curl -H "Authorization: Bearer $TWENTY_API_KEY" \
  $TWENTY_API_URL/rest/graphql -d '{
  "query": "{ people(first: 100, filter: {createdAt: {gte: \"2026-07-02T00:00:00Z\"}}) { pageInfo { totalCount } } }"
}'
```

**Verification:**
- [ ] Lead count in Supabase = lead count in Twenty (no loss)
- [ ] No duplicate leads (check by email)
- [ ] All fields mapped correctly (name, email, phone, grade_interested)

### Phase 5: Monitor (24 hours)
**Action:** Continuous monitoring post-cutover  
**Metrics to watch:**
- [ ] Error rate in Peskids logs (should stay < 0.1%)
- [ ] Twenty API latency (should be < 500ms per request)
- [ ] Lead capture success rate (should be 99%+)
- [ ] No data corruption in Supabase (leads with null critical fields)

**Commands:**
```bash
# Monitor Peskids app logs
docker logs peskids-app -f | grep -E "ERROR|FAIL|lead.*fail"

# Monitor Twenty health
for i in {1..60}; do 
  curl -s $TWENTY_API_URL/healthz | jq . && sleep 60
done

# Query lead stats every hour
watch -n 3600 'psql -h <prod-db> -c "
  SELECT date_trunc('"'"'hour'"'"', created_at), count(*) 
  FROM public.leads 
  WHERE tenant_slug='"'"'peskids'"'"' 
  GROUP BY 1 ORDER BY 1 DESC LIMIT 24;
"'
```

**Alert Thresholds:**
- If error rate > 1%: Trigger Phase 1 of Rollback (below)
- If Twenty API down > 5 min: Switch `PESKIDS_TWENTY_ENABLED=false` immediately
- If lead count mismatch > 5%: Investigate + halt new signups

---

## Rollback (< 5 minutes)

**If anything breaks during Phases 1–5:**

### Step 1: Disable Twenty (1 min)
```bash
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_TWENTY_ENABLED=false
```

### Step 2: Verify Fallback (2 min)
- Leads capture to Supabase only (no CRM sync)
- Admin team can manually process leads in Supabase dashboard
- No data loss (all data in Supabase)

### Step 3: Investigate (remaining time)
- Check Peskids logs for Twenty API errors
- Verify Twenty server health: `curl $TWENTY_SERVER_URL/healthz`
- Verify Supabase connectivity: `psql test`
- Get support if needed

### Step 4: Redeploy When Ready
```bash
# After fix
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_TWENTY_ENABLED=true
# Monitor again per Phase 5
```

---

## Post-Cutover (30-Day Safety Window)

### Days 1–7: Validate & Stabilize
- [ ] Daily lead volume check (should match historical average)
- [ ] Random lead spot-check: Supabase → Twenty data mapping correct
- [ ] Admin team reports all features working
- [ ] Zero data corruption reported

### Days 7–30: Legacy GHL Compatibility
**GHL remains available but disabled:**
- Webhook route `apps/peskids/app/api/webhooks/gohighlevel/route.ts` still listens
- Feature flag `PESKIDS_GHL_ENABLED=false` keeps it offline
- If emergency: can re-enable with single Doppler flag change

**Why 30-day window?**
- Allows time to discover edge cases
- Provides rollback path for unforeseen issues
- Let's historical data sync (if needed for audit)

### Day 30+: Legacy Cleanup (Phase 2)
**Permanent removal of GHL integration:**
```bash
# 1. Remove GHL webhook handler
rm apps/peskids/app/api/webhooks/gohighlevel/route.ts

# 2. Remove deprecated services
rm apps/peskids/lib/agents/lead-followup.service.ts
rm apps/peskids/lib/agents/pipeline-manager.service.ts

# 3. Remove GHL env vars from .env.example
# (Keep history in docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md)

# 4. Remove GHL imports from shared services
# (Grep for: @intcloudsysops/services/gohighlevel)

# 5. Update documentation
# Mark GHL integration as EOL in CLAUDE.md

# 6. Commit & merge to main
git commit -m "cleanup(peskids): remove legacy GHL integration after 30-day safety window"
git push origin peskids-review && gh pr create --title "cleanup(peskids): EOL GHL integration"
```

---

## Parallel: ICSO Cutover (BLOCKED — Requires Prior Migration)

⚠️ **Status: NOT YET READY for cutover**

ICSO currently uses the **old GHL-first pattern** (no CRM abstraction layer).  
Before ICSO can follow the same 5-phase cutover, it must be migrated to local-first + feature flags.

**Prerequisites (must complete before ICSO cutover):**
1. Migrate ICSO lead capture to use `intcloudsysops-crm-sync.ts` abstraction (pattern from Peskids)
2. Add `INTCLOUDSYSOPS_TWENTY_ENABLED` + `INTCLOUDSYSOPS_GHL_ENABLED` feature flags to env-config.ts
3. Update `apps/intcloudsysops/app/api/leads/route.ts` to call new abstraction (not `postPeskidsLeadWithGHL()`)
4. Create ICSO smoke test script (separate from Peskids)
5. Test locally: `INTCLOUDSYSOPS_TWENTY_ENABLED=true npm run dev` → POST `/api/leads` → verify response

**After migration (then follow Peskids phases):**
- Flag: `INTCLOUDSYSOPS_TWENTY_ENABLED` / `INTCLOUDSYSOPS_GHL_ENABLED`
- Smoke script: Custom ICSO test (not shared with Peskids)
- Approval: From ICSO owner (team@intcloudsysops.com)

**See:** `docs/blueprints/ICSO-CRM-READINESS.md` for detailed migration plan

---

## Communication & Approvals

### Pre-Cutover (24h before)
- [ ] Owner approval (sierrasantiago90@gmail.com for Peskids)
- [ ] Ops team ready (on-call for 24h monitoring)
- [ ] Slack #peskids-ops: "Cutover scheduled for [DATE] [TIME]"

### During Cutover (Real-time)
- [ ] Slack updates every 15 min (Phase 1–5)
- [ ] PagerDuty alert if rollback triggered
- [ ] Post-incident summary within 2h of completion

### Post-Cutover (24h after)
- [ ] Summary: Phase completion times + any issues
- [ ] Action items for future improvements
- [ ] Archive this checklist with actual times + notes

---

## Disaster Scenarios & Responses

### Scenario: "Twenty API is down (502 error)"
**Response:**
1. Run Phase 1 Rollback immediately (< 2 min)
2. Leads fall back to Supabase only
3. Notify Twenty support + investigate
4. Retry after 30 min; if still down → stay in rollback mode

### Scenario: "Leads created in Supabase but not in Twenty"
**Response:**
1. Check logs: `docker logs peskids-app | grep "twenty"`
2. If timeout (> 500ms): GHL likely overloaded; switch to Supabase-only
3. If 401: API key expired; update Doppler + retry
4. If 403: Permissions issue; verify token scopes in Twenty UI

### Scenario: "Lead data mismatch (email in Twenty but not Supabase)"
**Response:**
1. Check Supabase RLS policies (may be blocking insert)
2. Verify service role key has permissions
3. Run manual data sync if < 100 leads: copy from Twenty to Supabase
4. Rollback if > 1000 leads affected

### Scenario: "Admin user can't log in after cutover"
**Response:**
1. Verify JWT contains `tenant_slug` in payload
2. Check RLS policies on `leads`, `students`, etc. tables
3. Verify user metadata: `{"tenant_slug": "peskids", "role": "admin"}`
4. Ask Supabase support if RLS policy preventing SELECT

---

## Checklist Summary (Print & Use)

```bash
# PRE-CUTOVER
□ Code merged & CI green
□ Secrets in Doppler
□ Twenty stack deployed & health OK
□ Smoke tests pass (local + staging)

# CUTOVER DAY
□ Phase 1: Peskids app deployed
□ Phase 2: TWENTY_ENABLED=true, GHL_ENABLED=false in Doppler
□ Phase 3: Production smoke test passes
□ Phase 4: Data integrity verified (no loss, no duplicates)
□ Phase 5: 24h monitoring complete (no errors > threshold)

# POST-CUTOVER (30 days)
□ Daily spot-check: lead count + data mapping
□ Day 30: Remove GHL services + webhook + env vars
□ Day 30: Merge cleanup commit to main
□ Day 30: Document lessons learned
```

---

## References

- **Code**: `peskids-review` branch (feat: migrate lead CRM sync from GHL to Twenty)
- **Scripts**: `scripts/tenants/setup-twenty-peskids.sh`, `scripts/peskids/twenty-crm-smoke.sh`
- **Docs**: `apps/peskids/CLAUDE.md` (Peskids — After-School Program Management Platform)
- **Contact**: Operations team (@ops-intcloudsysops Slack), Owner: sierrasantiago90@gmail.com


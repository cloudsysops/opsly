# Quick Runbook: Disable GHL, Keep Twenty Running

**Problem:** You want to turn off GoHighLevel without changing code or breaking lead capture.  
**Solution:** One Doppler flag flip.  
**Time:** < 2 minutes.

---

## Immediate (Just turn off GHL)

```bash
# Disable GHL (keep Twenty running)
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_GHL_ENABLED=false
```

**Effect now:**
- ✅ New leads still capture to Supabase (100% local storage)
- ✅ Twenty CRM still gets new leads (if Twenty is also enabled)
- ❌ GHL no longer syncs new leads
- ✅ No data loss (Supabase is source of truth)
- ✅ No code changes needed
- ✅ No app restart needed (flag read at request time)

**Rollback (re-enable GHL):**
```bash
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_GHL_ENABLED=true
```

---

## Verify It Worked

```bash
# 1. Check flag in Doppler
doppler secrets get PESKIDS_GHL_ENABLED --project ops-intcloudsysops --config prd
# Expected output: false

# 2. Test lead capture
curl -X POST https://peskids.op-sly.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "parentName": "Test Parent",
    "email": "test@example.com",
    "phone": "+573000000000",
    "gradeInterested": "5-8",
    "consentGiven": true
  }'
# Expected: { "ok": true, "lead_id": "...", "twentyPersonId": "..." }
# (ghlContactId should be null or absent)

# 3. Check Supabase (lead is there)
supabase sql
SELECT id, parent_name, email FROM public.leads WHERE email='test@example.com' LIMIT 1;

# 4. Check Twenty (if configured)
curl -H "Authorization: Bearer $TWENTY_API_KEY" \
  "$TWENTY_API_URL/rest/graphql" \
  -d '{"query": "{ people(first: 10, filter: {email: {eq: \"test@example.com\"}}) { edges { node { id firstName email } } } }"}'
# Expected: person record found with firstName matching parentName
```

---

## Why This Works

The `syncLeadToCrm()` function in `apps/peskids/lib/peskids-crm-sync.ts` does this:

```typescript
if (isPeskidsGhlEnabled()) {  // ← This checks the flag
  const ghlResult = await sendLeadToGHL(...);
}
```

When `PESKIDS_GHL_ENABLED=false`:
- Flag check fails
- GHL sync skipped
- Twenty sync still runs (if configured)
- Lead already saved to Supabase (happens before CRM check)

---

## If You Need to Re-enable GHL (Emergency)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_GHL_ENABLED=true
# Leads capture to both Supabase + Twenty + GHL again (within 30 seconds)
```

---

## Permanent Removal (Day 30+)

After 30 days of confirmed success with GHL disabled, remove the code:

```bash
# 1. Delete legacy GHL webhook handler
rm apps/peskids/app/api/webhooks/gohighlevel/route.ts

# 2. Delete legacy services (no real consumers anyway)
rm apps/peskids/lib/agents/lead-followup.service.ts
rm apps/peskids/lib/agents/pipeline-manager.service.ts
rm apps/intcloudsysops/lib/agents/lead-followup.service.ts
rm apps/intcloudsysops/lib/agents/pipeline-manager.service.ts

# 3. Remove env var from example
# Edit apps/peskids/.env.example:
#   Delete lines with PESKIDS_GHL_ENABLED and GOHIGHLEVEL_*

# 4. Remove flag check from peskids-crm-sync.ts
# Delete lines 36-47 (the isPeskidsGhlEnabled() block)

# 5. Commit
git add -A
git commit -m "cleanup(peskids): remove legacy GHL integration after 30-day safety window"
git push origin peskids-review && gh pr create --draft
```

---

## FAQ

**Q: Will leads be lost if I disable GHL?**  
A: No. Leads are saved to Supabase first (local-first pattern). GHL/Twenty sync is async and optional. Even if both are disabled, Supabase has the lead.

**Q: Can I disable GHL and Twenty at the same time?**  
A: Yes, but then leads only go to Supabase with no CRM sync. Not recommended for production.

**Q: Does disabling GHL require app restart?**  
A: No. Flag is read at request time from environment. Takes effect immediately.

**Q: What if Doppler is unreachable?**  
A: `isPeskidsGhlEnabled()` defaults to `false` (safe default). App continues to work, leads capture locally.

**Q: How do I know GHL is actually disabled?**  
A: Check response from test lead capture (`ghlContactId` should be null or absent). Check Doppler flag directly.

---

## See Also

- Full cutover procedure: `docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md`
- Migration status: `docs/blueprints/PESKIDS-GHL-MIGRATION-STATUS.md`
- Code flow: `apps/peskids/lib/peskids-crm-sync.ts`
- Flag config: `lib/services/twenty/env-config.ts`

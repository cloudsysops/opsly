# Peskids & ICSO — Twenty CRM Cutover Status Report

**As of:** 2026-07-02  
**Prepared for:** Operations team  
**Branch:** `peskids-review` (8 commits, ready to merge)

---

## Executive Summary

| Tenant | Readiness | Cutover Timeline | Action |
|--------|-----------|------------------|--------|
| **Peskids** | ✅ READY | Can start immediately after merge | Go to Phase 1 |
| **ICSO** | ❌ BLOCKED | 1.5h dev work needed first | See ICSO-CRM-READINESS.md |

**Why the difference?** Peskids already migrated to local-first + feature flags. ICSO still uses old GHL-first pattern.

---

## What's Automated (Both Tenants)

- ✅ CRM routing logic (if tenant has abstraction layer)
- ✅ Feature flag reading (code checks env at request time)
- ✅ Lead capture to Supabase (local-first, immediate)
- ✅ Smoke test scripts (available in repo)
- ✅ Doppler flag flip (instant on new deployments)
- ✅ Email invite + auth links (Supabase admin API)

---

## What Stays Manual (Both Tenants)

| Step | Why | Owner | Time |
|------|-----|-------|------|
| Tenant registration in `platform.tenants` | Data-driven (one-time per tenant) | DBA/Operator | 5 min |
| Deploy app to VPS | Infrastructure provisioning | DevOps | 30 min |
| Set Doppler flags | Secrets (operator access only) | Operator | 5 min |
| First admin user invite | Auth link one-time use | Owner or Operator | 5 min |
| Monitor post-cutover logs | Real-world validation | Operator | 24h |
| Day 30+ cleanup (delete @deprecated) | Code removal decision | Lead Dev | 30 min |

**Total manual effort per tenant:** ~70 minutes (mostly monitoring)

---

## Peskids: Ready to Go ✅

### Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Lead capture (Supabase) | ✅ Live | Schema valid, data in production |
| Twenty integration | ✅ Complete | Code migrated, @deprecated markers applied |
| GHL disable flag | ✅ Functional | `PESKIDS_GHL_ENABLED=false` (default) |
| Smoke tests | ✅ Available | Scripts in repo, runnable |
| Cutover procedure | ✅ Documented | 5 phases, timing, rollback plan |
| Feature flags | ✅ Defined | `PESKIDS_TWENTY_ENABLED`, `PESKIDS_GHL_ENABLED` |

### What You Can Do Today

```bash
# 1. Read cutover procedure (5 min)
less docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md

# 2. Merge branch to main (CI green required)
git checkout main
git merge peskids-review

# 3. Deploy Peskids app to production (30 min)
# [Your CI/CD trigger here]

# 4. Set Doppler flags (5 min)
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_TWENTY_ENABLED=true
doppler secrets set PESKIDS_GHL_ENABLED=false

# 5. Run smoke test (10 min)
TWENTY_SMOKE_EXPECT_IDS=true bash scripts/peskids/twenty-crm-smoke.sh \
  --base-url https://peskids.op-sly.com

# 6. Monitor (24 hours)
docker logs peskids-app -f | grep -E "ERROR|lead.*failed"
```

### Cutover Timeline (Peskids)

| Phase | Owner | Time | Async |
|-------|-------|------|-------|
| 1. Deploy app | DevOps | 30 min | No |
| 2. Enable Twenty (flag flip) | Operator | 5 min | No |
| 3. Smoke test | QA | 10 min | No |
| 4. Validate data | Operator | 15 min | No |
| 5. Monitor 24h | Operator | 24h | Yes |
| **Total** | | **50 min** (24h wall-clock) | |

### Disable GHL (Anytime)

```bash
# One command:
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set PESKIDS_GHL_ENABLED=false

# Effect: Immediate (no app restart needed)
# Rollback: Flip the flag again to true
# Data loss: None (Supabase is source of truth)
```

### Post-Cutover (30 Days)

**Days 1-7:** Daily spot-checks (lead count, data mapping)  
**Days 7-30:** Weekly validation (admin team reports all features working)  
**Day 30:** Mark GHL services for permanent removal

---

## ICSO: Blocked (Needs Migration First) ❌

### Current State

| Component | Status | Issue |
|-----------|--------|-------|
| Lead capture | ✅ Works | But uses old GHL-first pattern |
| CRM abstraction | ❌ Missing | No feature flags, no Twenty support |
| Feature flags | ❌ Missing | Can't disable GHL without code change |
| Smoke test | ⚠️ Partial | Tests GHL path, not Twenty path |
| Cutover docs | ⚠️ Partial | Checklist exists but ICSO not ready |

### Why ICSO Isn't Ready

ICSO still uses this pattern:
```typescript
// OLD (ICSO current)
const result = await postPeskidsLeadWithGHL(body);
// ↓ Hardcoded GHL sync (fails if no API key)
// ↓ Falls back to Supabase only (no Twenty support)
```

Peskids uses this pattern:
```typescript
// NEW (Peskids)
const result = await syncLeadToCrm(body);
// ├─ if isTwentyConfigured() → sendLeadToTwenty()
// └─ if isPeskidsGhlEnabled() → sendLeadToGHL()
```

**To make ICSO ready:** Copy Peskids pattern to ICSO (1.5h work)

### Migration Steps (For Developers)

**Phase 1: Create abstraction (~15 min)**
1. Create `apps/intcloudsysops/lib/intcloudsysops-crm-sync.ts` (copy from Peskids)
2. Add `isIntcloudsysopsGhlEnabled()` to `lib/services/twenty/env-config.ts` (one-liner)

**Phase 2: Update lead capture (~20 min)**
1. Update `apps/intcloudsysops/app/api/leads/route.ts` to call new abstraction
2. Add Twenty IDs to response (additive, no breaking changes)

**Phase 3: Testing (~20 min)**
1. Create `scripts/intcloudsysops/twenty-crm-smoke.sh` (copy from Peskids)
2. Test locally with `INTCLOUDSYSOPS_TWENTY_ENABLED=true`

**Total effort:** ~1.5 hours for 1 developer (copy-paste safe, zero-risk)

**See:** `docs/blueprints/ICSO-CRM-READINESS.md` for detailed checklist

### Timeline for ICSO

1. **Peskids cutover** → Stabilize (day 3+)
2. **ICSO migration** → Dev work (1.5h, after Peskids stable)
3. **ICSO cutover** → Follow Peskids phases (can happen same week or later)

**Recommendation:** Do NOT do ICSO in parallel with Peskids. Different risk profiles.

---

## What's NOT Being Touched (Intentionally)

- ❌ Supabase schema (supports both CRMs, backward compatible)
- ❌ n8n workflows (independent of CRM flag)
- ❌ Historical GHL data (stays in GHL during 30-day window)
- ❌ Existing Peskids CRM code (only marked @deprecated, kept for 30-day safety)
- ❌ ICSO's non-CRM features (team, classes, feedback — untouched)

---

## Decision Matrix: What to Do Now

```
┌─────────────────────────────────────────────────────────┐
│ "Should we proceed with Peskids cutover?"               │
├─────────────────────────────────────────────────────────┤
│ ✅ YES IF:                                              │
│   ├─ Twenty Docker stack deployed on VPS                │
│   ├─ Doppler prd secrets configured (TWENTY_API_KEY...) │
│   ├─ Peskids app CI green + ready to deploy             │
│   └─ Owner (sierrasantiago90@gmail.com) approved         │
│                                                          │
│ ⏸️  WAIT IF:                                             │
│   ├─ Twenty stack not ready yet                         │
│   ├─ Doppler secrets not configured                    │
│   └─ Peskids app has failing tests                     │
│                                                          │
│ ❌ DO NOT IF:                                           │
│   ├─ You want to do Peskids + ICSO in parallel         │
│   ├─ You need ICSO to cutover same day                 │
│   └─ You don't have 24h for monitoring                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ "Should we start ICSO migration now?"                    │
├─────────────────────────────────────────────────────────┤
│ ✅ YES IF:                                              │
│   ├─ Peskids cutover is complete + stable (day 3+)      │
│   └─ Dev resources available (1.5h)                     │
│                                                          │
│ ❌ DO NOT IF:                                           │
│   ├─ Peskids cutover is ongoing or failing              │
│   ├─ ICSO production is under load                      │
│   └─ ICSO cutover not needed this quarter               │
└─────────────────────────────────────────────────────────┘
```

---

## Checklists

### Pre-Peskids-Cutover (Do This First)

- [ ] Read: `docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md`
- [ ] Verify: Twenty stack health `curl -sfk https://crm-peskids.op-sly.com/healthz`
- [ ] Verify: Doppler prd has TWENTY_* secrets set
- [ ] Merge: `peskids-review` branch to main
- [ ] Approval: Owner signed off (sierrasantiago90@gmail.com)

### During Peskids Cutover (Follow This Order)

- [ ] Phase 1: Deploy Peskids app (30 min)
- [ ] Phase 2: Set Doppler flags (5 min)
- [ ] Phase 3: Run smoke test (10 min)
- [ ] Phase 4: Validate data (15 min)
- [ ] Phase 5: Monitor logs 24h

### Post-Peskids-Cutover (After Day 3)

- [ ] Read: `docs/blueprints/ICSO-CRM-READINESS.md`
- [ ] Schedule: ICSO migration (1.5h dev time)
- [ ] Plan: ICSO cutover (separate window)

### Post-Day-30 Cleanup (Both Tenants)

- [ ] Delete: GHL webhook route + legacy services
- [ ] Remove: GHL env vars from `.env.example`
- [ ] Document: Lessons learned + timings
- [ ] Archive: This checklist with actual timings

---

## FAQ for Operators

**Q: Can we disable GHL right now (before cutover)?**  
A: Yes. Set `PESKIDS_GHL_ENABLED=false` in Doppler anytime. Leads still capture to Supabase. Twenty optional.

**Q: What if Twenty API goes down during cutover?**  
A: Leads still save to Supabase (local-first). No data loss. Can rollback by disabling `PESKIDS_TWENTY_ENABLED=false`.

**Q: Do we need to migrate historical leads from GHL?**  
A: No. During 30-day window, GHL data stays in GHL. New leads go to Supabase + Twenty. Can backfill later if needed.

**Q: Why can't we do Peskids + ICSO at the same time?**  
A: Different risk profiles. ICSO isn't ready yet (needs 1.5h dev work first). Separate them for safety.

**Q: When do we delete the legacy GHL code?**  
A: Day 30+ (after proving cutover stable). Gives time for edge cases, audit logs, final checks.

**Q: Is there a way to test the cutover without affecting production?**  
A: Yes. Deploy to staging, set flags, run smoke test, verify data in staging Supabase/Twenty.

**Q: What's the actual downtime during cutover?**  
A: Zero. Lead capture stays online the whole time. Phases are progressive, each reversible.

---

## Contacts

| Role | Email | Responsibility |
|------|-------|-----------------|
| Peskids Owner | sierrasantiago90@gmail.com | Approval, UA testing |
| ICSO Owner | team@intcloudsysops.com | Approval, UA testing |
| Operations | (your ops team) | Phases 1-5, monitoring |
| Development | (your dev team) | ICSO migration (if needed) |

---

## Documents in This Series

1. **TWENTY-CRM-CUTOVER-CHECKLIST.md** — Step-by-step procedure (5 phases)
2. **PESKIDS-GHL-MIGRATION-STATUS.md** — Detailed analysis of what's automated/manual
3. **PESKIDS-GHL-DISABLE-RUNBOOK.md** — Quick how-to disable GHL (one-liner)
4. **ICSO-CRM-READINESS.md** — Migration plan for ICSO (if needed)
5. **PESKIDS-ICSO-CUTOVER-STATUS.md** — This document (status summary)

**Start here:** This document  
**For Peskids cutover:** → TWENTY-CRM-CUTOVER-CHECKLIST.md  
**For ICSO prep:** → ICSO-CRM-READINESS.md  
**For quick disable:** → PESKIDS-GHL-DISABLE-RUNBOOK.md

---

**Ready to proceed?** Merge branch to main and start Phase 1. 🚀

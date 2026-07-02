# ICSO — CRM Readiness Gap Analysis

**Status:** Not yet ready for Twenty cutover  
**Date:** 2026-07-02  
**Owner:** team@intcloudsysops.com  
**Blocker:** ICSO uses old GHL-first pattern; Peskids uses new local-first + feature flags

---

## Current State (ICSO)

**Lead capture architecture:**
```
POST /api/leads
→ postPeskidsLeadWithGHL()  ← OLD PATTERN (hardcoded GHL-first)
  ├─ Try sendLeadToGHL()
  └─ Fall back to canonical API (Supabase)
```

**Problems:**
- No CRM abstraction layer (no feature flags)
- No Twenty support (hardcoded to GHL only)
- Can't disable GHL without code changes
- Inconsistent with Peskids (which migrated successfully)

**Files affected:**
- `apps/intcloudsysops/app/api/leads/route.ts` — calls `postPeskidsLeadWithGHL()`
- `apps/intcloudsysops/lib/peskids-canonical-api.ts` — only has GHL sync, no CRM router
- `.env.example` — no TWENTY/GHL flags documented

---

## Target State (Post-Migration)

**Lead capture architecture (matching Peskids):**
```
POST /api/leads
→ postIntcloudsysopsLeadWithCRM()  ← NEW PATTERN (local-first + abstraction)
  ├─ Supabase insert (immediate)
  └─ async syncLeadToCrm()
     ├─ if isTwentyConfigured() → sendLeadToTwenty()
     └─ if isIntcloudsysopsGhlEnabled() → sendLeadToGHL()
```

**Benefits:**
- Feature-flag driven (can disable GHL via Doppler)
- Supports Twenty as primary CRM
- Local-first (Supabase is source of truth)
- Consistent architecture with Peskids
- No code changes needed to disable GHL

---

## Migration Checklist

### Phase 1: Create Abstraction Layer

**1.1 Create `apps/intcloudsysops/lib/intcloudsysops-crm-sync.ts`**

Copy pattern from Peskids (`apps/peskids/lib/peskids-crm-sync.ts`):

```typescript
import { isIntcloudsysopsGhlEnabled, isTwentyConfigured } from '@intcloudsysops/services/twenty';
import { sendLeadToGHL } from '@/lib/gohighlevel-lead-sync';
import { sendLeadToTwenty } from '@/lib/twenty-lead-sync';

export type CrmLeadSyncInput = {
  parentName: string;
  email: string;
  phone?: string;
  gradeInterested?: string;
  source?: string;
};

export type CrmLeadSyncResult = {
  ghlContactId?: string;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

export async function syncLeadToCrm(data: CrmLeadSyncInput): Promise<CrmLeadSyncResult> {
  const result: CrmLeadSyncResult = {};

  if (isTwentyConfigured()) {
    const twentyResult = await sendLeadToTwenty({
      parentName: data.parentName,
      email: data.email,
      phone: data.phone,
      gradeInterested: data.gradeInterested,
      source: data.source,
    });
    if (twentyResult) {
      result.twentyPersonId = twentyResult.twentyPersonId;
      result.twentyOpportunityId = twentyResult.twentyOpportunityId;
    }
  }

  if (isIntcloudsysopsGhlEnabled()) {
    const ghlResult = await sendLeadToGHL({
      parentName: data.parentName,
      email: data.email,
      phone: data.phone,
      gradeInterested: data.gradeInterested,
      source: data.source || 'web',
    });
    if (ghlResult) {
      result.ghlContactId = ghlResult.ghlContactId;
    }
  }

  return result;
}
```

**Status:** Ready to implement (copy from Peskids is zero-risk, idempotent)

**1.2 Update `lib/services/twenty/env-config.ts` to support ICSO flags**

Add function:
```typescript
export function isIntcloudsysopsGhlEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return parseBooleanFlag(env.INTCLOUDSYSOPS_GHL_ENABLED, false);
}
```

**Status:** One-liner, safe, follows existing pattern

### Phase 2: Update Lead Capture Route

**2.1 Rename `peskids-canonical-api.ts` → `intcloudsysops-canonical-api.ts` (in ICSO app)**

OR keep current name but document it's tenant-agnostic (not ideal, but less risky).

**2.2 Update `apps/intcloudsysops/app/api/leads/route.ts`**

Before:
```typescript
const canonical = await postPeskidsLeadWithGHL({ ... }, requestId);
```

After:
```typescript
const crmResult = await syncLeadToCrm({
  parentName: body.name,
  email: body.email,
  phone: body.phone,
  gradeInterested: body.grade_interested,
  source: body.referral_source,
});

const canonical = await postIntcloudsysopsCanonicalLead(
  body,
  requestId,
  crmResult
);
```

Also update return type to include Twenty IDs:
```typescript
return successJson(requestId, {
  ok: true,
  id: canonical.leadId,
  lead_id: canonical.leadId,
  tenant_slug: canonical.tenantSlug,
  referral_code: referralCode,
  referral_link: referralLink,
  ghl_contact_id: crmResult.ghlContactId ?? null,
  twenty_person_id: crmResult.twentyPersonId ?? null,      // NEW
  twenty_opportunity_id: crmResult.twentyOpportunityId ?? null,  // NEW
}, 201);
```

**Status:** Moderate risk (changes API response shape, but additive only)

### Phase 3: Update Environment

**3.1 Add to `.env.example`**

```bash
# Twenty (primary CRM, replaces GHL by default)
TWENTY_API_URL=https://crm-intcloudsysops.op-sly.com
TWENTY_API_KEY=<api-key>
INTCLOUDSYSOPS_TWENTY_ENABLED=true
TWENTY_DEFAULT_OPPORTUNITY_STAGE=NEW

# GoHighLevel (legacy, opt-in only)
INTCLOUDSYSOPS_GHL_ENABLED=false
GOHIGHLEVEL_INTCLOUDSYSOPS_API_KEY=<api-key>
```

**Status:** Documentation only, no risk

### Phase 4: Testing

**4.1 Create smoke test**

Create `scripts/intcloudsysops/twenty-crm-smoke.sh` (copy from Peskids, update tenant slug):

```bash
#!/bin/bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3005}"
RESULT=$(curl -s -X POST "$BASE_URL/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Prospect",
    "email": "test-icso-'$(date +%s)'@example.com",
    "phone": "+573000000000",
    "grade_interested": "K-5",
    "referral_source": "web",
    "consent_treatment": true
  }')

echo "$RESULT" | jq .

OK=$(echo "$RESULT" | jq -r '.ok // false')
if [[ "$OK" != "true" ]]; then
  echo "❌ Lead capture failed"
  exit 1
fi

echo "✅ Lead capture OK"

if [[ "${INTCLOUDSYSOPS_SMOKE_EXPECT_IDS:-false}" == "true" ]]; then
  TWENTY_ID=$(echo "$RESULT" | jq -r '.twenty_person_id // null')
  if [[ "$TWENTY_ID" == "null" || -z "$TWENTY_ID" ]]; then
    echo "❌ Expected twenty_person_id in response"
    exit 1
  fi
  echo "✅ Twenty person ID: $TWENTY_ID"
fi
```

**Status:** Ready to implement (template provided)

**4.2 Test locally**

```bash
# 1. Start ICSO app
npm run dev --workspace=@intcloudsysops/app

# 2. Run smoke test (should use old pattern: GHL + Supabase)
bash scripts/intcloudsysops/twenty-crm-smoke.sh http://localhost:3005

# 3. After migration, test with Twenty enabled
export INTCLOUDSYSOPS_TWENTY_ENABLED=true
export TWENTY_API_URL=https://staging-crm-icso.op-sly.com
export TWENTY_API_KEY=test-key-staging
INTCLOUDSYSOPS_SMOKE_EXPECT_IDS=true bash scripts/intcloudsysops/twenty-crm-smoke.sh http://localhost:3005
```

**Status:** Procedural, low risk

---

## Timeline & Effort

| Task | Effort | Time | Owner |
|------|--------|------|-------|
| 1.1 Create crm-sync.ts | 5 min | Copy-paste from Peskids | Dev |
| 1.2 Add env flag function | 2 min | One-liner | Dev |
| 2.1 Rename canonical-api | 10 min | Refactor (or skip) | Dev |
| 2.2 Update leads route | 20 min | Logic + response shape | Dev |
| 3.1 Update .env.example | 5 min | Documentation | Dev |
| 4.1 Create smoke script | 10 min | Copy + adapt | Dev |
| 4.2 Local test | 15 min | Manual verification | QA |
| Type-check + lint | 5 min | Pre-commit | CI |
| **TOTAL** | **72 min** | ~1.5 hours | 1 developer |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| API response shape changes | Additive only; existing clients unaffected; document changelog |
| Feature flags not read | Test with `INTCLOUDSYSOPS_TWENTY_ENABLED=true` locally first |
| Twenty API not available | Fallback to Supabase-only (Twenty is optional, GHL is optional) |
| ICSO/Peskids ID conflicts | Use separate `sendLeadToGHL()` call with ICSO-specific contact data |

---

## What NOT to Do

- ❌ Do NOT copy-paste code without understanding the pattern
- ❌ Do NOT reuse Peskids' `peskids-canonical-api.ts` directly (tenant slug hardcoded to 'peskids')
- ❌ Do NOT assume ICSO and Peskids can share the same crm-sync.ts (different feature flags)
- ❌ Do NOT merge this migration with other ICSO features (keep it focused)

---

## After Migration: Ready for Cutover

Once migration complete, ICSO follows the same 5-phase cutover as Peskids:

1. **Phase 1:** Deploy ICSO app with new code
2. **Phase 2:** Set `INTCLOUDSYSOPS_TWENTY_ENABLED=true` + `INTCLOUDSYSOPS_GHL_ENABLED=false` in Doppler
3. **Phase 3:** Run ICSO smoke test
4. **Phase 4:** Validate data in Supabase + Twenty
5. **Phase 5:** Monitor 24h

See: `docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md` (Parallel: ICSO Cutover section)

---

## Key Difference: Peskids vs ICSO

| Aspect | Peskids | ICSO |
|--------|---------|------|
| **Current status** | ✅ Migrated to local-first + flags | ❌ Still on GHL-first (old) |
| **Ready for cutover** | ✅ Yes (immediately) | ❌ No (blocked on migration) |
| **Effort to cutover** | Low (flag flip) | High (migration + flag flip) |
| **CRM sync pattern** | Abstract layer (syncLeadToCrm) | Hardcoded GHL call |
| **Feature flags** | Yes (PESKIDS_TWENTY_ENABLED) | No yet (blocked) |
| **Twenty support** | Yes | No yet (blocked) |

---

## Next Steps

1. **For Operators:** Do NOT attempt ICSO cutover in parallel with Peskids. Complete Peskids first.
2. **For Developers:** After Peskids cutover stabilizes (day 3+), start ICSO migration (~1.5h effort).
3. **For Product:** Schedule separate cutover window for ICSO after migration (could be same day or later week).

---

## Questions?

- **"Can we skip ICSO migration?"** — No. ICSO needs the abstraction to support Twenty + disable GHL consistently.
- **"Can we do it in parallel with Peskids cutover?"** — No. Separate timelines for safety (staging first).
- **"Why not just update Peskids and copy to ICSO?"** — Different feature flags, different tenant configs; must be separate.
- **"How long does migration take?"** — ~1.5 hours for 1 developer (low risk, high confidence).

---

See also: `PESKIDS-GHL-MIGRATION-STATUS.md` for Peskids readiness details

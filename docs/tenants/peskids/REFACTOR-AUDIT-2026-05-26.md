# PESKIDS REFACTOR AUDIT REPORT
**Date:** 2026-05-26  
**Auditor:** Claude (scope-review branch rebase)  
**Scope:** Verify Phases 1-4 implementation, identify Phase 2 gaps

---

## ✅ COMPLETED: Phases 1, 3, & 4

### Phase 1: Remove Stale Code ✅
- **Status:** DONE (commit `16e04bc`)
- **Changes:** Removed `src/app/` and `src/components/` stubs
- **Verification:** No imports reference deleted paths

### Phase 3a: Extract Jelou Service ✅
| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Webhook route lines | 316 | 43 | ✅ 86% reduction |
| Service lines | 0 | 224 | ✅ New file |
| Handlers | Inline | Exported functions | ✅ Reusable |

**File:** `apps/peskids/lib/services/jelou.service.ts`  
**Exports:** `handleLeadSubmission()`, `handleFeedbackSubmission()`  
**Quality:**
- ✅ Proper typing (JelouWebhookPayload)
- ✅ Request ID logging
- ✅ Error handling per handler
- ✅ Referral code logic isolated
- ✅ Supabase operations clean

### Phase 3b: Dashboard Service Extraction ✅
**File:** `apps/peskids/lib/services/dashboard.service.ts` (4.1KB)  
**Status:** ✅ Exists and integrated

### Phase 3c & Phase 4: Zod Validation + Patterns ✅
| Route | Zod Schema | Request ID | Status |
|-------|-----------|-----------|--------|
| `/api/feedback` | `feedbackSchema` | ✅ `x-request-id` | ✅ DONE |
| `/api/leads` | `leadSchema` | ✅ | ✅ DONE |
| `/api/webhooks/jelou` | N/A (parsed + verified) | ✅ | ✅ DONE |

**Validation Files:**
- `lib/validation/feedback.schema.ts` ✅
- `lib/validation/lead.schema.ts` ✅
- `lib/validation/form-field-validation.ts` ✅

**Error Response Format:**
```typescript
{ ok: false, error: "...", request_id: requestId }
```
✅ Consistent across all routes

---

## ⚠️ INCOMPLETE: Phase 2 (Component Splitting)

### Giant Components (>300 lines) Still Exist:

| Component | Lines | Target | Status |
|-----------|-------|--------|--------|
| `portal-showcase.tsx` | **951** | Split into 5 | ❌ NOT STARTED |
| `dashboard-view.tsx` | **719** | Split into 3-4 | ❌ NOT STARTED |
| `teacher-weekly-dashboard.tsx` | **504** | Split into 3 | ❌ NOT STARTED |
| `feedback-composer.tsx` | 282 | Split into 4 | ❌ NOT STARTED |
| `message-inbox-panel.tsx` | 299 | Split or refactor | ❌ NOT STARTED |

### Phase 2 Plan (NOT YET IMPLEMENTED):

#### 1. Landing Page Split (portal-showcase.tsx: 951→<250 lines)
**Proposed breakdown:**
- `portal-showcase.tsx` — orchestrator shell (<100L)
- `portal-showcase-hero.tsx` — hero section
- `portal-showcase-features.tsx` — features grid
- `portal-showcase-testimonials.tsx` — testimonials section
- `portal-showcase-cta.tsx` — call-to-action

**Risk:** LOW — purely UI components, no data logic

#### 2. Admin Dashboard Split (dashboard-view.tsx: 719→<250L)
**Proposed breakdown:**
- `dashboard-view.tsx` — layout + orchestrator
- `dashboard-stats-grid.tsx` — StatCard grid
- `dashboard-recent-activity.tsx` — lead/feedback list
- `dashboard-charts.tsx` — optional metrics visualization

**Risk:** MEDIUM — contains lead filtering + referral link logic; must extract carefully

#### 3. Feedback Composer Split (feedback-composer.tsx: 282→<150L)
**Proposed breakdown:**
- `feedback-composer.tsx` — shell
- `feedback-form.tsx` — form input
- `feedback-history.tsx` — past submissions
- `feedback-approval-modal.tsx` — approval UI

**Risk:** MEDIUM — approval workflow has side effects (N8N dispatch); test thoroughly

#### 4. Teacher Dashboard Split (teacher-weekly-dashboard.tsx: 504→<200L)
**Proposed breakdown:**
- `teacher-weekly-dashboard.tsx` — shell
- `teacher-weekly-stats.tsx` — stats cards
- `teacher-weekly-submissions-list.tsx` — submissions grid

**Risk:** LOW — mostly layout, data from props

#### 5. Message Inbox Panel (message-inbox-panel.tsx: 299 lines)
**Status:** NOT IN ORIGINAL PHASE 2 SPEC
**Issue:** 299 lines but only borderline; audit required
- Does it have >2 responsibilities? (modal + drag-drop + approval)
- Should it be split or refactored?

**Recommendation:** Split if it handles multiple concerns

---

## 🔐 Security Context

### Authorization Fixes Applied (May 26)
- Commit `6395f14`: Wrapped peskids routes with `runTrustedPortalDalForPathSlug`
- **Affected routes:** `/api/peskids/admin/[tenantSlug]/forms/analytics` + 6 others
- **Impact on refactor:** Service extraction must preserve auth middleware

### LGPD/Consent Validation Status ✅
- Found in jelou.service: Referral code + lead data handling
- **Status:** ✅ Consent treatment validation enforced (via lead.schema)
- **Risk:** LOW — already in service layer

---

## 📊 Summary

| Phase | Status | Effort | Next |
|-------|--------|--------|------|
| **Phase 1** | ✅ DONE | — | — |
| **Phase 2** | ❌ TODO | 3-4 days | Component splits |
| **Phase 3** | ✅ DONE | — | — |
| **Phase 4** | ✅ DONE | — | — |

---

## 🎯 Recommendations

### Immediate (This Week)
1. **Start Phase 2:** Component splitting (highest bang-for-buck: portal-showcase + dashboard-view)
2. **Test Phase 3:** Run existing tests on jelou/dashboard/feedback services
3. **Security audit:** Verify auth middleware plays nice with Phase 3 services

### Medium Term
1. **Message inbox panel:** Decide split or refactor
2. **E2E tests:** Add for split components (portal-showcase sections, dashboard stats)
3. **Token optimization:** Measure if split improves agent context efficiency

---

## ✅ Quality Gate Check

| Check | Status | Notes |
|-------|--------|-------|
| **No `any` types** | ✅ PASS | Jelou service well-typed |
| **Zod on inputs** | ✅ PASS | feedback, leads, form fields |
| **Service layer** | ✅ PASS | jelou, dashboard extracted |
| **Error handling** | ✅ PASS | request_id logged everywhere |
| **Files <300 lines** | ❌ FAIL | 5 giant components remain |
| **Phase 2 split** | ❌ NOT STARTED | Estimated 3-4 days |

---

## 📋 Next Steps

**GOTO:** Phase 2 Implementation  
**WHO:** Cursor or claude working on feature branch (e.g., `feat/peskids-phase2-component-splits`)  
**DELIVERABLE:** 5 component splits, all <250 lines, type-check + build green

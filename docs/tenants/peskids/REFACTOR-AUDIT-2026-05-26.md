# PESKIDS REFACTOR AUDIT REPORT
**Date:** 2026-05-26  
**Auditor:** Claude (scope-review branch rebase)  
**Scope:** Verify Phases 1-4 implementation, identify Phase 2 gaps

---

## ✅ COMPLETED: Phases 1-4

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

### Phase 3 Tests Added ✅
- `lib/__tests__/dashboard.service.test.ts`
- `lib/__tests__/jelou.service.test.ts`
- `lib/__tests__/role-metrics.test.ts`
- `lib/__tests__/message-store.test.ts`
- `lib/__tests__/submission-chat.test.ts`
- `lib/__tests__/submission-operations.test.ts`
- `app/api/dashboard/__tests__/route.test.ts`
- `app/api/leads/__tests__/route.test.ts`
- `app/api/chat/__tests__/route.test.ts`
- `app/api/families/metrics/__tests__/route.test.ts`
- `app/api/families/feedback/__tests__/route.test.ts`
- `app/api/internal/messages/draft/__tests__/route.test.ts`
- `app/api/messages/[messageId]/reply/__tests__/route.test.ts`
- `app/api/messages/[messageId]/thread/__tests__/route.test.ts`
- `app/api/admin/login/__tests__/route.test.ts`
- `app/api/analytics/__tests__/forms-route.test.ts`
- `app/api/webhooks/inbound/__tests__/route.test.ts`
- `app/api/webhooks/jelou/__tests__/route.test.ts`
- `components/feedback/feedback-composer-submission.test.ts`
- `vitest.config.ts` + `npm run test --workspace=apps/peskids`

**Validation:**
- ✅ service tests green
- ✅ dashboard + leads route edge-case tests green
- ✅ chat + internal draft route contract tests green
- ✅ family metrics/feedback route contract tests green
- ✅ message reply/thread route contract tests green
- ✅ admin team auth/contract tests green
- ✅ admin login contract tests green
- ✅ analytics forms auth/contract tests green
- ✅ inbound webhook auth/payload/success tests green
- ✅ jelou webhook signature/delegation/error tests green
- ✅ family access + submission chat + submissions + teacher submission contracts green
- ✅ feedback route family/staff auth tests green
- ✅ client feedback submission helper tests green
- ✅ submission chat helper/context tests green
- ✅ message store insert/read helper tests green
- ✅ role metrics aggregation tests green
- ✅ submission operations export/stats/bulk actions tests green
- ✅ `npm run type-check --workspace=apps/peskids`
- ✅ `npm run build --workspace=apps/peskids`

### Phase 3c & Phase 4: Zod Validation + Patterns ✅
| Route | Zod Schema | Request ID | Status |
|-------|-----------|-----------|--------|
| `/api/feedback` | `feedbackSchema` | ✅ `x-request-id` | ✅ DONE |
| `/api/leads` | Consent + referral guards | ✅ | ✅ DONE |
| `/api/chat` | Manual validation | ✅ | ✅ DONE |
| `/api/families/metrics` | Family auth + snapshot/data fallback | ✅ | ✅ DONE |
| `/api/families/feedback` | Family auth + feedback fallback | ✅ | ✅ DONE |
| `/api/internal/messages/draft` | Manual validation | ✅ | ✅ DONE |
| `/api/messages/[messageId]/reply` | Staff auth + reply pipeline | ✅ | ✅ DONE |
| `/api/messages/[messageId]/thread` | Staff auth + thread lookup | ✅ | ✅ DONE |
| `/api/admin/team` | Staff auth + role gating | ✅ | ✅ DONE |
| `/api/families/access` | Family auth + link-state payload | ✅ | ✅ DONE |
| `/api/admin/login` | Admin auth + cookie response | ✅ | ✅ DONE |
| `/api/analytics/forms` | Staff auth + analytics payload | ✅ | ✅ DONE |
| `/api/submission-chat/[submissionId]` | Family auth + chat thread/messages | ✅ | ✅ DONE |
| `/api/submissions` | Family auth + parent email filtering | ✅ | ✅ DONE |
| `/api/submissions/teacher` | Staff auth + role gate restore | ✅ | ✅ DONE |
| `/api/submissions/teacher/metrics` | Staff auth + metrics payload | ✅ | ✅ DONE |
| `/api/webhooks/inbound` | Secret + payload guards | ✅ | ✅ DONE |
| `/api/webhooks/jelou` | N/A (parsed + verified) | ✅ | ✅ DONE |

**Validation Files:**
- `lib/validation/feedback.schema.ts` ✅
- `lib/validation/lead.schema.ts` ✅
- `lib/validation/form-field-validation.ts` ✅

**Error Response Format (current aligned set):**
```typescript
{ ok: false, error: "...", request_id: requestId }
```
✅ En dashboard / feedback / leads / chat / families metrics / families feedback / families access / internal draft / messages reply / messages thread / admin team / admin login / analytics forms / submission chat / submissions / teacher submissions / teacher metrics / inbound webhook / jelou webhook

**Shared helper added:**
- `lib/api-response.ts` centraliza `resolveRequestId()`, `errorJson()`, y `successJson()`

---

## ✅ COMPLETE: Phase 2 (Component Splitting)

### Large Components Reviewed:

| Component | Lines | Target | Status |
|-----------|-------|--------|--------|
| `portal-showcase.tsx` | **30** | Split into 5 | ✅ DONE |
| `dashboard-view.tsx` | **147** | Split into 3-4 | ✅ DONE |
| `teacher-weekly-dashboard.tsx` | **<200** | Split into 3 | ✅ DONE |
| `message-inbox-panel.tsx` | **141** | Split or refactor | ✅ DONE |

### Phase 2 Plan (Implemented):

#### 1. Landing Page Split (portal-showcase.tsx: 951→30 lines)
**Proposed breakdown:**
- `portal-showcase.tsx` — orchestrator shell (<100L)
- `portal-showcase-hero.tsx` — hero section
- `portal-showcase-features.tsx` — features grid
- `portal-showcase-testimonials.tsx` — testimonials section
- `portal-showcase-cta.tsx` — call-to-action

**Risk:** LOW — completed, purely UI components

#### 2. Admin Dashboard Split (dashboard-view.tsx: 719→147 lines)
**Proposed breakdown:**
- `dashboard-view.tsx` — layout + orchestrator
- `dashboard-stats-grid.tsx` — StatCard grid
- `dashboard-recent-activity.tsx` — lead/feedback list
- `dashboard-charts.tsx` — optional metrics visualization

**Risk:** MEDIUM — completed, filtering and next-action logic preserved in shell

#### 3. Teacher Dashboard Split (teacher-weekly-dashboard.tsx: 504→<200L)
**Proposed breakdown:**
- `teacher-weekly-dashboard.tsx` — shell
- `teacher-weekly-overview.tsx` — hero + progress widgets
- `teacher-today-agenda-card.tsx` — agenda actions
- `teacher-notes-actions-panel.tsx` — notes + quick actions
- `teacher-weekly-static-data.ts` — seed content and types
- `teacher-weekly-submissions-list.tsx` — submissions grid

**Risk:** LOW — completed, data loading stayed in the shell

#### 4. Message Inbox Panel (message-inbox-panel.tsx: 300→141 lines)
**Breakdown applied:**
- `message-inbox-panel.tsx` — shell + async state
- `message-inbox-item.tsx` — inbox row rendering and actions
- `message-reply-composer.tsx` — reply approval composer
- `message-inbox-utils.ts` — shared labels, tones, and helpers

**Risk:** LOW — behavior preserved, responsibilities separated

---

## 🔐 Security Context

### Authorization Fixes Applied (May 26)
- Commit `6395f14`: Wrapped peskids routes with `runTrustedPortalDalForPathSlug`
- **Affected routes:** `/api/peskids/admin/[tenantSlug]/forms/analytics` + 6 others
- **Impact on refactor:** Service extraction must preserve auth middleware
- `GET /api/analytics/forms`: now enforces `validateStaffRequest()` before analytics reads
- `POST /api/feedback`: now requires staff auth for `audience=admin` or `author_type=teacher|staff`, and family auth for parent-family flows

### LGPD/Consent Validation Status ✅
- Found in jelou.service: Referral code + lead data handling
- **Status:** ✅ Consent treatment validation enforced before touching Supabase in `/api/leads`
- **Risk:** LOW — already in service layer

---

## 📊 Summary

| Phase | Status | Effort | Next |
|-------|--------|--------|------|
| **Phase 1** | ✅ DONE | — | — |
| **Phase 2** | ✅ DONE | — | — |
| **Phase 3** | ✅ DONE | — | — |
| **Phase 4** | ✅ DONE | — | — |

---

## 🎯 Recommendations

### Immediate (This Week)
1. **Security audit:** Verify auth middleware plays nice with Phase 3 services.
2. **Document next UX pass:** Decide whether to add inbox-specific interaction tests.
3. **Broaden webhook coverage:** Keep `inbound` + `jelou` under regression coverage as the intake path evolves.
4. **Expand to any newly added routes:** keep `api-response.ts` as the default contract helper for future Peskids endpoints.

### Medium Term
1. **E2E tests:** Add for split components (portal-showcase sections, dashboard stats)
2. **Token optimization:** Measure if split improves agent context efficiency
3. **Inbox UX polish:** Consider draft persistence and optimistic send state

---

## ✅ Quality Gate Check

| Check | Status | Notes |
|-------|--------|-------|
| **No `any` types** | ✅ PASS | Jelou service well-typed |
| **Zod on inputs** | ✅ PASS | feedback, leads, form fields |
| **Service layer** | ✅ PASS | jelou, dashboard extracted |
| **Error handling** | ✅ PASS | request_id logged everywhere |
| **Service tests** | ✅ PASS | dashboard + jelou service coverage added |
| **Route edge cases** | ✅ PASS | dashboard, leads, chat, family, message, and internal draft contracts covered |
| **Webhook route tests** | ✅ PASS | inbound + jelou auth/delegation/error paths covered |
| **Admin auth contracts** | ✅ PASS | admin team GET/POST now enforce consistent request-scoped payloads |
| **Analytics auth contracts** | ✅ PASS | forms analytics now requires staff auth and returns request-scoped failures |
| **Submission contracts** | ✅ PASS | family + teacher submission endpoints now aligned and authenticated |
| **Client feedback flow** | ✅ PASS | submission helper now validates fields, normalizes payloads, and propagates API errors |
| **Submission chat helper** | ✅ PASS | context resolution, email fallback, thread detection, and route guard regressions covered |
| **Message store helpers** | ✅ PASS | inbound/draft/outbound persistence defaults and conversation reads now have direct regression coverage |
| **Role metrics helpers** | ✅ PASS | family/teacher aggregates now have direct regression coverage |
| **Submission operations helpers** | ✅ PASS | export, grading, deletion, and stats flows now have direct regression coverage |
| **Files <300 lines** | ✅ PASS | Inbox shell now 141 lines |
| **Phase 2 split** | ✅ DONE | Landing, dashboard, teacher, and inbox splits complete |

---

## 🔒 Phase 5 — Security & access surfaces (2026-05-27)

| Change | Files | Rule |
|--------|-------|------|
| Familias: enlace seguro por correo (sin Google OAuth) | `app/familias/login/family-email-login.tsx`, `POST /api/families/access` | Regla 6 |
| Auth callback: redirect por rol + login surface en errores | `app/auth/callback/route.ts`, `lib/auth-callback.ts` | Regla 7 |
| Middleware: protege admin, teacher, support y rutas familias operativas | `middleware.ts`, `lib/surface-route-guards.ts` | Reglas 5, 9 |

**Tests:** `lib/__tests__/surface-route-guards.test.ts`, `app/auth/__tests__/callback-route.test.ts` (rol `parent`).

**Pendiente (siguiente bloque):** ~~unificar escritura de leads~~ ✅ proxy a `POST /api/public/tenants/peskids/leads`; separar UI support vs admin (parcial: oculta equipo/clases); chat/BI con datos live; ADR si se canoniza auth familias en Opsly core.

| Bloque 2 — leads canónicos | `lib/peskids-canonical-api.ts`, `app/api/leads/route.ts` | Escritura única vía Opsly API → `platform.peskids_leads` |

---

## 📋 Next Steps

**GOTO:** keep new Peskids API work on the shared `lib/api-response.ts` contract and add route tests first when touching new endpoints  
**WHO:** Cursor or claude working on the current Peskids feature branch  
**DELIVERABLE:** preserve the aligned `{ ok, error?, request_id }` contract as the default across future endpoint additions

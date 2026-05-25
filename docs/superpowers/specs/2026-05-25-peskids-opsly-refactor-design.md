# Peskids + Opsly Refactor Design
**Date:** 2026-05-25  
**Scope:** `apps/peskids` architectural cleanup + Opsly pattern alignment  
**Goal:** Clean structure, typed code, service layer, token-optimized files for agents

---

## Phase 1 — Peskids: Structural Deduplication

### 1.1 Remove `src/app/` duplicate routes
- `apps/peskids/src/app/forms/` coexists with `apps/peskids/app/` (Next.js App Router)
- **Action:** Delete `src/app/` and `src/components/` — these are stale fragments; canonical routes live in `app/`
- **Risk:** Low — verify no imports reference `src/app/`

### 1.2 Consolidate duplicate component files
Affected pairs (PascalCase vs kebab-case):
- `FormBuilder.tsx` / `form-builder.tsx`
- `FormSubmission.tsx` / `form-submission.tsx`
- `FormPreview.tsx` / `form-preview.tsx`
- `FormBuilderPage.tsx` (no kebab pair — check if used)
- `FormViewer.tsx` (no kebab pair — check if used)

**Action:** Audit imports, keep kebab-case as canonical (Opsly convention), delete PascalCase, update all import sites.

---

## Phase 2 — Peskids: Break Giant Components

### 2.1 `portal-showcase.tsx` (951 lines)
Split into:
- `portal-showcase.tsx` — shell/orchestrator (<100L)
- `portal-showcase-hero.tsx`
- `portal-showcase-features.tsx`
- `portal-showcase-testimonials.tsx`
- `portal-showcase-cta.tsx`

### 2.2 `dashboard-view.tsx` (681 lines)
Split into:
- `dashboard-view.tsx` — layout orchestrator
- `dashboard-stats-grid.tsx`
- `dashboard-recent-activity.tsx`
- `dashboard-charts.tsx`

### 2.3 `teacher-weekly-dashboard.tsx` (504 lines)
Split into:
- `teacher-weekly-dashboard.tsx` — shell
- `teacher-weekly-stats.tsx`
- `teacher-weekly-submissions-list.tsx`

---

## Phase 3 — Peskids: API Routes → Service Layer

### 3.1 `webhooks/jelou/route.ts` (316 lines)
- Extract `handleLeadSubmission` → `lib/services/jelou.service.ts`
- Extract `handleFeedbackSubmission` → `lib/services/jelou.service.ts`
- Fix `any` types: type webhook with Zod schema from `lib/jelou.ts`
- Route becomes ~30 lines: parse → verify signature → dispatch

### 3.2 `feedback/route.ts` (222 lines)
- Extract validation to `lib/validation/feedback.schema.ts` (Zod)
- Extract DB operations → `lib/services/feedback.service.ts`
- Remove manual Set-based validation, replace with Zod `.enum()`
- Route becomes ~40 lines

### 3.3 Other routes
- `dashboard/route.ts` (153L) — extract to `lib/services/dashboard.service.ts`
- `leads/route.ts` (147L) — already has partial service, complete extraction

---

## Phase 4 — Opsly Patterns

### 4.1 Apply `opsly-api` patterns
- All routes: `requestId` header, structured error response `{ ok: false, error, request_id }`
- Zod on all inputs at system boundary
- No `any` — TypeScript strict

### 4.2 Apply `opsly-frontend` patterns
- Components: single responsibility, <200 lines per file
- Hooks: one concern per hook
- No business logic in components

### 4.3 Token optimization
- Smaller focused files → agents load less per context window
- RTK-compatible file sizes (grep-friendly, no 1000-line blobs)
- Skill alignment: verify `node scripts/skill-finder.js` covers peskids domain

---

## Success Criteria
- No file in `apps/peskids` exceeds 300 lines (except generated/data files)
- No duplicate component files (PascalCase + kebab-case)
- No `any` in TypeScript
- All API routes use Zod validation + service layer
- `src/app/` removed
- All tests pass after changes

---

## Implementation Order
1. Delete `src/app/` and `src/components/` stubs (safest, no logic change)
2. Consolidate duplicate components (update imports)
3. Extract API route services (jelou, feedback, dashboard, leads)
4. Add Zod schemas for routes missing them
5. Break giant components (portal-showcase, dashboard-view, teacher-weekly-dashboard)
6. Opsly pattern alignment pass
7. Run type-check + tests

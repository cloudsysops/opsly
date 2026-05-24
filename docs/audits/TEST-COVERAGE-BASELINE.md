---
status: baseline-established
date: 2026-05-08T13:20:00Z
methodology: "test file count / source file count"
---

# Test Coverage Baseline

**Measurement date:** 2026-05-08  
**Methodology:** Test files / Source files ratio  
**Note:** This is a *preliminary* baseline. For complete coverage %, run `npm run test -- --coverage`

---

## Coverage by Workspace

| Workspace | Test Files | Source Files | Coverage % | Status | Priority |
|-----------|-----------|--------------|-----------|--------|----------|
| llm-gateway | 32 | 57 | **56.1%** | ✅ GOOD | Maintain |
| mcp | 14 | 48 | **29.2%** | 🟡 OK | Improve |
| api | 59 | 214 | **27.6%** | 🟡 POOR | HIGH |
| orchestrator | 64 | 244 | **26.2%** | 🟡 POOR | HIGH |
| context-builder | 5 | 20 | **25.0%** | 🟡 POOR | MEDIUM |
| portal | 5 | 93 | **5.4%** | 🔴 CRITICAL | URGENT |
| admin | 0 | 92 | **0.0%** | 🔴 CRITICAL | URGENT |

---

## Overall Status

```
Total test files:     179
Total source files:   768
Coverage ratio:       23.3%
Status:               🟡 BELOW INDUSTRY STANDARD
```

**Industry benchmark:** 70-80% (maintainable code)  
**Current gap:** -47% (need ~363 more test files)

---

## Critical Gaps

### 🔴 No Testing in Admin Panel (92 source files)

**Problem:**
- 0 test files for `apps/admin`
- 92 source files untested
- High-risk changes go unvalidated

**Impact:**
- Cost dashboards, user management, reports could break silently
- Regressions not caught before deployment

**Recommendation:**
```bash
# Start with critical paths
npm run test --workspace=@intcloudsysops/admin

# Create test file for:
apps/admin/app/api/users/route.ts
apps/admin/app/api/audit-log/route.ts
apps/admin/components/CostDashboard.tsx
```

**Effort:** 3-5 hours (initial setup)

---

### 🔴 Portal Severely Under-Tested (5 test files for 93 sources)

**Current:** 5.4% coverage  
**Should be:** >50%

**Gap:** 39 missing test files

**Critical missing tests:**
- Authentication flows
- Tenant switching logic
- Payment form submission
- API integration tests

**Effort:** 4-6 hours

---

### 🟡 API Gateway Moderate Coverage (27.6%)

**Current:** 59 test files for 214 sources  
**Should be:** >60%

**Gap:** 70+ missing test files

**What's tested:**
- Core route handling
- Some middleware

**What's missing:**
- Input validation (from Code Review audit)
- Error handling (from Code Review audit)
- Auth edge cases
- Database integration

**Effort:** 5-8 hours

---

### 🟡 Orchestrator Under-Tested (26.2%)

**Current:** 64 test files for 244 sources  
**Should be:** >60%

**Gap:** 82 missing test files

**Critical paths needing tests:**
- Job creation and execution
- Queue handling
- Worker communication
- Error recovery

**Effort:** 6-10 hours

---

## Good News

### ✅ LLM Gateway (56.1% coverage)

- Best-tested workspace
- Should maintain or improve
- Consider as test pattern reference

### ✅ MCP Tools (29.2% coverage)

- Moderate coverage
- Individual tools likely have unit tests

---

## Improvement Roadmap

### Phase 1: CRITICAL (Week 1 — 8 hours)

**Goal:** Get to 40% overall coverage

- [ ] Add tests to admin panel (target: 20 test files)
- [ ] Improve portal coverage (target: 25 test files)
- [ ] Focus on auth, billing, core features

**Commands:**
```bash
npm run test -- --coverage apps/admin
npm run test -- --coverage apps/portal
```

### Phase 2: IMPORTANT (Week 2 — 10 hours)

**Goal:** Reach 60% overall coverage

- [ ] Complete API gateway tests (add 30 test files)
- [ ] Orchestrator critical paths (add 25 test files)

### Phase 3: NICE-TO-HAVE (Week 3+ — 10 hours)

**Goal:** Approach 80% coverage

- [ ] Integration tests (API + Supabase)
- [ ] E2E tests (user workflows)
- [ ] Performance tests

---

## Test Files Needed (Priority Order)

### 🔴 URGENT (Admin + Portal)

1. `apps/admin/app/api/users/route.test.ts` (user management)
2. `apps/admin/app/api/audit-log/route.test.ts` (audit trails)
3. `apps/admin/components/CostDashboard.test.tsx` (cost reporting)
4. `apps/portal/lib/api.test.ts` (API client)
5. `apps/portal/app/auth/page.test.tsx` (authentication)

### 🟡 HIGH (API + Orchestrator)

6. `apps/api/app/api/admin/costs/route.test.ts` (from Code Review)
7. `apps/api/app/api/checkout/session/route.test.ts` (payment)
8. `apps/api/app/api/defense/audits/route.test.ts` (validation)
9. `apps/orchestrator/src/services/job-executor.test.ts` (job execution)
10. `apps/orchestrator/src/queue/worker.test.ts` (worker)

---

## Testing Strategy

### Unit Tests (50% of target)
- Component rendering
- Utility functions
- Individual route handlers

### Integration Tests (30% of target)
- Route + Database
- Auth middleware
- Billing calculations

### E2E Tests (20% of target)
- User signup flow
- Payment flow
- Tenant creation

---

## Commands to Use

```bash
# Run tests for workspace
npm run test --workspace=@intcloudsysops/api

# Run with coverage
npm run test -- --coverage apps/api

# Watch mode during development
npm run test -- --watch apps/admin

# Generate coverage report
npm run test -- --coverage --reporters=html
```

---

## Recommendations

1. **Set minimum coverage requirement:** Require 60%+ in CI/CD
2. **Add coverage badge:** Show current status in README
3. **Create test templates:** Make it easy to add new tests
4. **Pair with Code Review:** Write tests while fixing validation issues
5. **Monitor over time:** Track coverage trend (goal: +5% per sprint)

---

## Next Steps

1. **Generate GitHub issue:** "Test Coverage Baseline: Admin + Portal Critical"
2. **Create test scaffolding:** `npm run generate-test-file --workspace=@intcloudsysops/admin`
3. **Assign ownership:** @qa leads testing improvement
4. **Schedule:** 8 hours this week (admin + portal), then iterate

---

**Status:** ✅ Baseline established. Ready for improvement plan.  
**Owner:** @qa (testing oversight)  
**Priority:** HIGH (pay down technical debt)  
**Impact:** Reduced regressions, faster deployment confidence

---

## Enlaces relacionados

- [[audits/README|audits]]
- [[brain/README|Brain Central]]

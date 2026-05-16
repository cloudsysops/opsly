---
title: Test Coverage Improvement Strategy
status: active
owner: engineering
last_review: 2026-05-14
---

# Test Coverage Improvement Strategy

## Executive Summary

Current state analysis of the Opsly codebase reveals **significant coverage gaps**:
- **0 modules** at critical coverage (≥70%)
- **0 modules** at high coverage (50-70%)
- **9 modules** with low coverage (20-50%)
- **31 modules** with zero coverage (0%)

**Overall:** 157 test files covering 944 source files across 40 modules = **16.6% average coverage**.

## Priority Tiers

### Tier 1: High-Impact, Low-Effort (Start Here)

These modules have existing test infrastructure and strategic importance:

| Module | Current | Tests | Sources | Effort | Impact |
|--------|---------|-------|---------|--------|--------|
| **apps/llm-gateway** | 36.2% | 17 | 47 | Low | High (LLM critical path) |
| **apps/api** | 21.8% | 61 | 280 | Medium | Critical (multi-tenant) |
| **apps/orchestrator** | 23.1% | 50 | 216 | Medium | Critical (core service) |
| **packages/skills/manifest** | 33.3% | 3 | 9 | Low | Medium (skill validation) |

**Action:** Target 50%+ coverage for Tier 1 modules within Q2 2026.

### Tier 2: Strategic Libraries (Foundation)

Core libraries with zero coverage but high reusability:

| Module | Sources | Test Strategy | Example |
|--------|---------|---------------|---------|
| **lib/services** | 1 | Repository pattern tests | Tenant isolation queries |
| **lib/api** | 1 | API response format tests | Error handling, status codes |
| **lib/security** | 1 | Auth, encryption tests | Token validation, PII redaction |
| **lib/prompts** | 5 | Prompt template tests | Agent instruction rendering |
| **lib/observability** | 4 | Logging, trace tests | Context propagation |

**Action:** Establish 60%+ baseline for all lib/* modules.

### Tier 3: UI/Frontend (Gradual)

Lower priority due to visual testing complexity:

| Module | Sources | Strategy |
|--------|---------|----------|
| **apps/admin** | 98 | Component snapshot tests first |
| **apps/portal** | 97 | E2E tests for critical flows |
| **lib/components** | 15 | Storybook + unit tests |

**Action:** Start with smoke tests; expand to component tests by Q3 2026.

### Tier 4: Experimental/Low-Priority

Modules with minimal business logic:

- `apps/airflow` (0 sources)
- `apps/notebooklm-agent` (1 source)
- `apps/billing-service` (1 source)
- `apps/tenant-invitations` (2 sources)
- `apps/experimental` (3 sources)

**Action:** Monitor; test when feature-complete.

## Coverage Thresholds by Module Type

```yaml
# Strategic modules (orchestration, multi-tenant APIs)
apps/api:
  min: 60%
  target: 80%
  
apps/orchestrator:
  min: 60%
  target: 80%

# LLM/ML-critical paths
apps/llm-gateway:
  min: 50%
  target: 70%

# Libraries (shared code, high reuse)
lib/*:
  min: 60%
  target: 80%

# UI applications
apps/portal:
  min: 20%
  target: 40%
  
apps/admin:
  min: 20%
  target: 40%

# Experimental
apps/experimental:
  min: 0%
  target: N/A
```

## Quick Wins (Next 2 Weeks)

### 1. apps/llm-gateway → 50%+ (7 new tests)

**Current:** 17/47 tests (36.2%)

**Focus areas:**
- Provider selection logic (`selectProvider()`)
- Cache hit/miss scenarios
- Error handling for rate limits
- Token counting accuracy

**Test file template:**
```typescript
// apps/llm-gateway/__tests__/provider-selection.test.ts
describe('Provider Selection', () => {
  it('selects fastest provider based on latency history', () => {
    // Setup: 3 providers with different latencies
    // Assert: fastest provider chosen
  });
  
  it('falls back on provider timeout', () => {
    // Setup: provider times out
    // Assert: fallback provider used
  });
});
```

### 2. packages/skills/manifest → 50%+ (2 new tests)

**Current:** 3/9 tests (33.3%)

**Focus areas:**
- Manifest validation schema
- Skill discovery from manifest
- Version compatibility checks

### 3. lib/security → 60%+ (1 module, ~5 tests)

**Current:** 0/1 tests (0%)

**Focus areas:**
- JWT token parsing and validation
- PII redaction logic
- Encryption/decryption helpers

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create test utilities/helpers in `@intcloudsysops/testing`
- [ ] Establish test templates for each module type
- [ ] Set up code coverage tracking in CI/CD

### Phase 2: Quick Wins (Weeks 3-4)
- [ ] Tier 1 modules: 50%+ coverage
- [ ] Tier 2 libraries: 60%+ baseline
- [ ] Enable GitHub Actions test-coverage workflow

### Phase 3: Expansion (Weeks 5-8)
- [ ] Tier 1 modules: 70%+ coverage
- [ ] Tier 2 libraries: 80%+ coverage
- [ ] UI modules: 30%+ coverage

### Phase 4: Excellence (Weeks 9-12)
- [ ] All core modules: 70%+ coverage
- [ ] Automated enforcement via pre-commit hooks
- [ ] Test coverage dashboard in Obsidian Brain

---

## Technical Implementation

### Pre-commit Hook (Coverage Validation)

```bash
#!/bin/bash
# scripts/pre-commit-coverage-check.sh

# Get changed files
CHANGED_FILES=$(git diff --cached --name-only)

# Extract module paths
for file in $CHANGED_FILES; do
  MODULE=$(echo $file | grep -oE '^(apps|lib|packages)/[^/]+' || true)
  if [[ ! -z "$MODULE" ]]; then
    THRESHOLD=$(grep -A2 "^$MODULE:" .github/coverage-thresholds.yml | grep min | cut -d: -f2 | xargs)
    # Run tests for that module and check coverage
  fi
done
```

### CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test-coverage.yml`) now:
1. Runs on every PR and push to main
2. Analyzes coverage with `python3 scripts/analyze-test-coverage.py`
3. Comments PR with coverage summary
4. Creates status check (passes if coverage improving)

**Install:**
```bash
bash scripts/install-coverage-workflow.sh
```

### Monitoring Dashboard

Coverage reports available at:
- **Local:** `python3 scripts/analyze-test-coverage.py`
- **CI artifacts:** `.github/workflows/test-coverage.yml` → Actions tab
- **JSON:** `.coverage-reports/coverage-report.json`
- **Markdown:** `.coverage-reports/COVERAGE.md`

---

## Known Challenges & Mitigations

| Challenge | Impact | Mitigation |
|-----------|--------|-----------|
| **Multi-tenant complexity** | Hard to mock tenant context | Use `@intcloudsysops/testing` utilities for tenant fixtures |
| **External API calls** (Stripe, NotebookLM) | Slow tests, flaky | Mock via `jest.mock()` or use test doubles |
| **React component testing** | Time-consuming for large UI | Start with snapshot tests, add unit tests incrementally |
| **Database migrations** | Require live DB for integration tests | Use Supabase branches for isolated test databases |
| **Real-time systems** (BullMQ, Redis) | Require running services | Use Docker compose in CI; local dev uses containers |

---

## Success Criteria

- [ ] All Tier 1 modules at ≥50% coverage by end of Q2 2026
- [ ] All Tier 2 libraries at ≥60% coverage by end of Q2 2026
- [ ] New code requires test coverage (pre-commit validation)
- [ ] PR comments show coverage impact (delta)
- [ ] Zero regression: coverage never decreases on main branch

---

## References

- **Test Coverage Analysis:** `.coverage-reports/`
- **Analyzer Script:** `scripts/analyze-test-coverage.py`
- **CI Workflow:** `.github/workflows/test-coverage.yml`
- **Testing Library:** `@intcloudsysops/testing` in `lib/testing/`
- **Test Utilities:** `docs/01-development/TESTING-GUIDE.md`

---

**Owner:** Engineering Team  
**Last Updated:** 2026-05-14  
**Status:** Active (Q2 2026 initiative)

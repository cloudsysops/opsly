# Opsly Consolidation Plan - Executive Summary

**Date**: May 9, 2026
**Status**: Ready for Technical Review

---

## Quick Facts

| Metric | Value |
|--------|-------|
| Total Files to Consolidate | 84 |
| Total Lines of Code | ~4,025 |
| Total Effort | 101 hours |
| Minimum Timeline | 3 weeks (2 developers) |
| Recommended Timeline | 5 weeks (2 developers) |
| Number of Lib Modules Affected | 4 core + 9 supporting |
| Risk Level | Medium |
| Breaking Changes | Yes (v2.0 for affected packages) |

---

## The Five Consolidation Areas

### 1. PROMPTS CONSOLIDATION (28 files, 10 hours)
**Status**: Already partially started in `lib/prompts/registry.ts`

**What**: Consolidate cursor prompts, doc prompts, and agent prompts into single registry
- 21 cursor prompts (`.cursor/prompts/`)
- 3 doc prompts (`docs/prompts/`)
- 1 agent prompts file (`apps/orchestrator/src/agents/cloudsysops/prompts.ts`)

**Why**: Single source of truth for all system prompts; better discoverability
**Effort**: 10 hours | **Risk**: Low | **Blocks**: Nothing

**Outcome**: 
- `lib/prompts/registry.ts` enhanced with metadata support
- All prompts loadable from single API: `getPrompt(id)`, `searchPrompts(tags)`, etc.
- Backward compatible re-exports in original locations

---

### 2. OBSERVABILITY CONSOLIDATION (5 files, 13 hours)
**Status**: Partially exists in `lib/observability/`; app code needs migration

**What**: Consolidate job/planner/worker logging + distributed tracing
- Job enqueue logging: `job-log.ts` (34 lines)
- Planner step logging: `planner-log.ts` (40 lines)
- Worker execution logging: `worker-log.ts` (90 lines)
- Distributed tracing: `tracer.ts` (317 lines)
- OpenClaw context propagation: 19 lines

**Why**: Shared observability patterns; enables consistent logging across orchestrator
**Effort**: 13 hours | **Risk**: Medium (tracer complexity) | **Blocks**: Nothing immediate

**Outcome**:
- Unified observability stack in `lib/observability/`
- Job/planner/worker logs follow structured format
- Distributed tracing integrated with app observability

---

### 3. COMPONENTS CONSOLIDATION (30 files, 19 hours)
**Status**: Minimal lib infrastructure; significant duplication in apps

**What**: Deduplicate UI components + consolidate reusable domain components

**Tier 1 - Deduplication** (17 files):
- Button (duplicate in portal + admin → consolidate)
- Card (duplicate in portal + admin → consolidate)
- Input (duplicate in portal + admin → consolidate)
- Skeleton (duplicate in portal + admin → consolidate)
- Badge, Dialog, Progress, Select, Separator, Table, Tooltip (admin-only)
- EmptyState, Accessibility (portal-only)

**Tier 2 - Reusable Domain** (3 files):
- StatusBadge (generic status display)
- ModeSelector (UI mode toggle)
- ServiceCard (generic service card)

**Why**: No duplicate development; shared theme/token system; reduced bundle size
**Effort**: 19 hours | **Risk**: Medium (visual regression) | **Blocks**: Nothing immediate

**Outcome**:
- Single Button, Card, Input, Skeleton implementations with variants
- All 11 unique UI components available in `lib/components/ui/`
- Tier 2 domain components in `lib/components/common/`

---

### 4. EVALUATION CONSOLIDATION (6 files, 24 hours)
**Status**: Distributed across orchestrator + API; minimal lib infrastructure

**What**: Consolidate validation, metrics, feedback, and dashboard logic

**Files to move**:
- `validation-orchestrator.ts` (415 lines) - Job validation logic
- `validation-metrics.ts` (335 lines) - Quality metrics & scoring
- `validation-feedback.ts` (147 lines) - Feedback collection pipeline
- `validation-dashboard.ts` (223 lines) - Dashboard data aggregation
- `validation-utils.ts` (225 lines) - Shared helpers
- `apps/api/lib/validation.ts` (56 lines) - Data validation

**Why**: Enables reuse of validation logic; shared metrics framework; testable feedback pipeline
**Effort**: 24 hours | **Risk**: Medium (circular dependency risks) | **Blocks**: Services validation

**Outcome**:
- `lib/evaluation/validators/` - Job validation, feedback validation, schema validation
- `lib/evaluation/metrics/` - Quality, cost, SLA metrics
- `lib/evaluation/dashboard/` - Data aggregation & trend analysis
- `lib/evaluation/feedback/` - Feedback collection pipeline

---

### 5. SERVICES CONSOLIDATION (Phase 1: 2 files, 7 hours | Phase 3: +15 more, optional)
**Status**: Base repository pattern in `apps/api/lib/base-repository.ts`

**What**: Consolidate data access pattern + optional integration services

**Phase 1 (Immediate):**
- `base-repository.ts` (98 lines) - Generic repository pattern
- `validation.ts` (56 lines) - Data validation helpers

**Phase 3 (Optional):**
- AI services (OpenAI, Anthropic integrations)
- Cloud provider abstractions
- Email, Doppler, webhooks, etc.

**Why**: Generic repository pattern reusable across apps; dependency injection friendly
**Effort**: 7h (Phase 1) + 20h (Phase 3) | **Risk**: Low-Medium | **Blocks**: Phase 2+ consolidations

**Outcome**:
- `lib/services/base-repository.ts` - Generic repository with TypeScript generics
- `lib/services/repository-factory.ts` - Factory for easy repo instantiation
- Optional: `lib/services/integrations/` for shared integration patterns

---

## Execution Timeline

### RECOMMENDED: 5 Weeks with 2 Developers

```
Week 1 (12h total)
├─ Dev A: Prompts consolidation (10h)
└─ Dev B: Base repository migration (2h)

Weeks 2-3 (50h total) - PARALLEL TRACKS
├─ Track A: Observability (13h) + Components Tier 1 (10h)
└─ Track B: Evaluation consolidation (24h) + Services validation (3h)

Weeks 4-5 (39h total) - OPTIONAL EXTENDED
├─ Components Tier 2 (5h)
├─ Services integrations (20h)
├─ Integration testing (10h)
└─ Documentation (4h)
```

**Minimum (3 weeks with 2 developers)**: Phases 1-2 only
- Focus: Prompts, Base Repository, Observability, Components Tier 1, Evaluation
- Defer Phase 3 optional consolidations

---

## Risk Assessment

### Circular Dependencies (Medium)
- **Where**: Validation modules may have mutual dependencies
- **Mitigation**: Careful interface extraction in Phase 1; test early

### Breaking Changes (High Impact, Medium Probability)
- **Where**: Import paths change across all affected modules
- **Mitigation**: Comprehensive testing; gradual migration with re-export wrappers; version bump to v2.0

### Type Safety (Medium)
- **Where**: Generic repository pattern, flexible validation helpers
- **Mitigation**: Strict TypeScript config; no `any` types allowed; regular type-check

### Visual Regression (Medium)
- **Where**: Component deduplication may reveal style differences
- **Mitigation**: Visual regression testing; Chromatic snapshots; before/after styling audit

### Performance (Low)
- **Where**: Bundle size, import chains
- **Mitigation**: Bundle analysis; import benchmarking; lazy-load where appropriate

---

## Success Criteria

### Code Quality
- [ ] 0 duplicate components/utilities
- [ ] 90%+ test coverage for all lib modules
- [ ] 0 `any` types in consolidated code
- [ ] 100% ESLint compliance

### Adoption
- [ ] 100% of apps using consolidated code paths
- [ ] 0 direct imports from apps/*/lib (only via lib modules)
- [ ] CI/CD green for all migrations

### Documentation
- [ ] README for each lib module
- [ ] Migration guide for each breaking change
- [ ] Examples for each major API

---

## Phase Dependencies

```
Phase 1 (independent)
   ↓
Phase 2 (mostly independent, but evaluation info used by components)
   ↓
Phase 3 (optional, depends on Phase 2)
```

**Safe parallelization**:
- Prompts & Services Base Repository (Phase 1) → independent
- Observability & Components & Evaluation (Phase 2) → mostly independent, coordinate on Services validation
- Phase 3 → optional, can defer or run in parallel if resources available

---

## Key Files

**Main Plan Document**:
- `/home/user/opsly/CONSOLIDATION-PLAN.md` (Full 44KB detailed plan with every file listed)

**What's Included in Full Plan**:
1. **Detailed analysis** of each consolidation area
2. **Complete file listings** with paths and line counts
3. **Implementation steps** for each phase
4. **Dependency analysis** and risk factors
5. **Migration guide** for breaking changes
6. **Timeline options** (1, 2, 3 developer scenarios)
7. **Success metrics** and checkpoints
8. **Example code** before/after consolidation

---

## Next Steps

1. **Technical Review** (2-4 hours)
   - Review with technical lead
   - Validate file lists and effort estimates
   - Identify additional dependencies

2. **Approval & Planning** (1 hour)
   - Approve scope and timeline
   - Allocate resources
   - Schedule Phase 1 kickoff

3. **Phase 1 Execution** (Week 1)
   - Start with Prompts (independent, low risk)
   - Parallel: Base Repository migration
   - Establish patterns for Phases 2-3

4. **Phase 2 Execution** (Weeks 2-3)
   - Run Observability, Evaluation, Components Tier 1 in parallel
   - Coordinate on services/validation overlap
   - Heavy testing and integration

5. **Phase 3 Execution** (Weeks 4-5, optional)
   - Extended consolidations
   - Final integration tests
   - Documentation cleanup

---

## Document History

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-05-09 | Claude Code | Draft |


# Consolidation Effort Breakdown - Detailed Work Estimates

---

## 1. PROMPTS CONSOLIDATION - 10 Hours Total

### Task 1.1: Metadata Schema Design (1 hour)

- Define `PromptMetadata` interface with category, tags, status, hash
- Create `lib/prompts/schemas/prompt-metadata.ts`
- Add TypeScript types for Prompt registry enhancements
- **Owner**: 1 developer | **Complexity**: Low

### Task 1.2: Cursor Prompts Migration (4 hours)

- Copy all 21 files from `.cursor/prompts/` to `lib/prompts/cursors/`
- Extract metadata from filenames and content
- Handle subdirectories (`pending/`, `tenants/local-services/`)
- Index by category: executor, architect, reviewer, observability, local-services, e2e-test
- **Owner**: 1 developer | **Complexity**: Low
- **Files affected**: 21

### Task 1.3: Doc Prompts Migration (1 hour)

- Move `docs/prompts/tenant-onboarding/*` to `lib/prompts/tenant-onboarding/`
- Register in registry with metadata
- Update doc links
- **Owner**: 1 developer | **Complexity**: Low
- **Files affected**: 3

### Task 1.4: Agent Prompts Migration (1 hour)

- Extract string exports from `cloudsysops/prompts.ts`
- Create `lib/prompts/agents/cloudsysops/system-prompts.ts`
- Create re-export wrapper in original location
- **Owner**: 1 developer | **Complexity**: Low
- **Files affected**: 1

### Task 1.5: Registry & Loader Updates (2 hours)

- Enhance `lib/prompts/registry.ts` with metadata support
- Implement `searchPrompts(tags, category)` function
- Update `lib/prompts/loader.ts` to load from new structure
- Ensure backward compatibility with old paths
- **Owner**: 1 developer | **Complexity**: Medium
- **Files modified**: 2

### Task 1.6: Tests & Validation (1 hour)

- Write tests for prompt registry metadata
- Test search and filter functions
- Verify all 25 prompts load correctly
- **Owner**: 1 developer | **Complexity**: Low

---

## 2. OBSERVABILITY CONSOLIDATION - 13 Hours Total

### Task 2.1: Type Unification (2 hours)

- Extract all interfaces from 5 observability files
- Create `lib/observability/types.ts`
- Define: `LogField`, `LogContext`, `JobLog`, `PlannerLog`, `WorkerLog`
- Merge with existing types in `logger.ts`
- **Owner**: 1 developer | **Complexity**: Medium
- **Files created**: 1 | **Files modified**: 3

### Task 2.2: Job/Planner/Worker Logs Migration (3 hours)

- Copy 3 files to `lib/observability/`
- Update imports for `OrchestratorJob` type
- Ensure structured format compatibility
- Create re-export wrappers in orchestrator
- **Owner**: 1 developer | **Complexity**: Medium
- **Files created**: 3 | **Files modified**: 2

### Task 2.3: Tracer Enhancement (4 hours)

- Merge `runtime/observability/tracer.ts` into `lib/observability/tracing.ts`
- Extract OpenTelemetry integration
- Implement correlation ID management
- Integrate with existing logger
- **Owner**: 1 developer | **Complexity**: High (tracer is complex)
- **Files modified**: 1 | **LOC affected**: 317

### Task 2.4: OpenClaw Integration (1 hour)

- Add context propagation from `openclaw-observability.ts` to tracer
- Create helper functions for context extraction/injection
- **Owner**: 1 developer | **Complexity**: Low
- **Files modified**: 1

### Task 2.5: Testing & Integration (3 hours)

- Unit tests for each log type
- Integration test for job → planner → worker logging flow
- Tracer integration tests with mock OpenTelemetry
- Mock structured logs verification
- **Owner**: 1-2 developers | **Complexity**: Medium

---

## 3. COMPONENTS CONSOLIDATION - 19 Hours Total

### Task 3.1: Component Audit & Merge Strategy (2 hours)

- Compare Button implementations (portal vs admin)
- Compare Card implementations (portal vs admin)
- Compare Input implementations (portal vs admin)
- Compare Skeleton implementations (portal vs admin)
- Document variant requirements and differences
- **Owner**: 1 developer | **Complexity**: Medium

### Task 3.2: Tier 1 Consolidation - Duplicates (10 hours)

#### Sub-task 3.2a: Button Component (2 hours)

- Merge portal + admin Button variants
- Create `lib/components/ui/Button.tsx` with all variants
- Support size, variant, disabled states
- Test in both portal and admin contexts
- Update portal & admin imports
- **Files**: 3 → 1

#### Sub-task 3.2b: Card Component (1.5 hours)

- Merge portal + admin Card variants
- Create `lib/components/ui/Card.tsx`
- Support different layouts, borders, padding
- **Files**: 2 → 1

#### Sub-task 3.2c: Input Component (1.5 hours)

- Merge portal + admin Input variants
- Create `lib/components/ui/Input.tsx`
- Support error states, validation states
- **Files**: 2 → 1

#### Sub-task 3.2d: Skeleton Component (1.5 hours)

- Merge portal + admin Skeleton variants
- Create `lib/components/ui/Skeleton.tsx`
- **Files**: 2 → 1

#### Sub-task 3.2e: Admin-only Components (2 hours)

- Move Badge, Dialog, Progress, Select, Separator, Table, Tooltip to lib
- No merging needed; just move and test
- **Files**: 7 → 7 (in lib/components/ui/)

#### Sub-task 3.2f: Portal-only Components (1 hour)

- Move EmptyState, Accessibility to lib
- **Files**: 2 → 2

### Task 3.3: Update Import Paths (3 hours)

- Portal imports: 12 components → all use `lib/components`
- Admin imports: 13 components → all use `lib/components`
- Update package references
- Run tests for each app
- **Files modified**: 24 (12 portal + 12 admin)

### Task 3.4: Tier 2 Consolidation - Reusable Domain (2 hours) [OPTIONAL]

- Move StatusBadge to `lib/components/common/`
- Move ModeSelector to `lib/components/common/`
- Move ServiceCard to `lib/components/common/`
- Remove app-specific styling where possible
- Update imports

### Task 3.5: Testing & Visual Regression (2 hours)

- Portal visual tests (components rendering correctly)
- Admin visual tests (components rendering correctly)
- Snapshot tests for component variants
- Test responsive behavior
- **Owner**: 1 developer | **Complexity**: Medium

---

## 4. EVALUATION CONSOLIDATION - 24 Hours Total

### Task 4.1: Type Extraction & Unification (2 hours)

- Extract types from 6 validation files
- Create `lib/evaluation/types.ts`
- Define: `ValidationResult`, `FeedbackItem`, `MetricValue`, `DashboardData`, `ScoringConfig`
- Circular dependency analysis
- **Owner**: 1 developer | **Complexity**: Medium

### Task 4.2: Validator Migration (4 hours)

#### Sub-task 4.2a: Job Validator (1.5 hours)

- Extract validation logic from `validation-orchestrator.ts`
- Create `lib/evaluation/validators/job-validator.ts`
- Implement `validateJobInput()`, `validateJobState()`, `validateTenantIsolation()`
- **Owner**: 1 developer | **Complexity**: Medium

#### Sub-task 4.2b: Feedback Validator (1 hour)

- Extract from `validation-feedback.ts`
- Create `lib/evaluation/validators/feedback-validator.ts`
- Implement `validateFeedbackSchema()`, `validateAggregation()`
- **Owner**: 1 developer | **Complexity**: Low

#### Sub-task 4.2c: Schema Validators (1.5 hours)

- Migrate from `apps/api/lib/validation.ts`
- Create `lib/evaluation/validators/schema-validators.ts`
- Generic validators for common patterns
- **Owner**: 1 developer | **Complexity**: Low

### Task 4.3: Metrics Migration (5 hours)

#### Sub-task 4.3a: Quality Metrics (2 hours)

- Extract from `validation-metrics.ts`
- Create `lib/evaluation/metrics/quality-metrics.ts`
- Success rate, error rate, reliability scoring
- **Owner**: 1 developer | **Complexity**: Medium

#### Sub-task 4.3b: Cost Metrics (1.5 hours)

- Extract cost tracking logic
- Create `lib/evaluation/metrics/cost-metrics.ts`
- Budget calculations, cost forecasting
- **Owner**: 1 developer | **Complexity**: Medium

#### Sub-task 4.3c: SLA Metrics (1.5 hours)

- Extract SLA compliance logic
- Create `lib/evaluation/metrics/sla-metrics.ts`
- Uptime, response time, SLA violations
- **Owner**: 1 developer | **Complexity**: Low

### Task 4.4: Dashboard Data Preparation (4 hours)

#### Sub-task 4.4a: Metrics Aggregator (2 hours)

- Extract from `validation-dashboard.ts`
- Create `lib/evaluation/dashboard/metrics-aggregator.ts`
- Aggregate metrics by time window, tenant, job type
- **Owner**: 1 developer | **Complexity**: Medium

#### Sub-task 4.4b: Trend Analyzer (1.5 hours)

- Extract trend analysis logic
- Create `lib/evaluation/dashboard/trend-analyzer.ts`
- Trend detection, forecasting, anomaly detection
- **Owner**: 1 developer | **Complexity**: Medium

#### Sub-task 4.4c: Time Series Data (0.5 hours)

- Helper functions for time series aggregation
- **Owner**: 1 developer | **Complexity**: Low

### Task 4.5: Feedback Pipeline (3 hours)

#### Sub-task 4.5a: Feedback Collector (1.5 hours)

- Extract from `validation-feedback.ts`
- Create `lib/evaluation/feedback/collector.ts`
- Collect feedback from agents, validators, humans
- **Owner**: 1 developer | **Complexity**: Medium

#### Sub-task 4.5b: Feedback Aggregator (1.5 hours)

- Create `lib/evaluation/feedback/aggregator.ts`
- Aggregate feedback by job, tenant, time window
- Integrate with Supabase
- **Owner**: 1 developer | **Complexity**: Medium

### Task 4.6: Utilities Migration (2 hours)

- Extract from `validation-utils.ts`
- Create `lib/evaluation/utils.ts`
- Scoring helpers, calculation functions
- **Owner**: 1 developer | **Complexity**: Low

### Task 4.7: Update Imports & Testing (4 hours)

- Update `apps/orchestrator/src/lib/validation*.ts` to re-export from lib
- Update `apps/api/lib/validation.ts` to re-export from lib
- Run orchestrator validation tests (5-10 tests)
- Run API tests (2-3 tests)
- Integration tests (3-5 tests)
- **Owner**: 1-2 developers | **Complexity**: Medium

---

## 5. SERVICES CONSOLIDATION - Phase 1: 7 Hours, Phase 3: 20 Hours

### PHASE 1 (Immediate)

### Task 5.1: Base Repository Migration (2 hours)

- Copy `apps/api/lib/base-repository.ts` to `lib/services/`
- Extract Supabase client to constructor param (dependency injection)
- Ensure no hardcoded imports
- Create `lib/services/types.ts` for repository interfaces
- Update `apps/api/lib/base-repository.ts` as re-export wrapper
- **Owner**: 1 developer | **Complexity**: Low
- **Files created**: 2 | **Files modified**: 1

### Task 5.2: Validation Service (1 hour)

- Coordinate with Evaluation consolidation
- Decide: move to `lib/evaluation/` or `lib/services/`
- Migrate `apps/api/lib/validation.ts`
- Update imports
- **Owner**: 1 developer | **Complexity**: Low
- **Files affected**: 2

### Task 5.3: Repository Factory (2 hours) [OPTIONAL]

- Create `lib/services/repository-factory.ts`
- Implement factory pattern for repository instantiation
- Example usage: `const repos = createRepositories(client, definitions)`
- Support for custom repository classes
- **Owner**: 1 developer | **Complexity**: Medium
- **Files created**: 1

### Task 5.4: Testing (2 hours)

- Unit tests for BaseRepository (CRUD operations)
- Mock Supabase client
- Test dependency injection
- Verify no breaking changes in API tests
- **Owner**: 1 developer | **Complexity**: Low

### PHASE 3 (Optional - 20 hours)

### Task 5.5: AI Services Integration (6 hours)

- Extract from `apps/api/lib/ai/*` (estimated 3 files)
- Create `lib/services/integrations/ai/`
- Consolidate OpenAI, Anthropic, other LLM integrations
- Implement provider abstraction layer
- **Owner**: 1 developer | **Complexity**: High

### Task 5.6: Cloud Provider Abstractions (6 hours)

- Extract from `apps/api/lib/cloud-providers/*`
- Create `lib/services/integrations/cloud-providers/`
- Support AWS, GCP, Azure abstractions
- **Owner**: 1 developer | **Complexity**: High

### Task 5.7: Email & Communication Services (4 hours)

- Extract from `apps/api/lib/email/*`, `doppler/*`
- Create `lib/services/integrations/email/`
- Email sending, Doppler secrets integration
- **Owner**: 1 developer | **Complexity**: Medium

### Task 5.8: Webhook & Event Services (4 hours)

- Extract webhook handlers
- Create `lib/services/integrations/webhooks/`
- Generic webhook pattern for all integrations
- **Owner**: 1 developer | **Complexity**: Medium

---

## SUMMARY BY PHASE

### Phase 1: Foundation (12 hours)

| Task                     | Effort  | Files  | Complexity     |
| ------------------------ | ------- | ------ | -------------- |
| Prompts consolidation    | 10h     | 28     | Low            |
| Services base repository | 2h      | 1      | Low            |
| **Phase 1 Total**        | **12h** | **29** | **Low-Medium** |

### Phase 2: Core (50 hours)

| Task                | Effort  | Files  | Complexity  |
| ------------------- | ------- | ------ | ----------- |
| Observability       | 13h     | 5      | Medium      |
| Evaluation          | 24h     | 6      | Medium-High |
| Components Tier 1   | 10h     | 17     | Medium      |
| Services validation | 3h      | 2      | Low         |
| **Phase 2 Total**   | **50h** | **30** | **Medium**  |

### Phase 3: Extended (39 hours, OPTIONAL)

| Task                  | Effort  | Files   | Complexity      |
| --------------------- | ------- | ------- | --------------- |
| Components Tier 2     | 5h      | 3       | Low-Medium      |
| Services integrations | 20h     | 15+     | High            |
| Testing & integration | 10h     | —       | Medium          |
| Documentation         | 4h      | —       | Low             |
| **Phase 3 Total**     | **39h** | **18+** | **Medium-High** |

### GRAND TOTAL

- **Total Effort**: 101 hours
- **Total Files**: 84 (+ 15+ optional in Phase 3)
- **Total LOC**: ~4,025
- **Timeline**: 5 weeks (2 developers, full-time)
- **Minimum**: 3 weeks (Phases 1-2 only)

---

## Effort Distribution by Developer Type

### Solo Developer (Full-time)

- Week 1: Prompts (10h) + Services base (2h) = 12h
- Weeks 2-3: Observability (13h) + Components (10h) = 23h (of 50h Phase 2)
- Weeks 4-6: Evaluation (24h) + testing (8h) = 32h
- **Timeline**: 6 weeks | **Effort**: 101 hours

### Two Developers (Full-time)

- Week 1: Dev A does Prompts (10h), Dev B does Services base (2h)
- Weeks 2-3: Dev A does Observability (13h) + Components (10h), Dev B does Evaluation (24h)
- Weeks 4-5: Phase 3 optional tasks or extended testing
- **Timeline**: 5 weeks | **Effort**: 101 hours total (50h + 51h)

### Three Developers (Part-time)

- Week 1: All 3 devs at 33% on Phase 1 = 12h distributed
- Weeks 2-3: All 3 devs at 50-60% on Phase 2 = 50h distributed
- Weeks 4-5: All 3 devs at 50-60% on Phase 3 = 39h distributed
- **Timeline**: 5 weeks | **Effort**: 101 hours total (33h + 33h + 35h)

---

## Risk/Complexity Adjustments

If risks materialize, add buffer:

- **Circular dependencies found**: +2-4 hours for refactoring
- **Visual regression failures**: +2-4 hours for styling fixes
- **Type safety issues**: +1-2 hours for type extraction
- **Test coverage gaps**: +2-3 hours for additional tests
- **Integration issues**: +2-3 hours for debugging

**Recommended buffer**: Add 10-20% to estimates = 111-121 hours total (5.5-6 weeks with 2 developers)

---

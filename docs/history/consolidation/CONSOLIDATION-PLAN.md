# Opsly Code Consolidation Plan: Apps → Lib Modules

**Date**: May 9, 2026
**Status**: Planning Phase
**Scope**: Move 1,401 lines of code + 30 component files from apps/ into 13 lib modules

---

## Executive Summary

This plan consolidates fragmented code across `apps/orchestrator`, `apps/api`, `apps/portal`, and `apps/admin` into centralized, reusable lib modules. The consolidation improves:

- **Code reuse**: No duplicate validation/observability logic
- **Maintainability**: Single source of truth for each concern
- **Testing**: Shared test infrastructure
- **Performance**: Reduced import chains and bundle size

**Total Effort**: ~4-5 weeks (with 2 developers)
**Risk Level**: Medium (requires careful import path updates)
**Breaking Changes**: Yes (requires major version bump for affected packages)

---

## 1. PROMPTS CONSOLIDATION

### Current State
- **Cursor Prompts**: 21 files in `.cursor/prompts/` (24 KB)
- **Doc Prompts**: 3 files in `docs/prompts/tenant-onboarding/` (8 KB)
- **Agent Prompts**: 1 file in `apps/orchestrator/src/agents/cloudsysops/prompts.ts` (88 lines)
- **Status**: Partially consolidated in `lib/prompts/registry.ts`

### Files to Consolidate

#### 1.1 Cursor Prompts (21 files)
```
.cursor/prompts/
├── README.md
├── e2e-test-1777846828.md
├── e2e-test.md
├── fix-organize-autonomous-system.md
├── legalvial-phase2b-automation.md
├── local-services-automation.md
├── local-services-mvp.md
├── local-services-ops-admin.md
├── local-services-phase2-automation.md
├── local-services-sales-closer.md
├── local-services-tech-builder.md
├── parallel-task-1-executor.md
├── parallel-task-2-architect.md
├── parallel-task-3-reviewer.md
├── parallel-task-4-observability.md
├── task-orchestrator-completion.md
├── test-cursor-execution.md
├── test-local-cursor-phase1.md
├── pending/prompt-test-1.md
├── pending/prompt-test-1777851022.md
└── tenants/local-services/piloto-automatizaciones.md
```

**Metadata Extraction**:
- Name (from filename)
- Category (executor, architect, reviewer, observability, local-services, e2e-test, etc.)
- Purpose/Tags (extracted from content)
- Created date (file mtime)
- Updated date (git log)

#### 1.2 Doc Prompts (3 files)
```
docs/prompts/
├── tenant-onboarding/TENANT-ONBOARDING-TEMPLATE.md
├── tenant-onboarding/INFRASTRUCTURE-SETUP.md
└── tenant-onboarding/DEPLOYMENT-VALIDATION.md
```

**Category**: `tenant-onboarding`

#### 1.3 Agent Prompts (1 file)
- `/home/user/opsly/apps/orchestrator/src/agents/cloudsysops/prompts.ts` (88 lines)
- **Type**: TypeScript module with exported prompt strings
- **Category**: `agent/cloudsysops`

### Consolidation Target

**Destination**: `lib/prompts/registry.ts` + new directories:
```
lib/prompts/
├── registry.ts (existing - enhance)
├── loader.ts (existing - enhance)
├── index.ts
├── schemas/
│   └── prompt-metadata.ts (NEW)
├── cursors/ (NEW)
│   ├── executor.md
│   ├── architect.md
│   ├── reviewer.md
│   ├── observability.md
│   ├── local-services.md
│   ├── e2e-testing.md
│   └── [18 more]
├── agents/ (NEW)
│   └── cloudsysops/
│       └── system-prompts.ts
└── tenant-onboarding/ (NEW)
    ├── TENANT-ONBOARDING-TEMPLATE.md
    ├── INFRASTRUCTURE-SETUP.md
    └── DEPLOYMENT-VALIDATION.md
```

### Implementation Steps

**Phase 1: Metadata & Structure**
1. Create `lib/prompts/schemas/prompt-metadata.ts` with interfaces
2. Update `lib/prompts/registry.ts` to support structured metadata
3. Create indexing for prompts by category, tags, status

**Phase 2: Cursor Prompts Migration**
1. Copy all `.cursor/prompts/*.md` to `lib/prompts/cursors/`
2. Extract metadata from content (frontmatter or comments)
3. Update `lib/prompts/registry.ts` to load from new location
4. Keep `.cursor/prompts/` as symlinks or references for 1 version

**Phase 3: Doc Prompts Migration**
1. Move `docs/prompts/tenant-onboarding/*` to `lib/prompts/tenant-onboarding/`
2. Register in `lib/prompts/registry.ts`
3. Update documentation links

**Phase 4: Agent Prompts**
1. Extract string exports from `cloudsysops/prompts.ts`
2. Create `lib/prompts/agents/cloudsysops/system-prompts.ts`
3. Re-export from `apps/orchestrator/src/agents/cloudsysops/prompts.ts`

### Metadata Schema
```typescript
export interface PromptMetadata {
  id: string;
  name: string;
  category: 'cursor' | 'agent' | 'tenant-onboarding' | 'evaluation';
  subcategory?: string;
  tags: string[];
  purpose: string;
  author?: string;
  created: Date;
  updated: Date;
  status: 'active' | 'experimental' | 'deprecated' | 'archived';
  version: string;
  source: 'cursor' | 'docs' | 'agent' | 'code';
  hash: string;
}
```

### File Counts & Effort

| Task | Files | LOC | Effort |
|------|-------|-----|--------|
| Cursor prompts | 21 | ~800 | 4h |
| Doc prompts | 3 | ~200 | 1h |
| Agent prompts | 1 | 88 | 1h |
| Registry/loader update | 2 | ~100 | 2h |
| Tests | 1 | ~150 | 2h |
| **TOTAL** | **28** | **~1,338** | **10h** |

### Risk Factors
- **Import path changes**: Apps using `lib/prompts` must update imports
- **File encoding**: Ensure UTF-8 for all markdown files
- **Git history loss**: Prompts will lose git blame; mitigate with comments
- **CI/CD changes**: Update workflows if `.cursor/prompts` is referenced

### Dependencies
- None (independent)
- Safe to start immediately

---

## 2. OBSERVABILITY CONSOLIDATION

### Current State

**Distributed code** (481 lines across 5 locations):
```
apps/orchestrator/src/observability/
├── job-log.ts (34 lines) - Job enqueue logging
├── planner-log.ts (40 lines) - Planner step logging
└── worker-log.ts (90 lines) - Worker execution logging

apps/orchestrator/src/runtime/observability/
└── tracer.ts (317 lines) - Distributed tracing integration

apps/orchestrator/src/openclaw/
└── observability.ts (19 lines) - OpenClaw-specific observability
```

**Existing lib/observability** (204 lines):
```
lib/observability/
├── logger.ts (48 lines) - Generic logger
├── metrics.ts (68 lines) - Metrics collection
├── tracing.ts (83 lines) - Tracing integration
└── index.ts (5 lines)
```

### Files to Consolidate

#### 2.1 Job/Planner/Worker Logs
- `job-log.ts`: Interfaces & log functions for job enqueue events
- `planner-log.ts`: Interfaces & log functions for planner steps
- `worker-log.ts`: Interfaces & log functions for worker execution

**Example**: Job log interface
```typescript
export interface JobEnqueueLogFields {
  event: 'job_enqueue';
  job_type: OrchestratorJob['type'];
  tenant_slug: string;
  tenant_id?: string;
  initiated_by: OrchestratorJob['initiated_by'];
  autonomy_risk?: OrchestratorJob['autonomy_risk'];
  queue_priority?: number;
}
export function logJobEnqueue(fields: JobEnqueueLogFields): void { ... }
```

**Purpose**: Structured logging for BullMQ job lifecycle

#### 2.2 Tracer
- `tracer.ts`: Distributed tracing (OpenTelemetry integration)
- 317 lines, complex correlation ID management
- Integrates with `@opentelemetry/api`

#### 2.3 OpenClaw Observability
- `observability.ts`: OpenClaw-specific context propagation
- 19 lines, lightweight

### Consolidation Target

**Destination**: Enhance `lib/observability/`
```
lib/observability/
├── index.ts (update exports)
├── logger.ts (existing)
├── metrics.ts (existing)
├── tracing.ts (existing)
├── job-log.ts (NEW - migrated from apps/orchestrator)
├── planner-log.ts (NEW - migrated from apps/orchestrator)
├── worker-log.ts (NEW - migrated from apps/orchestrator)
├── openclaw-observability.ts (NEW - migrated + renamed)
└── types.ts (NEW - shared observability types)
```

### Implementation Steps

**Phase 1: Type Unification**
1. Create `lib/observability/types.ts` with shared types:
   - `LogField`, `LogContext`, `LogLevel`
   - `JobLogFields`, `PlannerLogFields`, `WorkerLogFields`
   - Merge with existing types in `logger.ts`

2. Update `lib/observability/logger.ts` to use unified types

**Phase 2: Job/Planner/Worker Logs Migration**
1. Copy `job-log.ts`, `planner-log.ts`, `worker-log.ts` to `lib/observability/`
2. Update imports (e.g., `OrchestratorJob` type must come from `apps/orchestrator/src/types`)
3. Create orchestrator-specific log function exports in `lib/observability/index.ts`
4. Keep `apps/orchestrator/src/observability/*.ts` as thin re-export wrappers

**Phase 3: Tracer Enhancement**
1. Move `tracer.ts` logic into `lib/observability/tracing.ts`
2. Merge with existing tracing code
3. Ensure OpenTelemetry integration is at lib level

**Phase 4: OpenClaw Integration**
1. Enhance `lib/observability/tracing.ts` with OpenClaw context propagation
2. Remove separate `openclaw-observability.ts` file

**Phase 5: Testing**
1. Update tests to import from `lib/observability`
2. Add integration tests for job/planner/worker logging

### Compatibility Concerns

**Import Path Changes**:
```typescript
// BEFORE
import { logJobEnqueue } from '@/observability/job-log';

// AFTER
import { logJobEnqueue } from '@intcloudsysops/lib-observability';
```

**Type Dependencies**:
- `OrchestratorJob` type: Must remain in `apps/orchestrator/src/types`
- Create wrapper types in `lib/observability/types.ts` if needed

**Logger Integration**:
- Ensure job/planner/worker logs integrate with existing `createLogger()`
- May need to enhance logger with structured field support

### File Counts & Effort

| Task | Files | LOC | Effort |
|------|-------|-----|--------|
| Type unification | 1 | ~100 | 2h |
| Job/planner/worker migration | 3 | 164 | 3h |
| Tracer enhancement | 1 | 317 | 4h |
| OpenClaw integration | 1 | 19 | 1h |
| Tests | 5 | ~200 | 3h |
| **TOTAL** | **11** | **~800** | **13h** |

### Risk Factors
- **Type circular dependencies**: `OrchestratorJob` is app-specific; may need type boundaries
- **Tracer complexity**: OpenTelemetry integration is intricate; requires thorough testing
- **Breaking changes**: Apps using `apps/orchestrator/src/observability` must update imports
- **Runtime behavior**: Changes to logger output format could break log aggregation

### Dependencies
- Depends on: `apps/orchestrator/src/types` (OrchestratorJob)
- Blocks: Nothing immediate
- Recommended order: Phase 1 (Prompts) → Phase 2 (Observability) for better parallel work

---

## 3. COMPONENTS CONSOLIDATION

### Current State

**Distributed components** (30 files):
```
apps/portal/components/ui/ (6 files)
├── button.tsx
├── card.tsx
├── input.tsx
├── skeleton.tsx
├── empty-state.tsx
└── accessibility.tsx

apps/portal/components/ (12 files)
├── llm-usage-card.tsx
├── credential-reveal.tsx
├── FeedbackChat.tsx
├── super-admin-dashboard.tsx
├── developer-actions.tsx
├── admin-nav-link.tsx
├── status-badge.tsx
├── mode-selector.tsx
├── super-admin-revenue-chart.tsx
├── ValidationMetricsDashboard.tsx
├── FeedbackChatMount.tsx
└── service-card.tsx

apps/admin/components/ui/ (11 files)
├── badge.tsx
├── button.tsx
├── card.tsx
├── dialog.tsx
├── input.tsx
├── progress.tsx
├── select.tsx
├── separator.tsx
├── skeleton.tsx
├── table.tsx
└── tooltip.tsx

apps/admin/components/ (1 file)
└── providers.tsx
```

**Existing lib/components** (4 files):
```
lib/components/
├── ui/Button.tsx
├── ui/Card.tsx
├── ui/Form.tsx
├── ui/Modal.tsx
└── hooks/useAuth.ts, useTheme.ts, useAPI.ts
```

### Analysis: Duplicates

**UI Components with Duplicates**:
| Component | Portal | Admin | Lib | Status |
|-----------|--------|-------|-----|--------|
| Button | ✓ | ✓ | ✓ | Duplicate |
| Card | ✓ | ✓ | ✓ | Duplicate |
| Input | ✓ | ✓ | ✗ | Duplicate |
| Skeleton | ✓ | ✓ | ✗ | Duplicate |

**UI Components Unique to Admin**:
- Badge, Dialog, Progress, Select, Separator, Table, Tooltip (7 files)

**UI Components Unique to Portal**:
- Empty-state, Accessibility (2 files)

**High-value Shared Components** (13 files):
- Domain-specific: LLMUsageCard, CredentialReveal, StatusBadge, etc.
- Candidates for consolidation if used across apps

### Consolidation Strategy

#### 3.1 Tier 1: Core UI Components (Deduplication)
**Action**: Consolidate identical or near-identical components

```
lib/components/ui/
├── Button.tsx (merge portal + admin variants)
├── Card.tsx (merge portal + admin variants)
├── Input.tsx (NEW from portal + admin)
├── Skeleton.tsx (NEW from portal + admin)
├── Badge.tsx (NEW from admin)
├── Dialog.tsx (NEW from admin)
├── Progress.tsx (NEW from admin)
├── Select.tsx (NEW from admin)
├── Separator.tsx (NEW from admin)
├── Table.tsx (NEW from admin)
├── Tooltip.tsx (NEW from admin)
├── Form.tsx (existing)
├── Modal.tsx (existing)
├── EmptyState.tsx (NEW from portal)
└── Accessibility.tsx (NEW from portal)
```

**Effort per component**: 30-60 min (merge variants, test)

#### 3.2 Tier 2: Domain Components (Selective)
**Candidates** (if reusable across portal/admin):
- `status-badge.tsx`: Generic status visualization
- `mode-selector.tsx`: UI mode toggle
- `service-card.tsx`: Generic card wrapper

**Non-candidates** (app-specific):
- `FeedbackChat.tsx`: Portal-specific feature
- `super-admin-dashboard.tsx`: Admin-specific layout
- `llm-usage-card.tsx`: Portal business logic
- `ValidationMetricsDashboard.tsx`: Orchestrator-specific UI
- `developer-actions.tsx`: Portal-specific actions
- `CredentialReveal.tsx`: Admin-specific security feature

**Consolidation target** (Tier 2):
```
lib/components/
├── ui/ (Tier 1 consolidated)
├── common/ (NEW - Tier 2 generic reusable)
│   ├── StatusBadge.tsx
│   ├── ModeSelector.tsx
│   └── ServiceCard.tsx
└── [existing hooks, etc.]
```

### Implementation Steps

**Phase 1: Audit & Merge Strategy**
1. For each duplicate (Button, Card, Input, Skeleton):
   - Extract common styles/behavior
   - Define variant props (portal vs admin specific)
   - Create single consolidated component with all variants
   - Document variant usage in Storybook/Chromatic

2. For Tier 1 unique components (Badge, Dialog, etc.):
   - Move directly to `lib/components/ui/`
   - Ensure no app-specific imports (no portal/admin deps)

**Phase 2: Consolidate Tier 1**
1. Create `lib/components/ui/` directory structure
2. Merge and test each component
3. Update `lib/components/index.ts` exports
4. Update `apps/portal/components.ts` to re-export from lib
5. Update `apps/admin/components.ts` to re-export from lib
6. Run tests: Portal + Admin should pass with lib imports

**Phase 3: Consolidate Tier 2 (Generic High-Value)**
1. Move `StatusBadge.tsx`, `ModeSelector.tsx`, `ServiceCard.tsx`
2. Remove app-specific styling if possible
3. Create in `lib/components/common/`
4. Update imports in portal/admin

**Phase 4: Keep App-Specific**
1. Leave orchestrator, feedback, domain-specific components in apps
2. Document in `lib/components/README.md` what should/shouldn't be consolidated

**Phase 5: Testing & Migration**
1. Audit all imports in portal/admin
2. Update import statements
3. Run visual regression tests
4. Update Storybook stories if applicable

### File Counts & Effort

| Task | Files | Effort |
|------|-------|--------|
| Audit & strategy | — | 2h |
| Merge Button, Card, Input, Skeleton | 4 | 3h |
| Move unique Tier 1 components | 11 | 4h |
| Consolidate Tier 2 | 3 | 2h |
| Update imports in portal | 12 | 2h |
| Update imports in admin | 13 | 2h |
| Tests & integration | — | 4h |
| **TOTAL** | **30** | **19h** |

### Risk Factors
- **Styling divergence**: Portal and Admin may have different design tokens; must test visually
- **Dependency chains**: Components may import app-specific hooks (useAuth, etc.); extract to lib
- **Breaking changes**: Apps updating imports will need version bump
- **Storybook/Chromatic**: Visual regression detection needed for variants

### Dependencies
- Depends on: None
- Blocks: Nothing immediate
- Can run in parallel with Prompts/Observability phases

---

## 4. EVALUATION CONSOLIDATION

### Current State

**Distributed validation/evaluation code** (1,401 lines):
```
apps/orchestrator/src/lib/
├── validation-orchestrator.ts (415 lines) - Job validation, feedback aggregation
├── validation-metrics.ts (335 lines) - Quality metrics, scoring
├── validation-feedback.ts (147 lines) - Feedback collection & processing
├── validation-dashboard.ts (223 lines) - UI metrics dashboard
└── validation-utils.ts (225 lines) - Helper functions

apps/api/lib/
└── validation.ts (56 lines) - Data validation helpers
```

**Existing lib/evaluation** (minimal):
```
lib/evaluation/
├── validators/index.ts
├── metrics/index.ts
├── test-runners/index.ts
└── README.md
```

### Files to Consolidate

#### 4.1 Orchestrator Validation
- **validation-orchestrator.ts**: Core orchestrator job validation logic
  - Job type validation
  - Tenant isolation checks
  - Feedback aggregation from multiple sources
  
- **validation-metrics.ts**: Quality metrics collection & scoring
  - Success rate calculation
  - Cost tracking
  - Performance metrics
  - SLA compliance
  
- **validation-feedback.ts**: Feedback pipeline
  - Collect feedback from agents
  - Store in Supabase
  - Aggregate by job/tenant
  
- **validation-dashboard.ts**: Dashboard data preparation
  - Metrics aggregation
  - Time series data
  - Trend analysis
  
- **validation-utils.ts**: Shared utilities
  - Scoring helpers
  - Calculation functions
  - Data transformations

#### 4.2 API Validation
- **validation.ts**: Generic data validation
  - Input validation helpers
  - Type guards

### Consolidation Target

**Destination**: Enhance `lib/evaluation/`
```
lib/evaluation/
├── index.ts (update exports)
├── validators/ (existing)
│   ├── index.ts
│   ├── job-validator.ts (NEW - from validation-orchestrator)
│   ├── feedback-validator.ts (NEW - from validation-feedback)
│   └── schema-validators.ts (NEW - from api validation)
├── metrics/ (existing)
│   ├── index.ts
│   ├── quality-metrics.ts (NEW - from validation-metrics)
│   ├── cost-metrics.ts (NEW - from validation-metrics)
│   └── sla-metrics.ts (NEW - from validation-metrics)
├── dashboard/ (NEW)
│   ├── index.ts
│   ├── metrics-aggregator.ts (from validation-dashboard)
│   ├── trend-analyzer.ts (from validation-dashboard)
│   └── time-series.ts (NEW)
├── feedback/ (NEW)
│   ├── index.ts
│   ├── collector.ts (from validation-feedback)
│   ├── aggregator.ts (from validation-feedback)
│   └── types.ts
├── utils.ts (from validation-utils)
├── types.ts (NEW - shared types)
└── README.md (update)
```

### Implementation Steps

**Phase 1: Type Extraction & Unification**
1. Extract all interfaces/types from 5 validation files
2. Create `lib/evaluation/types.ts` with unified schema:
   - `ValidationResult`, `FeedbackItem`, `MetricValue`, `DashboardData`
3. Update existing `lib/evaluation/validators/index.ts` to export types

**Phase 2: Validator Migration**
1. Extract job validation logic → `validators/job-validator.ts`
2. Extract feedback validation → `validators/feedback-validator.ts`
3. Extract API validation → `validators/schema-validators.ts`
4. Ensure no cross-app dependencies

**Phase 3: Metrics Migration**
1. Extract quality metrics → `metrics/quality-metrics.ts`
2. Extract cost metrics → `metrics/cost-metrics.ts`
3. Extract SLA metrics → `metrics/sla-metrics.ts`
4. Merge with existing `lib/evaluation/metrics/index.ts`

**Phase 4: Dashboard Data Preparation**
1. Create `lib/evaluation/dashboard/metrics-aggregator.ts`
2. Create `lib/evaluation/dashboard/trend-analyzer.ts`
3. Migrate dashboard-specific logic from `validation-dashboard.ts`
4. Ensure separation from UI (return data, not components)

**Phase 5: Feedback Pipeline**
1. Create `lib/evaluation/feedback/collector.ts`
2. Create `lib/evaluation/feedback/aggregator.ts`
3. Migrate feedback collection logic
4. Integrate with Supabase repository pattern

**Phase 6: Update Imports & Testing**
1. Update `apps/orchestrator/src/lib/validation*.ts` to re-export from lib
2. Run all orchestrator validation tests
3. Update API tests
4. Add integration tests for cross-module flows

### Dependency Analysis

**What validation-orchestrator.ts depends on**:
- `@supabase/supabase-js` (database)
- `OrchestratorJob` type (app-specific)
- BullMQ types

**What validation-metrics.ts depends on**:
- `OrchestratorJob`, `OrchestratorJobStatus` types
- Date calculations (no external deps)

**What validation-feedback.ts depends on**:
- Supabase client
- Feedback schema types

**What validation-dashboard.ts depends on**:
- Supabase
- Metrics calculations

**What validation-utils.ts depends on**:
- No external dependencies (pure functions)

**Circular dependency risks**:
- `validation-orchestrator` → `validation-metrics` → `validation-orchestrator`?
- Check and break if found

### File Counts & Effort

| Task | Files | LOC | Effort |
|------|-------|-----|--------|
| Type extraction | 1 | ~150 | 2h |
| Validator migration | 3 | ~300 | 4h |
| Metrics migration | 3 | ~400 | 5h |
| Dashboard migration | 2 | ~300 | 4h |
| Feedback migration | 2 | ~200 | 3h |
| Utils migration | 1 | ~225 | 2h |
| Testing | — | ~200 | 4h |
| **TOTAL** | **15** | **~1,775** | **24h** |

### Risk Factors
- **Circular imports**: Break with careful type/interface separation
- **Supabase dependency**: Ensure lib doesn't force Supabase client; use dependency injection
- **App-specific types**: `OrchestratorJob` can't move to lib; pass as generic or typed args
- **Breaking changes**: Major version bump required (metrics API will change)
- **Test coverage**: Validation is critical; needs 100% test pass

### Dependencies
- Depends on: `apps/orchestrator/src/types` (OrchestratorJob)
- Blocks: Nothing immediate
- Recommended order: After Prompts (Phase 1), in parallel with Observability (Phase 2)

---

## 5. SERVICES CONSOLIDATION

### Current State

**Distributed services** (79 files in `apps/api/lib/`):
```
apps/api/lib/
├── base-repository.ts (98 lines) - Generic data access pattern
├── services/ (directory with multiple domain services)
├── local-services/ (12 files - local services domain)
├── billing/ (billing-related utilities)
├── ai/ (AI service integrations)
├── cloud-providers/ (cloud provider abstractions)
├── defense/ (security/defense utilities)
├── docker/ (Docker-related utilities)
├── doppler/ (Doppler secrets integration)
├── email/ (Email service)
├── feedback/ (Feedback utilities)
├── infra/ (Infrastructure utilities)
├── insights/ (Insights/analytics)
└── [40+ other utility files]
```

**Existing lib/services** (minimal):
```
lib/services/
├── index.ts
├── GOVERNANCE.md
├── README.md
└── templates/
```

### Analysis: Consolidation Candidates

#### 5.1 HIGH PRIORITY: Base Repository Pattern
- **File**: `apps/api/lib/base-repository.ts` (98 lines)
- **Purpose**: Generic repository class for data access
- **Usage**: Used throughout API for database operations
- **Reusability**: Can be shared across apps

```typescript
export class BaseRepository<T> {
  constructor(protected client: SupabaseClient, protected table: string) {}
  async find(id: string): Promise<T | null> { ... }
  async findAll(filters?: Record<string, any>): Promise<T[]> { ... }
  async create(data: Omit<T, 'id'>): Promise<T> { ... }
  async update(id: string, data: Partial<T>): Promise<T> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

**Migration target**: `lib/services/base-repository.ts`

#### 5.2 HIGH PRIORITY: Validation Service
- **File**: `apps/api/lib/validation.ts` (56 lines)
- **Purpose**: Input validation helpers
- **Reusability**: Can be shared across API, orchestrator, portal

**Migration target**: Merge into `lib/evaluation/validators/` OR `lib/services/validation.ts`

#### 5.3 MEDIUM PRIORITY: Domain Services
**Local Services** (12 files):
- `local-services.ts`: Core local services logic
- `local-services-dal.ts`: Data access layer
- `local-services-booking-schema.ts`: Booking schema
- `local-services-webhook-*.ts`: Webhook handlers
- etc.

**Status**: Highly specific to local-services domain; candidates for consolidation only if:
- Used by multiple apps (currently only apps/api)
- Represent generic patterns applicable to other domains

**Recommendation**: Keep in `apps/api/lib/` unless local-services becomes a standalone domain service

#### 5.4 MEDIUM PRIORITY: Integration Services
- `ai/`: LLM integrations (OpenAI, Anthropic, etc.)
  - `apps/api/lib/ai/*.ts` - API-specific AI logic
  
- `cloud-providers/`: Cloud provider abstractions (AWS, GCP, Azure)
  
- `doppler/`: Secrets management
  
- `email/`: Email service

**Reusability**: Low (mostly API-specific)
**Keep in**: `apps/api/lib/` for now; extract only if used by multiple apps

#### 5.5 LOW PRIORITY: Utilities
- `docker-*.ts`, `bullmq-*.ts`, `metrics-*.ts`: Infrastructure utilities
- **Recommendation**: Keep in apps/api/lib or move to lib/infra if used elsewhere

### Consolidation Target

**Phase 1 (Immediate)**:
```
lib/services/
├── index.ts (update exports)
├── base-repository.ts (MIGRATED from apps/api)
├── repository-factory.ts (NEW - factory pattern for repos)
├── types.ts (NEW - shared types)
└── README.md (update)
```

**Phase 2 (If needed)**:
```
lib/services/
├── integrations/ (NEW)
│   ├── ai/ (from apps/api/lib/ai)
│   ├── cloud-providers/ (from apps/api/lib/cloud-providers)
│   ├── doppler/ (from apps/api/lib/doppler)
│   └── email/ (from apps/api/lib/email)
└── domain/ (NEW - if local-services becomes multi-app)
    └── local-services/ (from apps/api/lib/local-services)
```

### Implementation Steps

**Phase 1: Base Repository Migration (Immediate)**
1. Copy `apps/api/lib/base-repository.ts` to `lib/services/base-repository.ts`
2. Update Supabase client injection (no hardcoded paths)
3. Create `lib/services/types.ts` with repository interfaces
4. Update `apps/api/lib/base-repository.ts` to re-export from lib
5. Run API tests to ensure no breaking changes

**Phase 2: Validation Service (Depends on Evaluation Phase)**
1. Coordinate with Evaluation consolidation
2. Either:
   a. Move `apps/api/lib/validation.ts` to `lib/evaluation/validators/api-validation.ts`
   b. OR create `lib/services/validation.ts` as generic validation utility
3. Update imports

**Phase 3: Repository Factory (Optional)**
1. Create factory pattern for repository instantiation
2. Simplify repository creation in API routes
3. Example:
   ```typescript
   const repos = createRepositories(supabaseClient, {
     users: UserRepository,
     tenants: TenantRepository,
     jobs: JobRepository,
   });
   ```

**Phase 4: Integration Services (Later)**
1. Evaluate if AI/Cloud/Doppler/Email services are used by multiple apps
2. If yes: Extract to `lib/services/integrations/`
3. If no: Leave in `apps/api/lib/`

### File Counts & Effort

| Task | Files | LOC | Effort |
|------|-------|-----|--------|
| Base repository migration | 1 | 98 | 2h |
| Validation service merge | 1 | 56 | 1h |
| Factory pattern (optional) | 1 | ~100 | 2h |
| Testing | — | ~100 | 2h |
| **TOTAL (Phase 1)** | **3** | **~254** | **7h** |
| **Phase 2+ (Optional)** | **20+** | **~1000+** | **15-20h** |

### Risk Factors
- **Dependency injection**: Base repository must accept Supabase client as param, not import it
- **Type safety**: Repository generics must be strict to avoid `any`
- **Breaking changes**: Changes to repository pattern require coordinated update across API
- **Testing**: Data access layer is critical; needs comprehensive test coverage

### Dependencies
- Depends on: `lib/services/` structure already exists
- Blocks: App-specific services (local-services, AI, etc.)
- Recommended order: Phase 1 (Base Repository) early; Phase 2+ later

---

## PHASE SUMMARY: Prioritized Execution Plan

### Phase 1: Foundation (Week 1)
**Goal**: Set up lib module consolidation infrastructure

| Module | Task | Effort | Files |
|--------|------|--------|-------|
| Prompts | Consolidate cursor/doc prompts | 10h | 28 |
| Services | Migrate base-repository.ts | 2h | 1 |
| **Phase 1 Total** | — | **12h** | **29** |

**Deliverable**: 
- Centralized prompt registry with metadata
- Base repository pattern in lib/services

**Team**: 1 developer (Part-time) or 0.5 developers (Full-time)

---

### Phase 2: Core Consolidation (Weeks 2-3)
**Goal**: Move critical shared code to lib

| Module | Task | Effort | Files |
|--------|------|--------|-------|
| Observability | Job/planner/worker logs + tracer | 13h | 5 |
| Evaluation | Validation & metrics consolidation | 24h | 15 |
| Components | Tier 1 UI components (deduplication) | 10h | 15 |
| Services | Validation service + factory pattern | 3h | 2 |
| **Phase 2 Total** | — | **50h** | **37** |

**Deliverable**:
- Centralized observability stack
- Unified evaluation/validation framework
- Deduplicated UI components (Button, Card, Input, etc.)

**Team**: 2 developers (Full-time) or 3 developers (Part-time)

---

### Phase 3: Extended Consolidation (Weeks 4-5)
**Goal**: Migrate remaining high-value code; optional but recommended

| Module | Task | Effort | Files |
|--------|------|--------|-------|
| Components | Tier 2 domain components | 5h | 3 |
| Services | Integration services (AI, Cloud, Email) | 20h | 15 |
| Testing | Cross-module integration tests | 10h | — |
| Documentation | Update all module READMEs | 4h | — |
| **Phase 3 Total** | — | **39h** | **18** |

**Deliverable**:
- All high-value shared code consolidated
- Comprehensive test coverage
- Clear documentation of consolidation patterns

**Team**: 1-2 developers (Part-time) or 1 developer (Full-time)

---

## GRAND TOTAL

| Phase | Effort | Files | LOC |
|-------|--------|-------|-----|
| Phase 1 | 12h | 29 | 350 |
| Phase 2 | 50h | 37 | 2,175 |
| Phase 3 | 39h | 18 | 1,500 |
| **TOTAL** | **101h** | **84** | **4,025** |

**Timeline**: 
- **Minimum** (Phases 1-2 only): 3 weeks with 2 developers
- **Recommended** (All phases): 5 weeks with 2 developers or 3 weeks with 3 developers

---

## INTERDEPENDENCIES & EXECUTION ORDER

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation (Week 1)                                │
├─────────────────────────────────────────────────────────────┤
│ ├─ Prompts (10h, independent)                               │
│ └─ Services: Base Repository (2h, independent)              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Core Consolidation (Weeks 2-3) - PARALLEL         │
├─────────────────────────────────────────────────────────────┤
│ ├─ Observability (13h, independent)                         │
│ ├─ Evaluation (24h, independent)                            │
│ ├─ Components Tier 1 (10h, independent)                     │
│ └─ Services: Validation + Factory (3h, depends on Eval)     │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Extended (Weeks 4-5) - OPTIONAL                   │
├─────────────────────────────────────────────────────────────┤
│ ├─ Components Tier 2 (5h, depends on Tier 1)                │
│ ├─ Services: Integrations (20h, independent)                │
│ ├─ Integration Testing (10h, depends on all above)          │
│ └─ Documentation (4h, final)                                │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Execution Sequence

**Week 1 (Parallel Work)**:
- **Dev A**: Prompts consolidation (10h)
- **Dev B**: Services base-repository + Observability setup (2h + 3h)

**Weeks 2-3 (Parallel Work)**:
- **Dev A**: Observability migration (10h) + Components Tier 1 (10h)
- **Dev B**: Evaluation migration (24h) + Services validation (3h)
- **Dev A & B**: Testing & integration (8h total)

**Weeks 4-5 (Optional)**:
- **Dev A**: Components Tier 2 (5h) + Services integrations phase 1 (10h)
- **Dev B**: Services integrations phase 2 (10h) + Integration testing (6h)
- **Both**: Documentation & final QA (4h)

---

## BREAKING CHANGES & MIGRATION GUIDE

### For Each Consolidation, Apps Must Update Imports

#### Prompts
```typescript
// BEFORE (if using from individual locations)
import { local_services_mvp } from './.cursor/prompts/local-services-mvp.md';

// AFTER
import { getPrompt } from '@intcloudsysops/lib-prompts';
const prompt = await getPrompt('local-services-mvp');
```

#### Observability
```typescript
// BEFORE
import { logJobEnqueue } from '@/observability/job-log';
import { createTracer } from '@/runtime/observability/tracer';

// AFTER
import { logJobEnqueue, createTracer } from '@intcloudsysops/lib-observability';
```

#### Components
```typescript
// BEFORE
import Button from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// AFTER
import { Button, useAuth } from '@intcloudsysops/lib-components';
```

#### Evaluation
```typescript
// BEFORE
import { validateJob } from '@/lib/validation-orchestrator';
import { calculateMetrics } from '@/lib/validation-metrics';

// AFTER
import { validateJob } from '@intcloudsysops/lib-evaluation/validators';
import { calculateMetrics } from '@intcloudsysops/lib-evaluation/metrics';
```

#### Services
```typescript
// BEFORE
import { BaseRepository } from '@/lib/base-repository';

// AFTER
import { BaseRepository } from '@intcloudsysops/lib-services';
```

### Version Bumping Strategy

- **Phase 1** (Prompts, Services base): `@intcloudsysops/lib-prompts@2.0.0`, `@intcloudsysops/lib-services@2.0.0`
- **Phase 2** (Observability, Evaluation, Components): `@intcloudsysops/lib-*@2.0.0` for each
- **Phase 3** (Extended): Continue with semver based on breaking changes

### Migration Checklist for Each Module

- [ ] Export all consolidated code from lib module
- [ ] Create re-export wrappers in app (for gradual migration)
- [ ] Update import statements in consuming apps
- [ ] Run type check: `npm run type-check`
- [ ] Run tests: `npm run test`
- [ ] Run linter: `npm run lint`
- [ ] Create PR with BREAKING CHANGE in commit message
- [ ] Document migration in module README.md

---

## RISK MITIGATION

### Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Circular dependencies | Medium | High | Use interface extraction; test early |
| Breaking changes miss | High | High | Comprehensive testing; gradual migration |
| Type safety loss | Medium | High | Strict TS config; no `any` allowed |
| Performance regression | Low | Medium | Bundle analysis before/after |
| Test coverage gaps | Medium | High | Require 90%+ coverage for lib code |

### Testing Strategy

1. **Unit tests**: Each migrated file must have tests
2. **Integration tests**: Test cross-module interactions
3. **Snapshot tests**: For components (visual regression)
4. **E2E tests**: For critical flows (validation, observability)
5. **Bundle analysis**: Ensure no increase in app bundle size

### Rollback Plan

- **Git branches**: Each phase gets a feature branch
- **Staging**: Test in staging before production
- **Feature flags**: Use feature flags for gradual rollout (if needed)
- **Revert**: Easy revert if breaking changes missed

---

## SUCCESS METRICS

### Code Quality
- **Duplication removed**: 0 duplicated components, utilities
- **Test coverage**: 90%+ for lib modules (up from current ~60%)
- **Type safety**: 0 `any` types in consolidated code
- **Lint score**: 100% compliance with ESLint rules

### Performance
- **Bundle size**: No increase in app bundle size
- **Import performance**: <5ms for all lib imports
- **Runtime overhead**: <1ms for observability logging

### Developer Experience
- **Import clarity**: Clear, single path to shared code
- **Documentation**: Every lib module has comprehensive README
- **Examples**: At least one example usage per API

### Adoption
- **Migration completion**: 100% of apps using consolidated code by Phase 3 end
- **Developer satisfaction**: >4/5 rating on consolidation effort

---

## Appendix A: File Listing by Consolidation Task

### A.1 Prompts (28 files)

**Cursor Prompts (21):**
- `.cursor/prompts/README.md`
- `.cursor/prompts/e2e-test-1777846828.md`
- `.cursor/prompts/e2e-test.md`
- `.cursor/prompts/fix-organize-autonomous-system.md`
- `.cursor/prompts/legalvial-phase2b-automation.md`
- `.cursor/prompts/local-services-automation.md`
- `.cursor/prompts/local-services-mvp.md`
- `.cursor/prompts/local-services-ops-admin.md`
- `.cursor/prompts/local-services-phase2-automation.md`
- `.cursor/prompts/local-services-sales-closer.md`
- `.cursor/prompts/local-services-tech-builder.md`
- `.cursor/prompts/parallel-task-1-executor.md`
- `.cursor/prompts/parallel-task-2-architect.md`
- `.cursor/prompts/parallel-task-3-reviewer.md`
- `.cursor/prompts/parallel-task-4-observability.md`
- `.cursor/prompts/task-orchestrator-completion.md`
- `.cursor/prompts/test-cursor-execution.md`
- `.cursor/prompts/test-local-cursor-phase1.md`
- `.cursor/prompts/pending/prompt-test-1.md`
- `.cursor/prompts/pending/prompt-test-1777851022.md`
- `.cursor/prompts/tenants/local-services/piloto-automatizaciones.md`

**Doc Prompts (3):**
- `docs/prompts/tenant-onboarding/TENANT-ONBOARDING-TEMPLATE.md`
- `docs/prompts/tenant-onboarding/INFRASTRUCTURE-SETUP.md`
- `docs/prompts/tenant-onboarding/DEPLOYMENT-VALIDATION.md`

**Agent Prompts (1):**
- `apps/orchestrator/src/agents/cloudsysops/prompts.ts`

### A.2 Observability (5 files, 481 lines)

- `apps/orchestrator/src/observability/job-log.ts` (34 lines)
- `apps/orchestrator/src/observability/planner-log.ts` (40 lines)
- `apps/orchestrator/src/observability/worker-log.ts` (90 lines)
- `apps/orchestrator/src/runtime/observability/tracer.ts` (317 lines)
- `apps/orchestrator/src/openclaw/observability.ts` (19 lines)

### A.3 Components (30 files, ~1500 lines)

**Portal UI (6):**
- `apps/portal/components/ui/button.tsx`
- `apps/portal/components/ui/card.tsx`
- `apps/portal/components/ui/input.tsx`
- `apps/portal/components/ui/skeleton.tsx`
- `apps/portal/components/ui/empty-state.tsx`
- `apps/portal/components/ui/accessibility.tsx`

**Portal High-value (12):**
- `apps/portal/components/llm-usage-card.tsx`
- `apps/portal/components/credential-reveal.tsx`
- `apps/portal/components/FeedbackChat.tsx`
- `apps/portal/components/super-admin-dashboard.tsx`
- `apps/portal/components/developer-actions.tsx`
- `apps/portal/components/admin-nav-link.tsx`
- `apps/portal/components/status-badge.tsx`
- `apps/portal/components/mode-selector.tsx`
- `apps/portal/components/super-admin-revenue-chart.tsx`
- `apps/portal/components/ValidationMetricsDashboard.tsx`
- `apps/portal/components/FeedbackChatMount.tsx`
- `apps/portal/components/service-card.tsx`

**Admin UI (11):**
- `apps/admin/components/ui/badge.tsx`
- `apps/admin/components/ui/button.tsx`
- `apps/admin/components/ui/dialog.tsx`
- `apps/admin/components/ui/input.tsx`
- `apps/admin/components/ui/progress.tsx`
- `apps/admin/components/ui/select.tsx`
- `apps/admin/components/ui/separator.tsx`
- `apps/admin/components/ui/skeleton.tsx`
- `apps/admin/components/ui/table.tsx`
- `apps/admin/components/ui/tooltip.tsx`
- `apps/admin/components/ui/card.tsx`

**Admin High-value (1):**
- `apps/admin/components/providers.tsx`

### A.4 Evaluation (6 files, 1,401 lines)

**Orchestrator validation (5):**
- `apps/orchestrator/src/lib/validation-orchestrator.ts` (415 lines)
- `apps/orchestrator/src/lib/validation-metrics.ts` (335 lines)
- `apps/orchestrator/src/lib/validation-feedback.ts` (147 lines)
- `apps/orchestrator/src/lib/validation-dashboard.ts` (223 lines)
- `apps/orchestrator/src/lib/validation-utils.ts` (225 lines)

**API validation (1):**
- `apps/api/lib/validation.ts` (56 lines)

### A.5 Services (1 file initial, 79 files optional)

**Phase 1:**
- `apps/api/lib/base-repository.ts` (98 lines)
- `apps/api/lib/validation.ts` (56 lines)

**Phase 3 (Optional):**
- 79 additional files in `apps/api/lib/` (various domains)

---

## Appendix B: Repository Checkpoints

### Post-Phase-1 Checkpoint
```bash
# Verify consolidation
ls -la lib/prompts/cursors/ | wc -l # Should be 21
ls -la lib/prompts/agents/ # Should exist
cat lib/prompts/registry.ts | grep -c "register" # Should be ~25

# Run tests
npm run test -- lib/prompts
npm run test -- lib/services

# Bundle check
npm run build && du -sh dist/
```

### Post-Phase-2 Checkpoint
```bash
# Verify all consolidations
ls lib/observability/ | wc -l # Should be 10+
ls lib/evaluation/validators/ # Should be 3+
ls lib/components/ui/ | wc -l # Should be 15+

# Type safety
npm run type-check

# Import validation
grep -r "from.*apps/orchestrator/src/observability" apps/ | wc -l # Should be 0

# Test coverage
npm run test -- lib/
```

### Post-Phase-3 Checkpoint
```bash
# Final verification
ls lib/services/integrations/ # Should exist
npm run test # 100% pass

# Documentation
cat lib/*/README.md | wc -l # Should be 200+

# Export audit
npm run build && node -e "const lib = require('./dist/lib'); console.log(Object.keys(lib))"
```

---

## Appendix C: Example Import Migration

### Before (Fragmented)
```typescript
// In apps/orchestrator/src/routes/validation.ts
import { validateJob } from '../lib/validation-orchestrator';
import { calculateMetrics } from '../lib/validation-metrics';
import { logJobEnqueue } from '../observability/job-log';
import { createTracer } from '../runtime/observability/tracer';
import { BaseRepository } from '../../api/lib/base-repository';

// In apps/portal/components/Dashboard.tsx
import Button from '../../components/ui/button';
import Card from '../../components/ui/card';
import Input from '../../components/ui/input';
import { useAuth } from '../../hooks/useAuth';
```

### After (Consolidated)
```typescript
// In apps/orchestrator/src/routes/validation.ts
import {
  validateJob,
  calculateMetrics,
  logJobEnqueue,
  createTracer,
  BaseRepository,
} from '@intcloudsysops/lib';

// In apps/portal/components/Dashboard.tsx
import { Button, Card, Input, useAuth } from '@intcloudsysops/lib-components';
```

---

## Appendix D: Estimated Timeline & Resource Allocation

### Scenario 1: Single Developer (Full-time)
- Week 1: Phase 1 (Prompts + Services base) → 12h
- Weeks 2-3: Phase 2 (partial) → 35h of 50h
- Weeks 4-6: Phase 2 (continued) + Phase 3 (started) → 50h
- **Timeline**: 6 weeks

### Scenario 2: Two Developers (Full-time)
- Week 1: Phase 1 (Prompts + Services) → 12h (1 dev at 50%)
- Weeks 2-3: Phase 2 (both devs parallel) → 50h total
- Weeks 4-5: Phase 3 (both devs parallel) → 39h total
- **Timeline**: 5 weeks

### Scenario 3: Three Developers (Part-time)
- Week 1: Phase 1 (all three at 30%) → 12h distributed
- Weeks 2-3: Phase 2 (all three at 50%) → 50h distributed
- Weeks 4-5: Phase 3 (all three at 50%) → 39h distributed
- **Timeline**: 5 weeks

---

## Document Version

**Version**: 1.0  
**Status**: Draft (Ready for Review)  
**Last Updated**: 2026-05-09  
**Author**: Claude Code (AI Agent)  
**Review Status**: Pending technical review

---


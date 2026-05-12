# Opsly Code Consolidation Plan - Document Index

**Status**: Complete and Ready for Technical Review
**Generated**: May 9, 2026
**Total Documentation**: 2,004 lines, 69 KB
**Scope**: 84 files, ~4,025 LOC, 101 hours of effort

---

## Quick Navigation

### For Executives/Decision Makers

Start with: **CONSOLIDATION-SUMMARY.md**

- 5-minute overview
- Key metrics and timeline
- Risk assessment
- Success criteria

### For Technical Leads

Read in order:

1. **CONSOLIDATION-SUMMARY.md** (Overview)
2. **CONSOLIDATION-PLAN.md** (Full specification)
3. **CONSOLIDATION-EFFORT-BREAKDOWN.md** (Detailed estimates)

### For Implementation Teams

Start with: **CONSOLIDATION-EFFORT-BREAKDOWN.md**

- Task-by-task breakdown
- Complexity ratings
- Sub-task specifications
- Testing requirements

---

## Document Breakdown

### 1. CONSOLIDATION-SUMMARY.md (9.1 KB, 277 lines)

**Audience**: Executives, Project Managers, Technical Leads
**Time to Read**: 5 minutes
**Covers**:

- Quick facts and metrics (8 key statistics)
- High-level overview of 5 consolidation areas
- Execution timeline options (3-5 weeks)
- Risk assessment (5 identified risks)
- Success criteria (3 categories)
- Phase dependencies diagram
- Next steps (5 action items)

**Key Sections**:

- Overview of each consolidation area with effort/risk
- Timeline options: Minimum (3 weeks), Recommended (5 weeks), Alternative (6 weeks)
- Phase dependencies and parallelization strategy
- Breaking changes and version bumping

### 2. CONSOLIDATION-PLAN.md (45 KB, 1,334 lines)

**Audience**: Technical Leads, Architects, Implementation Teams
**Time to Read**: 30 minutes (skim), 1 hour (deep dive)
**Covers**:

- Detailed specifications for all 5 consolidation areas
- File-by-file listings with paths and line counts
- Phase-by-phase implementation steps
- Dependency analysis and risk mitigation
- Migration guides and import examples
- Success metrics and checkpoints

**Key Sections**:

#### 1. Prompts Consolidation (10 hours)

- Current state: 21 cursor + 3 doc + 1 agent prompts
- Target: lib/prompts/registry.ts with metadata support
- Implementation: 6 tasks, 10 hours total
- Risk: Low
- Benefits: Single source of truth, better discoverability

#### 2. Observability Consolidation (13 hours)

- Current state: Distributed across orchestrator, runtime, openclaw (481 LOC)
- Target: Unified lib/observability stack
- Implementation: 5 tasks, 13 hours total
- Risk: Medium (tracer complexity)
- Benefits: Consistent logging, structured formats

#### 3. Components Consolidation (19 hours)

- Current state: 30 files (17 UI, 13 domain)
- Target: Consolidated lib/components with variants
- Implementation: 5 major tasks, 19 hours total
- Risk: Medium (visual regression)
- Tier 1: Deduplication (Button, Card, Input, Skeleton)
- Tier 2: Reusable domain components (optional)

#### 4. Evaluation Consolidation (24 hours)

- Current state: Distributed validation (1,401 LOC)
- Target: lib/evaluation with validators/metrics/feedback/dashboard
- Implementation: 7 tasks, 24 hours total
- Risk: Medium (circular dependencies)
- Benefits: Shared metrics framework, testable pipeline

#### 5. Services Consolidation (7 hours Phase 1 + 20 hours Phase 3)

- Current state: Base repository + optional integration services
- Target: lib/services with DI-friendly patterns
- Phase 1: 2 files, 7 hours (immediate)
- Phase 3: 15+ files, 20 hours (optional)
- Risk: Low-Medium
- Benefits: Code reuse, dependency injection

**Appendices**:

- A: Complete file listings by consolidation task
- B: Repository checkpoints (validation gates)
- C: Example import migrations (before/after)
- D: Timeline & resource allocation by scenario

### 3. CONSOLIDATION-EFFORT-BREAKDOWN.md (15 KB, 393 lines)

**Audience**: Project Managers, Implementation Teams, Resource Planners
**Time to Read**: 10 minutes (summary), 20 minutes (detailed)
**Covers**:

- Task-by-task effort breakdown
- Complexity ratings for each task
- Sub-task specifications
- Timeline scenarios (1, 2, 3 developers)
- Risk/complexity adjustments
- Buffer recommendations

**Key Sections**:

#### Task Breakdowns (by consolidation area)

**1. Prompts: 10 hours**

- 1.1: Metadata schema design (1h, Low)
- 1.2: Cursor prompts migration (4h, Low)
- 1.3: Doc prompts migration (1h, Low)
- 1.4: Agent prompts migration (1h, Low)
- 1.5: Registry & loader updates (2h, Medium)
- 1.6: Tests & validation (1h, Low)

**2. Observability: 13 hours**

- 2.1: Type unification (2h, Medium)
- 2.2: Job/planner/worker logs (3h, Medium)
- 2.3: Tracer enhancement (4h, High)
- 2.4: OpenClaw integration (1h, Low)
- 2.5: Testing & integration (3h, Medium)

**3. Components: 19 hours**

- 3.1: Component audit (2h, Medium)
- 3.2: Tier 1 consolidation (10h, Medium)
- 3.3: Import path updates (3h, Low)
- 3.4: Tier 2 consolidation (2h, Low)
- 3.5: Testing & regression (2h, Medium)

**4. Evaluation: 24 hours**

- 4.1: Type extraction (2h, Medium)
- 4.2: Validator migration (4h, Medium)
- 4.3: Metrics migration (5h, Medium-High)
- 4.4: Dashboard preparation (4h, Medium)
- 4.5: Feedback pipeline (3h, Medium)
- 4.6: Utilities migration (2h, Low)
- 4.7: Import updates & testing (4h, Medium)

**5. Services: 7h Phase 1 + 20h Phase 3**

- Phase 1 (7h):
  - 5.1: Base repository migration (2h, Low)
  - 5.2: Validation service (1h, Low)
  - 5.3: Repository factory (2h, Medium)
  - 5.4: Testing (2h, Low)
- Phase 3 (20h, optional):
  - 5.5-5.8: Integration services (20h, High)

#### Effort Distribution Scenarios

**Solo Developer (6 weeks)**

- Week 1: Prompts (10h) + Services base (2h)
- Weeks 2-3: Observability (13h) + Components (10h)
- Weeks 4-6: Evaluation (24h) + testing (8h)

**Two Developers (5 weeks)**

- Week 1: Dev A (Prompts 10h), Dev B (Services 2h)
- Weeks 2-3: Dev A (Observability 13h + Components 10h), Dev B (Evaluation 24h)
- Weeks 4-5: Phase 3 optional or extended testing

**Three Developers Part-time (5 weeks)**

- Week 1: All at 33% = 12h distributed
- Weeks 2-3: All at 50-60% = 50h distributed
- Weeks 4-5: All at 50-60% = 39h distributed

#### Risk Adjustments

- Circular dependencies: +2-4h
- Visual regression: +2-4h
- Type safety issues: +1-2h
- Test coverage gaps: +2-3h
- Integration issues: +2-3h
- **Recommended buffer**: 10-20% = 111-121 hours total

---

## Cross-Reference Table

| Aspect        | Summary     | Plan                    | Breakdown               |
| ------------- | ----------- | ----------------------- | ----------------------- |
| Prompts       | Section 1   | Section 1 (pp. 15-48)   | Section 1 (pp. 5-8)     |
| Observability | Section 2   | Section 2 (pp. 49-88)   | Section 2 (pp. 9-13)    |
| Components    | Section 3   | Section 3 (pp. 89-128)  | Section 3 (pp. 14-18)   |
| Evaluation    | Section 4   | Section 4 (pp. 129-180) | Section 4 (pp. 19-27)   |
| Services      | Section 5   | Section 5 (pp. 181-220) | Section 5 (pp. 28-35)   |
| Timeline      | All options | Phase summary (p. 221)  | 3 scenarios (pp. 36-38) |
| Risk          | Assessment  | Mitigation (p. 245)     | Adjustments (p. 40)     |

---

## Key Metrics at a Glance

| Metric                         | Value            |
| ------------------------------ | ---------------- |
| **Total Files to Consolidate** | 84               |
| **Total Lines of Code**        | ~4,025           |
| **Lib Modules Affected**       | 13               |
| **Total Effort**               | 101 hours        |
| **Minimum Timeline**           | 3 weeks (2 devs) |
| **Recommended Timeline**       | 5 weeks (2 devs) |
| **Risk Level**                 | Medium           |
| **Breaking Changes**           | Yes (v2.0 bumps) |

---

## Consolidation Areas Summary

| Area          | Files  | LOC        | Effort   | Risk       |
| ------------- | ------ | ---------- | -------- | ---------- |
| Prompts       | 28     | 1,338      | 10h      | Low        |
| Observability | 5      | 481        | 13h      | Medium     |
| Components    | 30     | 1,500+     | 19h      | Medium     |
| Evaluation    | 6      | 1,401      | 24h      | Medium     |
| Services Ph1  | 2      | 154        | 7h       | Low        |
| Services Ph3  | 15+    | 1,000+     | 20h      | Medium     |
| **Total**     | **84** | **~4,025** | **101h** | **Medium** |

---

## Implementation Phases

### Phase 1: Foundation (Week 1, 12 hours)

- Prompts consolidation (10h)
- Services base repository (2h)
- Risk: Low
- Blocks: Nothing

### Phase 2: Core (Weeks 2-3, 50 hours)

- Observability consolidation (13h)
- Evaluation consolidation (24h)
- Components Tier 1 (10h)
- Services validation (3h)
- Risk: Medium
- Depends on: Phase 1

### Phase 3: Extended (Weeks 4-5, 39 hours, OPTIONAL)

- Components Tier 2 (5h)
- Services integrations (20h)
- Integration testing (10h)
- Documentation (4h)
- Risk: Medium-High
- Depends on: Phase 2

---

## For Specific Roles

### Project Manager

- **Read first**: CONSOLIDATION-SUMMARY.md (Timeline & Risk sections)
- **Reference**: CONSOLIDATION-EFFORT-BREAKDOWN.md (Effort Distribution scenarios)
- **Action**: Use timeline options to plan sprints

### Technical Lead

- **Read first**: CONSOLIDATION-SUMMARY.md (Full)
- **Deep dive**: CONSOLIDATION-PLAN.md (full specification)
- **Reference**: All appendices for dependencies

### Developer (Implementation)

- **Read first**: CONSOLIDATION-EFFORT-BREAKDOWN.md (your task)
- **Reference**: CONSOLIDATION-PLAN.md (sections 1-5 for details)
- **Use**: Phase dependencies diagram to understand blocking relationships

### Architect

- **Read first**: CONSOLIDATION-PLAN.md (Executive Summary + Interdependencies)
- **Deep dive**: Risk Mitigation & Migration Guide sections
- **Review**: All appendices for import path changes

---

## Document Status

| Document                          | Status   | Last Updated | Size      |
| --------------------------------- | -------- | ------------ | --------- |
| CONSOLIDATION-SUMMARY.md          | Complete | May 9, 2026  | 9.1 KB    |
| CONSOLIDATION-PLAN.md             | Complete | May 9, 2026  | 45 KB     |
| CONSOLIDATION-EFFORT-BREAKDOWN.md | Complete | May 9, 2026  | 15 KB     |
| CONSOLIDATION-INDEX.md            | Complete | May 9, 2026  | This file |

**Overall Status**: READY FOR TECHNICAL REVIEW

---

## Next Actions

1. **Read CONSOLIDATION-SUMMARY.md** (5 minutes)
2. **Decision**: Approve scope & timeline
3. **Resource allocation**: Assign team members
4. **Schedule Phase 1 kickoff**: Week of [decision date]

---

**Document Version**: 1.0  
**Git Commit**: 51f8805  
**Reviewed**: Pending

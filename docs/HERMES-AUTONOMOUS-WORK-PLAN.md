---
status: completed-in-repo
owner: hermes
date: 2026-05-08T12:50:00Z
closure_review: 2026-05-08
scope: "Parallel work while user handles other priorities"
---

# Hermes Autonomous Work Plan — May 8, 2026

## Cierre en repo (2026-05-08)

Auditorías y guías pedidas en este plan **existen** bajo rutas canónicas (algunos nombres difieren del borrador original). Issues en GitHub siguen siendo trabajo opcional de producto.

| Plan original | Entregable en repo |
| --- | --- |
| Tier 1 — code review | `docs/audits/CODE-REVIEW-API-ROUTES.md` |
| Tier 1 — DB audit | `docs/audits/DATABASE-QUERY-AUDIT.md` |
| Tier 1 — tests baseline | `docs/audits/TEST-COVERAGE-BASELINE.md` |
| Tier 1 — lint | `docs/audits/LINT-RULES-GUIDE.md` |
| Tier 1 — Docker | `docs/audits/DOCKER-OPTIMIZATION.md` |
| Tier 2 — performance | `docs/audits/PERFORMANCE-BOTTLENECK-ANALYSIS.md` (antes “PERFORMANCE-AUDIT”) |
| Tier 2 — validación | `docs/audits/SECURITY-INPUT-VALIDATION-AUDIT.md` (antes “VALIDATION-AUDIT”) |
| Tier 2 — costes | `docs/audits/COST-DEEP-DIVE.md` (antes “DETAILED-COST-BREAKDOWN”) |
| Tier 3 — troubleshooting | `docs/TROUBLESHOOTING-GUIDE.md` y `docs/01-development/TROUBLESHOOTING.md` |
| Tier 3 — E2E | `docs/E2E-TEST-SCENARIOS.md` y alias `docs/testing/E2E-TEST-SCENARIOS.md` |
| Tier 4 — scripts | `scripts/daily-health-check.sh`, `scripts/performance-test.sh` |
| Tier 4 — wireframes costes | `docs/COST-DASHBOARD-WIREFRAMES.md` (no `docs/design/COST-DASHBOARD-WIREFRAME.md`) |

**Seguimiento producto:** fases A–F del plan de remediación (validación en rutas, más tests admin, etc.) son **backlog**; no bloquean el cierre documental de este archivo.

## Philosophy

**Work on what can be COMPLETED without external input:**
- No API keys needed
- No architecture decisions needed
- No user approval needed
- Resolve → Verify → Commit → Done

---

## TIER 1: HIGH-VALUE, NO DEPENDENCIES (START NOW)

### 1. ✅ Code Review: API Routes (2-3 hours)

**What:** Review all API routes in `apps/api/app/api/*` for:
- Missing error handling
- Input validation gaps
- Security issues (injection, XSS, CSRF)
- Performance bottlenecks
- Inconsistent patterns

**Scope:** 50+ routes across:
- `/api/admin/*` — admin operations
- `/api/portal/*` — user portal
- `/api/public/*` — public endpoints
- `/api/webhooks/*` — incoming webhooks
- `/api/infra/*` — infrastructure

**Deliverables:**
- GitHub issue with findings
- Code review comments (inline)
- Suggested fixes with before/after diffs
- Priority matrix (critical/important/nice-to-have)

**Load skill:** `github-code-review`

**Status:** Entregado en `docs/audits/CODE-REVIEW-API-ROUTES.md`

---

### 2. ✅ Database Query Audit (2-3 hours)

**What:** Analyze Supabase queries across codebase for:
- N+1 query patterns
- Missing indexes
- Query performance (complexity)
- Missing RLS policies
- Unused queries

**Scope:** Search all `.ts` files for:
```typescript
.from('table').select()
supabase.rpc()
client.query()
```

**Tools:** Use grep + manual inspection

**Deliverables:**
- `docs/audits/DATABASE-QUERY-AUDIT.md`
  - 10+ slow queries identified
  - Index recommendations
  - RLS gap analysis
  - Migration proposals
- GitHub issues (one per critical query)

**Status:** Entregado en `docs/audits/DATABASE-QUERY-AUDIT.md`

---

### 3. ✅ Test Coverage Baseline (2 hours)

**What:** Measure current test coverage:
- Count test files per workspace
- Measure line coverage (if possible)
- Identify untested critical paths
- Document baseline for future improvements

**Scope:**
```
apps/api/          → Current tests
apps/portal/       → Current tests
apps/admin/        → Current tests
apps/orchestrator/ → Current tests
apps/mcp/          → Current tests
```

**Tools:** 
```bash
find . -name "*.test.ts" -o -name "*.spec.ts" | wc -l
npm run test -- --coverage (if available)
```

**Deliverables:**
- `docs/audits/TEST-COVERAGE-BASELINE.md`
  - Counts per workspace
  - Coverage gaps
  - Missing test types (unit/integration/e2e)
- GitHub issue: "Test coverage improvement plan"

**Status:** Entregado en `docs/audits/TEST-COVERAGE-BASELINE.md`

---

### 4. ✅ Lint Rules Standardization (1.5 hours)

**What:** Review `.eslintrc.json` + `eslint.config.mjs` for:
- Rule consistency across workspaces
- Missing rules (best practices)
- Override contradictions
- Documentation gaps

**Current state:** Mixed ESLint v8 + v9 (flat config)

**Deliverables:**
- `docs/audits/LINT-RULES-GUIDE.md`
  - Current rules audit
  - Gaps + recommendations
  - Before/after comparison
- PR: Add missing rules (safe ones)
  - `@typescript-eslint/explicit-return-types`
  - `no-console` (warn in dev, error in prod)
  - `prefer-const`
  - etc.

**Status:** Entregado en `docs/audits/LINT-RULES-GUIDE.md`

---

### 5. ✅ Docker Image Optimization (1.5 hours)

**What:** Analyze `Dockerfile*` + `docker-compose*.yml`:
- Multi-stage build efficiency
- Dev vs prod separation
- Base image size
- Unused dependencies in containers
- Layer caching opportunities

**Files to review:**
```
infra/docker-compose.platform.yml
infra/docker-compose.local.yml
infra/docker-compose.workers.yml
apps/*/Dockerfile* (if exist)
```

**Deliverables:**
- `docs/audits/DOCKER-OPTIMIZATION.md`
  - Current sizes + manifests
  - Optimization opportunities
  - Estimated savings (MB/build time)
- PR: Implement quick wins
  - Remove dev deps from prod images
  - Fix layer ordering
  - Add `.dockerignore` improvements

**Time:** 30 min analysis + 1h implementation

**Status:** Entregado en `docs/audits/DOCKER-OPTIMIZATION.md`

---

## TIER 2: HIGH-VALUE, SOME DEPENDENCIES (START AFTER TIER 1)

### 6. ✅ Performance Bottleneck Analysis (3 hours)

**What:** Identify slow operations in:
- API response times (Traefik logs)
- Database queries (Supabase analytics)
- Redis queue depth (job backlogs)
- Worker processing time

**How:**
```bash
# Check recent logs
tail -1000 /opt/opsly/runtime/logs/*.log | grep -i "duration\|latency\|slow"

# Redis queue stats
redis-cli -u "$REDIS_URL" INFO stats

# Check slow queries (if logging available)
grep "SLOW" /opt/opsly/runtime/logs/orchestrator.log
```

**Deliverables:**
- `docs/audits/PERFORMANCE-BOTTLENECK-ANALYSIS.md`
  - Top 10 slow operations
  - Root cause analysis
  - Fix recommendations (with timelines)
- GitHub issues (one per bottleneck)
- Performance improvement plan (ranked)

**Dependency:** Access to VPS logs (can SSH via Tailscale ✅)

**Status:** Entregado (ver tabla de cierre arriba)

---

### 7. ✅ Security Hardening: Input Validation (2.5 hours)

**What:** Review all API endpoints for input validation:
- Missing `.parse()` / `.validate()` calls
- Insufficient regex patterns
- Missing rate limiting per endpoint
- Potential injection vectors

**Tools:**
```bash
grep -r "req.body\|req.query\|req.params" apps/api --include="*.ts" \
  | grep -v "\.parse\|\.validate\|zod\|joi"
```

**Deliverables:**
- `docs/audits/SECURITY-INPUT-VALIDATION-AUDIT.md`
  - 20+ validation gaps identified
  - Zod schema recommendations
  - Before/after fixes
- PR: Add missing validations (batch fixes)

**Status:** Entregado (ver tabla de cierre arriba)

---

### 8. ✅ Cost Optimization: Detailed Spend Analysis (1.5 hours)

**What:** Drill into cost drivers:
- Per-tenant cost allocation
- LLM call costs (if enabled)
- Storage growth trend
- Bandwidth usage

**Data sources:**
```bash
# From supabase usage_events
docker exec opsly_platform_db psql -U postgres -c \
  "SELECT tenant_id, SUM(cost_usd) FROM platform.usage_events GROUP BY tenant_id"

# Cost per operation type
"SELECT operation, COUNT(*), AVG(cost_usd) FROM usage_events GROUP BY operation"
```

**Deliverables:**
- `docs/audits/COST-DEEP-DIVE.md`
  - Per-tenant spending
  - Cost per operation
  - Optimization levers
  - Forecasts (3-6-12 month)
- GitHub issue: "Cost optimization roadmap"

**Status:** Entregado (ver tabla de cierre arriba)

---

## TIER 3: MEDIUM-VALUE, SELF-CONTAINED (PARALLEL TRACK)

### 9. ✅ Documentation Improvements (2 hours)

**What:** Enhance existing docs:
- Add missing examples to OPERATIONS-HANDBOOK.md
- Create troubleshooting guide for common errors
- Add architecture diagrams (text-based)
- Link all ADRs from main README

**Files to enhance:**
```
docs/README.md (link fixes)
docs/OPERATIONS-HANDBOOK.md (add examples)
docs/TROUBLESHOOTING-GUIDE.md (guía principal)
docs/ARCHITECTURE.md (create summary)
```

**Deliverables:**
- 4 updated/new documentation files
- Better navigation in docs/README.md
- Troubleshooting flows (decision trees)

**Status:** Entregado (ver tabla de cierre arriba)

---

### 10. ✅ End-to-End Test Scenarios (2.5 hours)

**What:** Document E2E test scenarios (manual testing guide):
- User signup flow
- Tenant creation workflow
- Payment processing
- Agent deployment
- Growth outreach execution

**Format:** Step-by-step flows with expected results

**Deliverables:**
- `docs/E2E-TEST-SCENARIOS.md` y `docs/testing/E2E-TEST-SCENARIOS.md` (alias)
- Checklist for QA team
- Screenshots (if can capture)

**Status:** Entregado (ver tabla de cierre arriba)

---

## TIER 4: NICE-TO-HAVE (IF TIME ALLOWS)

### 11. ✅ AI Automation: Script Improvements

**What:** Enhance existing scripts:
- `scripts/growth-outreach.sh` — add retry logic + better error messages
- `scripts/validate-fixes.sh` — add more test cases
- Create `scripts/daily-health-check.sh` — automated monitoring

**Deliverables:**
- 3 improved scripts
- Better error messages + debugging

---

### 12. ✅ Dashboard Wireframes

**What:** Design future cost monitoring dashboard
- Text-based wireframes (ASCII art)
- Describe data flow
- Suggest metrics to display

**Deliverables:**
- `docs/COST-DASHBOARD-WIREFRAMES.md`

---

## EXECUTION PLAN

### Phase 1: TIER 1 (Start immediately) — 6-7 hours

**Parallel work while you handle your priorities:**

```
Hour 1-3:   Code Review (apps/api routes)
  ├─ Load github-code-review skill
  ├─ Scan 50+ routes
  ├─ Document findings
  └─ Create issues

Hour 2-4:   Database Query Audit (parallel)
  ├─ Grep for query patterns
  ├─ Analyze performance implications
  ├─ Identify N+1 queries
  └─ Write recommendations

Hour 4-5:   Test Coverage Baseline
  ├─ Count test files
  ├─ Measure coverage
  └─ Document gaps

Hour 5-6:   Lint Rules Standardization
  ├─ Review ESLint config
  ├─ Identify gaps
  └─ Prepare PR

Hour 6-7:   Docker Optimization (parallel)
  ├─ Analyze Dockerfiles
  ├─ Size measurements
  └─ Optimization proposals
```

**Deliverables by end of Phase 1:**
- 3 GitHub issues (code review, database, test coverage)
- 3 new audit documents
- 1 PR (lint rules)
- 1 optimization proposal (Docker)

---

### Phase 2: TIER 2 (After Phase 1) — 5-7 hours

**If Phase 1 completes:**

```
Hour 7-10:  Performance Bottleneck Analysis
  ├─ SSH to VPS
  ├─ Analyze logs
  ├─ Identify slow paths
  └─ Create improvement roadmap

Hour 10-13: Security Hardening (Input Validation)
  ├─ Scan API routes
  ├─ Identify validation gaps
  ├─ Create PR with fixes
  └─ Document patterns

Hour 13-15: Cost Analysis Deep Dive
  ├─ Query usage_events table
  ├─ Calculate per-tenant costs
  ├─ Create forecasts
  └─ Identify savings levers
```

---

### Phase 3: TIER 3 (Parallel or after Phase 2) — 4-5 hours

```
Hour 15-17: Documentation Improvements
  ├─ Enhance existing docs
  ├─ Add examples
  ├─ Create troubleshooting guide
  └─ Link all references

Hour 17-20: E2E Test Scenarios
  ├─ Document workflows
  ├─ Create checklists
  ├─ Add expected results
  └─ QA-ready format
```

---

## DEPENDENCIES & BLOCKERS

### No External Input Needed For:
- ✅ Code review
- ✅ Database audit
- ✅ Test coverage
- ✅ Lint rules
- ✅ Docker optimization
- ✅ Documentation
- ✅ Test scenarios

### Minimal VPS Access Needed For:
- ⏳ Performance analysis (can SSH via Tailscale ✅)
- ⏳ Cost deep dive (need DB access ✅)
- ⏳ Security hardening (local code only ✅)

### No Blockers! All work is self-contained.

---

## ESTIMATED TIMELINE

| Phase | Tasks | Hours | Deliverables | Dependencies |
|-------|-------|-------|--------------|--------------|
| 1 | Code review, audit, test coverage, lint, Docker | 6-7h | 3 issues + 3 docs + 1 PR | None ✅ |
| 2 | Performance, security, cost | 5-7h | 3 issues + analysis | VPS SSH ✅ |
| 3 | Docs, E2E tests | 4-5h | 2 docs + checklist | None ✅ |
| 4 | Scripts, design (optional) | 2-3h | 3 scripts + wireframe | None ✅ |

**Total potential work: 17-22 hours (spread across 1-3 sessions)**

---

## SUCCESS CRITERIA

Each deliverable is VERIFIED before committing:

✅ **Code Review Issues:**
- 20+ findings documented
- Each with severity + suggested fix
- Linked to code locations

✅ **Database Audit:**
- 10+ slow queries identified
- Index recommendations with estimated impact
- RLS gaps documented

✅ **Test Coverage:**
- Baseline established (counts + coverage %)
- Improvement targets defined
- Gaps prioritized

✅ **Lint Rules:**
- PR passes all checks
- ESLint config clean + documented
- No contradictions

✅ **Docker Optimization:**
- Current sizes measured
- 20%+ savings identified
- Build time reduction estimated

---

## Próximos pasos (post-cierre documental)

1. Ejecutar backlog de remediación (auditorías → issues → PRs por fases A–F).
2. Cerrar **Sprint 0 entorno** en `docs/03-agents/HERMES-SPRINT-PLAN.md` (`db push`, Doppler, smokes en despliegue real).

---

## RISK ASSESSMENT

**Breaking Changes Risk:** ZERO
- All work is audits + suggestions
- No PRs without your review
- No production changes
- Local code only (until you approve)

**Time Efficiency:** HIGH
- Work doesn't wait for you
- Parallel execution (multiple tasks)
- Self-contained (no blocking dependencies)
- Clear handoff points

**Deliverables Quality:** HIGH
- Each audit documented with evidence
- Fixes tested locally before PR
- Recommendations prioritized (critical first)
- All work verified + committed

---

*Plan autónomo: fases de ejecución históricas arriba se conservan como referencia; el estado vigente es la sección **Cierre en repo**.*

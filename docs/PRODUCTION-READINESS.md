# Production Readiness & Testing Plan
**Status:** Sprints 6-16 Complete | Ready for Staging → Production  
**Date:** 2026-05-01  
**Owner:** QA Team + DevOps

---

## Executive Summary

OpenClaw per-tenant architecture (Sprints 6-16) is **code-complete** and ready for production deployment. This document provides:

1. **Production Readiness Checklist** — verification before production launch
2. **Testing Strategy** — frontend + backend test suites for QA
3. **Deployment Pipeline** — staging validation → production rollout
4. **Rollback Plan** — recovery procedures if issues occur

---

## Phase 1: Pre-Production Verification ✅

### Code Quality (Already Passing)
- ✅ Type-check: 13/13 packages passing
- ✅ ESLint: 100% compliant (apps/web intentionally excluded)
- ✅ Structure validation: All conventions met
- ✅ Skills manifest: 31 skills indexed and validated

### Architecture Validation (Already Complete)
- ✅ ADR-035: OpenClaw per-tenant architecture documented
- ✅ Redis namespace isolation: `tenant:{slug}:*` implemented
- ✅ Supabase multi-schema: `tenant_{slug}_*` ready
- ✅ Orchestrator tenant-aware: AsyncLocalStorage context propagation
- ✅ LLM Gateway tenant-aware: Per-tenant Redis caching
- ✅ Knowledge pipeline: BullMQ queue + webhook integration
- ✅ Observability: Jaeger tracing, Prometheus metrics, Grafana dashboards

### Documentation (Complete)
- ✅ `docs/OPENCLAW-STAGING-ACTIVATION.md` — 850+ lines operational guide
- ✅ `docs/IMPLEMENTATION-STATUS.md` — Sprint tracking + architecture
- ✅ `docs/adr/ADR-035-openclaw-per-tenant.md` — Decision record
- ✅ `scripts/staging-activation.sh` — 6-phase automation

---

## Phase 2: Staging Validation (Gated by Doppler Admin)

### Pre-Requisite: Admin Configuration
**Task:** Add 15 Doppler variables to `ops-intcloudsysops/prd`:
```bash
OPENCLAW_ENABLED=true
OPENCLAW_MODE=hybrid
CONTEXT_BUILDER_TENANT_AWARE=true
LLM_GATEWAY_TENANT_AWARE=true
ORCHESTRATOR_TENANT_AWARE=true
OPENCLAW_ORCHESTRATOR_URL=http://orchestrator:3011
OPENCLAW_LLM_GATEWAY_URL=http://llm-gateway:3010
OPENCLAW_CONTEXT_BUILDER_BASE_PORT=3012
OPENCLAW_MCP_BASE_PORT=3003
REDIS_NAMESPACE_ENABLED=true
REDIS_NAMESPACE_PREFIX=tenant
SUPABASE_TENANT_SCHEMA_ENABLED=true
JAEGER_ENABLED=true
PROMETHEUS_TENANT_METRICS=true
NOTEBOOKLM_ENABLED=true
```

### Execution: Run Staging Activation Script
```bash
# On VPS staging environment
cd /opt/opsly-staging
chmod +x scripts/staging-activation.sh
./scripts/staging-activation.sh
```

**Automated 6 Phases:**
1. Doppler variable validation
2. Code pull + type-check + lint
3. Docker Compose deployment (9 services)
4. Health checks (4 endpoints)
5. Per-tenant isolation test
6. Summary output

**Expected duration:** 2-3 minutes

### QA Validation Checklist (Staging)

#### Health & Connectivity
- [ ] Orchestrator responding: `curl http://localhost:3011/health`
- [ ] LLM Gateway responding: `curl http://localhost:3010/health`
- [ ] Context Builder responding: `curl http://localhost:3012/health`
- [ ] API responding: `curl http://localhost:3000/api/health`
- [ ] Redis namespaces isolated: `redis-cli KEYS "tenant:*"`
- [ ] Supabase schemas created: psql query `information_schema.schemata`

#### Per-Tenant Isolation (Critical)
- [ ] Create test-tenant-a: `POST /api/tenants` with slug "test-tenant-a"
- [ ] Create test-tenant-b: `POST /api/tenants` with slug "test-tenant-b"
- [ ] Verify Redis isolation: test-tenant-a keys don't appear in test-tenant-b query
- [ ] Verify Supabase isolation: test-tenant-a schema doesn't expose test-tenant-b data
- [ ] Test MCP context: Each tenant's MCP only sees its own resources

#### Feature Validation
- [ ] NotebookLM endpoint responds: `GET /api/tenants/test-tenant-a/notebooklm/sources`
- [ ] Graphyfi visualization: `GET /api/tenants/test-tenant-a/graph/workflows`
- [ ] Orchestrator decision engine: `POST /api/orchestrator/jobs` respects plan limits
- [ ] LLM Gateway caching: Verify `tenant:test-tenant-a:llm:*` keys in Redis

#### Monitoring & Observability
- [ ] Grafana dashboard imports successfully
- [ ] Prometheus metrics collected: `curl http://localhost:9090/api/v1/targets`
- [ ] Jaeger traces appear: access `http://localhost:16686` and search
- [ ] Logs include tenant_slug: `docker logs api | grep tenant_slug`

---

## Phase 3: Backend Testing (For QA Team)

### Run All Tests Locally
```bash
# Type-check (all 13 packages)
npm run type-check

# Run vitest suites
npm run test

# Expected Results:
# - @intcloudsysops/api: ✓ All tests pass
# - @intcloudsysops/ml: ✓ All tests pass
# - @intcloudsysops/context-builder: ✓ All tests pass
# - @intcloudsysops/orchestrator: ✓ All tests pass (Redis connection errors expected if Redis not running)
# - @intcloudsysops/llm-gateway: ✓ Mostly pass (Redis connection errors expected)
# - @intcloudsysops/portal: ✓ All tests pass
# - @intcloudsysops/mcp: ✓ All tests pass
```

### Backend Test Categories

#### API Routes
**File:** `apps/api/__tests__/`
- [ ] Tenant CRUD (`POST /api/tenants`, `GET /api/tenants/:slug`)
- [ ] NotebookLM endpoints (`GET /api/tenants/:slug/notebooklm/sources`)
- [ ] Orchestrator endpoints (`POST /api/orchestrator/jobs`)
- [ ] Health endpoints (lightweight + full)
- [ ] Admin metrics (`GET /api/admin/metrics`)

**Run:** `npm run test --workspace=@intcloudsysops/api`

#### Orchestrator
**File:** `apps/orchestrator/__tests__/`
- [ ] Decision engine (tenant plan limits)
- [ ] Job routing (per-tenant isolation)
- [ ] Context propagation (AsyncLocalStorage)
- [ ] Worker contract validation
- [ ] OAR execution (ReAct, Plan-Execute, Reflection)

**Run:** `npm run test --workspace=@intcloudsysops/orchestrator`

#### LLM Gateway
**File:** `apps/llm-gateway/__tests__/`
- [ ] Tenant context extraction
- [ ] Per-tenant caching
- [ ] Cost tracking per tenant
- [ ] Health checks with tenant filtering
- [ ] Model routing

**Run:** `npm run test --workspace=@intcloudsysops/llm-gateway`

#### Context Builder
**File:** `apps/context-builder/__tests__/`
- [ ] RAG per-tenant
- [ ] Redis namespace isolation
- [ ] Session management
- [ ] Repository context loading

**Run:** `npm run test --workspace=@intcloudsysops/context-builder`

#### ML Module
**File:** `apps/ml/__tests__/`
- [ ] Feedback decision engine
- [ ] Insight generation
- [ ] Task classification
- [ ] Embeddings

**Run:** `npm run test --workspace=@intcloudsysops/ml`

#### Portal
**File:** `apps/portal/__tests__/`
- [ ] Tenant-aware filtering
- [ ] RLS queries
- [ ] Dashboard rendering

**Run:** `npm run test --workspace=@intcloudsysops/portal`

#### MCP
**File:** `apps/mcp/__tests__/`
- [ ] Tool invocation with tenant context
- [ ] Credential isolation
- [ ] Error handling

**Run:** `npm run test --workspace=@intcloudsysops/mcp`

---

## Phase 4: Frontend Testing (For QA Team)

### Setup Frontend Development
```bash
# Install dependencies
npm install

# Start dev server (apps/web)
cd apps/web && npm run dev
# Access: http://localhost:3000

# Start admin dashboard
cd apps/admin && npm run dev
# Access: http://localhost:3001

# Start portal
cd apps/portal && npm run dev
# Access: http://localhost:3002
```

### Frontend Test Scenarios

#### Web App (apps/web)
- [ ] Authentication flow
- [ ] Landing page rendering
- [ ] Navigation between pages
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Performance (Lighthouse score >90)

#### Admin Dashboard (apps/admin)
- [ ] Tenant management (`/admin/tenants`)
- [ ] Per-tenant graph visualization (`/admin/tenants/[slug]/graph`)
- [ ] Skills management (`/admin/tenants/[slug]/skills`)
- [ ] Metrics display (`/admin/metrics`)
- [ ] User access control

#### Portal (apps/portal)
- [ ] Tenant dashboard (`/portal/tenants/[slug]`)
- [ ] Agent status display
- [ ] Cost tracking visualization
- [ ] Recent jobs list
- [ ] Real-time WebSocket updates

#### Cross-Tenant Verification
- [ ] Login as tenant-a, verify can only see tenant-a data
- [ ] Login as tenant-b, verify can only see tenant-b data
- [ ] Admin can see all tenants
- [ ] Opsly internal (tenant_slug="opsly") admin can see all + internal tools

---

## Phase 5: Integration Testing (For QA Team)

### End-to-End Workflow
```bash
# 1. Provision new tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"e2e-test","name":"E2E Test Tenant"}'

# 2. Create orchestrator job
curl -X POST http://localhost:3000/api/orchestrator/jobs \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"intent":"test_workflow","initiated_by":"tester"}'

# 3. Verify job appears in tenant context
# - Check Redis: redis-cli KEYS "tenant:e2e-test:jobs:*"
# - Check Supabase: SELECT * FROM tenant_e2e_test.jobs

# 4. Monitor job execution
# - Check Jaeger traces
# - Check Prometheus metrics
# - Check structured logs

# 5. Cleanup
curl -X POST http://localhost:3000/api/tenants/e2e-test/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Phase 6: Production Deployment

### Pre-Production Checklist
- [ ] All staging tests passed
- [ ] QA team signed off
- [ ] Rollback plan tested
- [ ] Monitoring dashboards ready
- [ ] On-call runbooks prepared
- [ ] Feature flags configured

### Canary Deployment (Recommended)
```bash
# Enable OPENCLAW_ENABLED=true for 10% of traffic initially
# Monitor metrics for 24 hours
# Gradually increase to 25%, 50%, 100%
```

### Full Deployment
```bash
# Deploy to production with all feature flags enabled
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.platform.yml up -d
```

### Post-Deployment Verification
- [ ] All services healthy
- [ ] No error spikes in logs
- [ ] Metrics baseline met
- [ ] Customer-facing endpoints responding
- [ ] Per-tenant isolation verified in production

---

## Phase 7: Rollback Procedures

### Quick Disable (30 seconds)
```bash
# Set in Doppler
OPENCLAW_ENABLED=false

# Restart services
docker compose -f infra/docker-compose.platform.yml restart api orchestrator llm-gateway
```

### Full Rollback (to previous commit)
```bash
git reset --hard HEAD~1
git push -f origin production
```

---

## Testing Responsibilidades

| Role | Task | Timeline |
|------|------|----------|
| **QA Team** | Run all backend + frontend tests | Week 1 |
| **QA Team** | Execute E2E integration scenarios | Week 1 |
| **DevOps** | Deploy to staging with Doppler vars | Day 1 |
| **DevOps** | Verify staging health checks | Day 1 |
| **DevOps** | Setup monitoring + alerting | Week 1 |
| **Product** | Approve feature flags for production | Week 1 |
| **Engineering** | Be on-call during production rollout | Week 2 |

---

## Success Criteria

### For Staging
- ✅ All 6 phases of staging-activation.sh complete
- ✅ Per-tenant isolation verified
- ✅ Health checks all passing
- ✅ No cross-tenant data leaks
- ✅ Monitoring dashboards functional

### For Production
- ✅ All QA tests passing
- ✅ E2E workflows successful
- ✅ Zero customer impact
- ✅ Performance benchmarks met
- ✅ Security audit passed

---

## Next Steps

1. **Today:** Admin adds 15 Doppler variables
2. **Tomorrow:** Infra runs staging-activation.sh
3. **Day 3-5:** QA executes full test suite
4. **Day 5:** Go/No-Go decision for production
5. **Week 2:** Canary rollout to production

---

**Document:** `docs/PRODUCTION-READINESS.md`  
**Status:** Ready for QA Execution  
**Owner:** QA Team + DevOps

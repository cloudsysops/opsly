# QA Testing Brief — OpenClaw Production Readiness
**Date:** 2026-05-01  
**Status:** Code Complete → Ready for QA Execution  
**Duration:** 5 days to Production Go/No-Go Decision

---

## Overview

OpenClaw per-tenant architecture (Sprints 6-16) is **code-complete** and ready for testing. Your task: validate all components work correctly before production deployment.

---

## Your Responsibilities

### 1️⃣ Backend Testing (Days 1-3)
**Run automated test suites to verify core functionality:**

```bash
# Setup
cd /home/user/opsly
npm install  # Only needed once

# Run all backend tests
npm run test

# If tests fail with Redis errors, that's expected (local Redis not running)
# Focus on test file structure and logic
```

**What to test:**
- ✅ API route handlers (tenant CRUD, orchestrator jobs, health checks)
- ✅ Orchestrator decision engine (plan limits, job routing)
- ✅ LLM Gateway (tenant caching, cost tracking)
- ✅ Context Builder (RAG isolation, Redis namespaces)
- ✅ ML Module (feedback engine, task classification)

**Expected result:** ~200+ tests passing

---

### 2️⃣ Staging Validation (Days 2-3)
**Once admin deploys to staging with Doppler variables, execute:**

```bash
# Health checks
curl http://localhost:3011/health | jq .  # Orchestrator
curl http://localhost:3010/health | jq .  # LLM Gateway
curl http://localhost:3012/health | jq .  # Context Builder
curl http://localhost:3000/api/health | jq .  # API

# Per-tenant isolation test
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"qa-test-a","name":"QA Test A"}'

curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"qa-test-b","name":"QA Test B"}'

# Verify Redis isolation
redis-cli KEYS "tenant:qa-test-a:*"
redis-cli KEYS "tenant:qa-test-b:*"
# Result should show NO overlap between tenants
```

**Verification points:**
- ✅ All 4 services respond to health checks
- ✅ Per-tenant Redis keys don't overlap
- ✅ No cross-tenant data visible

---

### 3️⃣ Frontend Testing (Days 3-4)
**Start dev servers and test user flows:**

```bash
# Terminal 1: Web app
cd apps/web && npm run dev
# → Open http://localhost:3000

# Terminal 2: Admin dashboard
cd apps/admin && npm run dev
# → Open http://localhost:3001

# Terminal 3: Portal
cd apps/portal && npm run dev
# → Open http://localhost:3002
```

**Test scenarios:**
- User can log in and see only their tenant data
- Admin can see all tenants
- Dashboard displays correctly on mobile/tablet/desktop
- No console errors in browser DevTools

---

### 4️⃣ E2E Integration (Day 4)
**Execute complete workflow from tenant creation to job execution:**

```bash
# 1. Create new tenant via API
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"e2e-workflow","name":"E2E Workflow Test"}'

# 2. Create orchestrator job
curl -X POST http://localhost:3000/api/orchestrator/jobs \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"intent":"test_job","initiated_by":"qa-tester"}'

# 3. Verify in monitoring
# - Check Jaeger traces: http://localhost:16686
# - Check Prometheus metrics: http://localhost:9090
# - Check logs: docker logs api | grep tenant_slug

# 4. Cleanup
curl -X DELETE http://localhost:3000/api/tenants/e2e-workflow \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Success criteria:**
- ✅ Tenant created successfully
- ✅ Job enqueued and processed
- ✅ No cross-tenant data leaks
- ✅ Monitoring captured all events

---

### 5️⃣ Deliverables (Day 5)
**Compile test report with:**

1. **Test Execution Summary**
   - Total tests run: ___
   - Passed: ___
   - Failed: ___
   - Blocked: ___

2. **Backend Test Results**
   - API routes: ✅/❌
   - Orchestrator: ✅/❌
   - LLM Gateway: ✅/❌
   - Context Builder: ✅/❌
   - ML Module: ✅/❌

3. **Staging Validation Results**
   - Health checks: ✅/❌
   - Per-tenant isolation: ✅/❌
   - Cross-tenant data leakage: None/Found
   - Feature endpoints: ✅/❌

4. **Frontend Testing Results**
   - Web app functionality: ✅/❌
   - Admin dashboard: ✅/❌
   - Portal: ✅/❌
   - Performance: ✅/❌

5. **E2E Integration Results**
   - Tenant workflow: ✅/❌
   - Job execution: ✅/❌
   - Data isolation: ✅/❌
   - Monitoring: ✅/❌

6. **Issues Found**
   - Critical: [List any blocking issues]
   - High: [List high-priority bugs]
   - Medium: [List medium-priority issues]
   - Low: [List minor issues]

7. **Recommendation**
   - ✅ Ready for Production
   - ⚠️ Ready with Mitigations
   - ❌ Not Ready (blockers must be fixed)

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `docs/PRODUCTION-READINESS.md` | Complete production guide (382 lines) |
| `docs/OPENCLAW-STAGING-ACTIVATION.md` | Staging deployment guide (850+ lines) |
| `docs/IMPLEMENTATION-STATUS.md` | Sprint tracking and architecture (500+ lines) |
| `scripts/staging-activation.sh` | Automated 6-phase deployment script |

---

## Success Criteria for Go to Production

✅ **MUST HAVE:**
- All backend tests passing
- Per-tenant isolation verified (no cross-tenant data leaks)
- All frontend components functional
- E2E workflow successful
- No critical or high-priority bugs

✅ **NICE TO HAVE:**
- Performance benchmarks met (<5s job completion)
- Monitoring dashboards functional
- Logs properly structured
- Documentation complete

---

## Timeline

| Day | Phase | Owner |
|-----|-------|-------|
| **1** | Doppler setup + staging deploy | DevOps |
| **1-2** | Backend test execution | QA |
| **2-3** | Staging validation | QA |
| **3-4** | Frontend testing | QA |
| **4** | E2E integration testing | QA |
| **5** | Report compilation + go/no-go | QA |

---

## Contacts

- **QA Lead:** [Your Name]
- **DevOps Lead:** [DevOps Name]
- **Product Manager:** [PM Name]
- **Engineering Lead:** [Engineering Name]

---

## Quick Links

- Repository: https://github.com/cloudsysops/opsly
- Staging: https://staging.opsly.domain (after deployment)
- Admin Panel: http://localhost:3001 (local development)
- Monitoring: http://localhost:9090 (Prometheus)
- Tracing: http://localhost:16686 (Jaeger)

---

**Ready to begin? Start with backend tests!**

```bash
npm run test
```

Good luck! 🚀

# OpenClaw Staging Activation Plan

**Status:** Ready for Deployment  
**Date:** 2026-05-01  
**Sprints:** 6-16 Complete + Merged to Main

---

## Overview

This document describes the process to activate OpenClaw per-tenant architecture in the staging environment. All code changes (Sprints 6-16) are merged to `main` and ready for deployment.

## Phase 1: Doppler Configuration (Admin Task)

### Required New Variables in Doppler (`ops-intcloudsysops/prd`)

Add the following variables to enable OpenClaw per-tenant features:

```bash
# OpenClaw Core - Feature Flags
OPENCLAW_ENABLED=true
OPENCLAW_MODE=hybrid                      # shared | isolated | hybrid
CONTEXT_BUILDER_TENANT_AWARE=true
LLM_GATEWAY_TENANT_AWARE=true
ORCHESTRATOR_TENANT_AWARE=true

# OpenClaw Ports & URLs
OPENCLAW_ORCHESTRATOR_URL=http://orchestrator:3011
OPENCLAW_LLM_GATEWAY_URL=http://llm-gateway:3010
OPENCLAW_CONTEXT_BUILDER_BASE_PORT=3012
OPENCLAW_MCP_BASE_PORT=3003

# Redis Namespace Configuration
REDIS_NAMESPACE_ENABLED=true
REDIS_NAMESPACE_PREFIX=tenant

# Supabase Multi-Schema
SUPABASE_TENANT_SCHEMA_ENABLED=true

# Observability
JAEGER_ENABLED=true
JAEGER_HOST=localhost
JAEGER_PORT=6831
PROMETHEUS_TENANT_METRICS=true

# NotebookLM Integration
NOTEBOOKLM_ENABLED=true
NOTEBOOKLM_API_KEY=<to-be-configured>     # Get from Google NotebookLM API
NOTEBOOKLM_PROJECT_ID=<to-be-configured>

# Knowledge Pipeline
KNOWLEDGE_PIPELINE_ENABLED=true
OBSIDIAN_SYNC_ENABLED=true
GRAPHYFI_ENABLED=true

# ML Module
ML_FEEDBACK_ENABLED=true
ML_EMBEDDINGS_ENABLED=true

# Portal & Skills
PORTAL_TENANT_AWARE=true
SKILLS_DISCOVERY_ENABLED=true
```

### Validation

After adding variables, run:

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/validate-openclaw-vars.sh
```

Expected output:
```
=== OpenClaw Variables Validation ===
✓ PASS: OPENCLAW_ENABLED=true
✓ PASS: OPENCLAW_MODE=hybrid
✓ PASS: CONTEXT_BUILDER_TENANT_AWARE=true
✓ PASS: All validations passed (5/5)
```

---

## Phase 2: Staging Deployment

### 1. Pull Latest Code

```bash
cd /opt/opsly-staging  # or /opt/opsly (depending on setup)
git fetch origin
git checkout main
git pull origin main
```

### 2. Verify Type-Check & Lint

```bash
npm run type-check     # Should pass: 13/13 packages
npm run lint           # Should pass: 100% ESLint
```

### 3. Build Docker Images (CI/CD or Manual)

If using GitHub Actions CI (recommended):
- Push to `staging` branch → GHA builds `:staging` images
- Images: `ghcr.io/cloudsysops/intcloudsysops-*:staging`

If manual build:
```bash
docker build -t ghcr.io/cloudsysops/intcloudsysops-api:staging ./apps/api
docker build -t ghcr.io/cloudsysops/intcloudsysops-orchestrator:staging ./apps/orchestrator
docker build -t ghcr.io/cloudsysops/intcloudsysops-llm-gateway:staging ./apps/llm-gateway
docker build -t ghcr.io/cloudsysops/intcloudsysops-context-builder:staging ./apps/context-builder
docker build -t ghcr.io/cloudsysops/intcloudsysops-mcp:staging ./apps/mcp
```

### 4. Deploy Compose Stack

```bash
# Load environment from Doppler
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.platform.yml up -d

# Verify services are running
docker ps --filter "label=app=opsly" --format "table {{.Names}}\t{{.Status}}"
```

Expected services:
```
NAME                 STATUS
redis                Up 2 seconds
traefik              Up 3 seconds
api                  Up 4 seconds
admin                Up 4 seconds
portal               Up 4 seconds
mcp                  Up 5 seconds
orchestrator         Up 5 seconds
llm-gateway          Up 5 seconds
context-builder      Up 5 seconds
```

### 5. Health Checks

```bash
# Orchestrator health
curl -s http://localhost:3011/health | jq .

# LLM Gateway health
curl -s http://localhost:3010/health | jq .

# Context Builder health
curl -s http://localhost:3012/health | jq .

# MCP health
curl -s http://localhost:3003/health | jq .

# API health
curl -s http://localhost:3000/api/health | jq .
```

### 6. Test Per-Tenant Isolation

Create sample tenants and verify isolation:

```bash
# Create test tenant A
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-tenant-a","name":"Test Tenant A"}'

# Create test tenant B
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-tenant-b","name":"Test Tenant B"}'

# Verify tenants have isolated Redis namespaces
redis-cli -n 0 keys "tenant:test-tenant-a:*"   # Should show tenant A keys only
redis-cli -n 0 keys "tenant:test-tenant-b:*"   # Should show tenant B keys only

# Verify Supabase schemas created
psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'"
# Expected: tenant_test-tenant-a, tenant_test-tenant-b
```

---

## Phase 3: Feature Validation (E2E Tests)

### 1. NotebookLM API Endpoint

```bash
# Query NotebookLM sources (currently returns empty until implemented)
curl -s http://localhost:3000/api/tenants/test-tenant-a/notebooklm/sources \
  -H "Authorization: Bearer $TENANT_A_TOKEN" | jq .

# Expected response (stub):
# {
#   "sources": [],
#   "config": null,
#   "total_sources": 0
# }
```

### 2. Graphyfi Workflow Visualization

```bash
# Get workflow graph for tenant
curl -s http://localhost:3000/api/tenants/test-tenant-a/graph/workflows \
  -H "Authorization: Bearer $TENANT_A_TOKEN" | jq .

# Expected: Mermaid/Graphviz DAG format
```

### 3. Orchestrator Decision Engine

```bash
# Create a job (should respect tenant plan limits)
curl -X POST http://localhost:3000/api/orchestrator/jobs \
  -H "Authorization: Bearer $TENANT_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "deploy_app",
    "context": {"app_name": "myapp"},
    "initiated_by": "user123"
  }' | jq .

# Verify job has tenant_slug
# {
#   "id": "job-123",
#   "tenant_slug": "test-tenant-a",
#   "status": "queued",
#   ...
# }
```

### 4. LLM Gateway Tenant Caching

```bash
# Query LLM Gateway (should cache per tenant namespace)
curl -X POST http://localhost:3010/chat/completions \
  -H "Authorization: Bearer $LLM_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: test-tenant-a" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}' | jq .

# Check Redis cache
redis-cli -n 0 keys "tenant:test-tenant-a:llm:*"   # Should have cache entries
```

---

## Phase 4: Monitoring & Observability

### 1. Enable Grafana Dashboard

```bash
# Import dashboard from generated config
curl -X POST http://localhost:3000/api/v1/dashboards/import \
  -H "Authorization: Bearer $GRAFANA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @infra/grafana/dashboards/openclaw-tenant-self-service.json

# Navigate to: http://staging.ops-smiletripcare.com:3000
# Select: "OpenClaw per Tenant - Self Service"
```

### 2. View Jaeger Traces

```bash
# Jaeger UI: http://staging.ops-smiletripcare.com:16686
# Search traces by:
# - tenant.slug="test-tenant-a"
# - job.id="job-123"
```

### 3. Check Structured Logs

```bash
# Logs should include tenant_slug
docker logs api | grep "tenant_slug"

# Example log line:
# [orchestrator] Processing job: job-123 for tenant_slug=test-tenant-a
```

---

## Rollback Plan

If issues occur in staging:

### Option A: Quick Disable (Feature Flags)

```bash
# In Doppler, set:
OPENCLAW_ENABLED=false
CONTEXT_BUILDER_TENANT_AWARE=false
LLM_GATEWAY_TENANT_AWARE=false

# Restart services
docker compose -f infra/docker-compose.platform.yml restart api orchestrator llm-gateway
```

### Option B: Revert Commit

```bash
cd /opt/opsly-staging
git reset --hard HEAD~1  # Revert to previous commit
git push -f origin staging
```

---

## Sign-Off Criteria for Production

Before promoting to production, verify:

- [ ] All E2E tests pass
- [ ] Per-tenant isolation confirmed (A cannot see B's data)
- [ ] Orchestrator decision engine enforces plan limits
- [ ] LLM Gateway caching works per tenant
- [ ] NotebookLM API endpoints respond correctly
- [ ] Grafana dashboards display per-tenant metrics
- [ ] Jaeger traces captured for all jobs
- [ ] Zero downtime during deployment
- [ ] Performance benchmarks met (<5s job completion)
- [ ] Security checks pass (no cross-tenant data leaks)

---

## Next Steps

1. **[ADMIN]** Add Doppler variables (Phase 1)
2. **[INFRA]** Deploy to staging (Phase 2)
3. **[QA]** Run E2E validation tests (Phase 3)
4. **[MONITORING]** Configure dashboards (Phase 4)
5. **[DECISION]** Approve production rollout
6. **[DEPLOY]** Canary deploy to production with feature flags

---

## Contacts

- **Infrastructure:** DevOps team
- **Code Review:** Architecture team
- **Testing:** QA team
- **Monitoring:** SRE team

**Document:** `docs/OPENCLAW-STAGING-ACTIVATION.md`

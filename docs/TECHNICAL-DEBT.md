---
status: living-document
owner: operations
last_update: 2026-05-08T03:40:00Z
priority: reference
---

# Technical Debt Register

Audit ejecutado: 2026-05-08 03:30 UTC  
Branch: main  
Agente: Hermes (CLI) 

---

## 🔴 CRÍTICO (Bloquea deployments)

### 1. Next.js Route Cache Corruption

**Status:** Explorado  
**Impact:** Type-check FAIL en `apps/api`, `apps/admin`  
**Root Cause:** `.next/types/validator.ts` referencia rutas que no existen en código

Rutas fantasma referenciadas:
- `apps/api/app/api/admin/agents/hive/objective/[taskId]/route.js`
- `apps/api/app/api/admin/agents/mcp/catalog/route.js`
- `apps/api/app/api/admin/agents/terminal/[agentId]/sessions/ts`
- `apps/api/app/api/portal/tenant/[slug]/agents/hive/objective/[taskId]/route.js`
- (+ ~18 más)

**Why it happened:**  
- Routes definidas en `apps/orchestrator` (health-server.ts)
- Not en `apps/api` como espera Next.js validator
- Build cache caché acumula referencias deletreadas

**Fix attempted:**
```bash
rm -rf apps/admin/.next apps/api/.next
npm run build  # Interrupted (timeout en Mac)
```

**Real fix:**
1. Clean `.next` en todos workspaces Next.js
2. Rebuild single workspace a la vez (orchestrator, api, admin)
3. OR: deregister rutas agentes de `apps/api` spec si viven en orchestrator

**Owner:** @architecture  
**Est. time:** 2-3 hours (debugging + rebuild)

---

### 2. Agent API Surface Misalignment

**Status:** Design drift  
**Impact:** Type-check, runtime 404s  
**Root Cause:** Agents routes (hive, mcp, terminal) en orchestrator pero validator expects api

**Current state:**
- `apps/orchestrator/src/health-server.ts`: inline routes for `/internal/hive`, `/internal/mcp`, `/internal/terminal`
- `apps/orchestrator/src/workers/LocalClaudeWorker.ts`: HTTP worker expects routes
- Tests in `scripts/hive-run.ts` call `/internal/hive/objective`

**Expected state:**
- Routes should be in `apps/api/app/api/` if validator checks them
- OR orchestrator should be excluded from Next.js route discovery

**Decision needed:**
- A) Move agent routes to `apps/api` + gateway from orchestrator
- B) Exclude orchestrator from Next.js type checking
- C) Redefine OpenAPI spec to only include real routes

**ADR candidate:** ADR-028 (Agent API Routing)  
**Owner:** @architect  
**Est. time:** 4-6 hours (ADR + implementation)

---

## 🟡 IMPORTANT (Deployment warning, not blocking)

### 3. NPM Vulnerability: 11 Moderate

**Status:** Unfixed  
**Severity:** Moderate (no critical/high)  
**Count:** 11 transitive vulns

Notable packages:
- **llamaindex** (2 vulns via @llamaindex/workflow)
  - Severity: moderate  
  - Fix available: v0.11.9 (SemVer major)
  - Impact: RAG pipeline optional, not user-facing

- **esbuild** (1 vuln in task-orchestrator)
  - Advisory GHSA-67mh-4wv8-2f99: enables cross-origin requests to dev server
  - CVSS: 5.3 (medium)
  - Range: <=0.24.2
  - Fix: upgrade vitest 4.1.5 (major)
  - Impact: only in local dev (task-orchestrator experimental)

- **express-rate-limit** (1 vuln via ip-address)
  - Range: 8.0.1 - 8.5.0
  - Fix available: true
  - Impact: API rate limiting bypass possible
  - **Action:** upgrade express-rate-limit in package.json

**Why not auto-fixed:**
```
npm audit fix --legacy-peer-deps
→ Error: Unsupported platform @esbuild/linux-x64 on darwin
```

Platform mismatch: `package-lock.json` has linux bins, running on Mac.

**Fix strategy:**
1. `npm ci --force` on clean VPS (Linux) to resolve binaries
2. Or: manually patch lockfile to remove platform-specific bins
3. Or: accept moderate vulns until major version upgrade (LLamaIndex 0.12)

**Risk:** LOW (no critical vulns, experimental code)  
**Owner:** @devops  
**Est. time:** 1 hour (VPS rebuild) or 2-3 hours (lockfile surgery)

---

### 4. Missing Lint Task

**Status:** Soft fail  
**Impact:** CI would not run lint in current setup  
**Root Cause:** `npm run lint:check` doesn't exist

```bash
$ npm run lint:check
npm error Missing script: "lint:check"
```

**Current scripts exist:**
- `npm run lint` (might exist)
- `npm run lint:fix` (in api + admin workspaces)

**Real issue:** No unified lint validation in root `package.json`

**Fix:**
```json
{
  "scripts": {
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "lint:check": "turbo run lint --continue"
  }
}
```

**Est. time:** 15 minutes  
**Owner:** @eng  
**Priority:** LOW (can run `npm run lint` instead)

---

## 🟢 TECHNICAL IMPROVEMENT (Nice-to-have)

### 5. Test Suite Incomplete

**Status:** Partial  
**Impact:** No clear test coverage metrics  
**Current state:**
- Orchestrator: 92 tests (documented in AGENTS.md)
- Others: unknown (0 reported in audit)

**Missing:**
- Test script definitions in workspaces
- CI test job
- Coverage reporting

**Fix:** Add to each workspace that needs tests
```json
{
  "scripts": {
    "test": "vitest --run --reporter=verbose",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

**Est. time:** 2 hours (config + baseline)  
**Owner:** @qa  
**Priority:** MEDIUM (improves confidence)

---

### 6. Next.js Build Optimization

**Status:** Slow  
**Impact:** CI/CD pipeline time  
**Current:** Full rebuild every PR

**Opportunity:**
- Incremental builds via Turbo cache
- SWC minifier config in `next.config.js`
- Disable Source maps in prod build

**Est. time:** 1 hour  
**Savings:** ~10-15% build time  
**Owner:** @devops  
**Priority:** LOW (works, just slow)

---

### 7. Docker Image Size

**Status:** Unknown  
**Impact:** Deployment speed, hosting cost  
**Current:** 1 image in local Docker (intcloudsysops-context-builder:test)

**To measure:**
```bash
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep opsly
```

**Typical Next.js images:** 500MB-1GB (full nodejs + deps)

**Opportunity:**
- Distroless base images
- Multi-stage builds
- Remove dev deps in runtime

**Est. time:** 2 hours per app  
**Savings:** 30-50% image size  
**Owner:** @devops  
**Priority:** LOW (not blocking)

---

## 📋 Summary Table

| Item | Severity | Blocker | Est. Fix | Owner | Status |
|------|----------|---------|----------|-------|--------|
| Route cache corruption | 🔴 Critical | YES | 2-3h | @arch | Exploring |
| Agent API alignment | 🔴 Critical | YES | 4-6h | @arch | Design |
| npm vulns (11 moderate) | 🟡 Important | NO | 1-2h | @devops | Unfixed |
| Missing lint:check | 🟡 Important | NO | 15m | @eng | TODO |
| Test suite incomplete | 🟢 Improvement | NO | 2h | @qa | TODO |
| Build optimization | 🟢 Improvement | NO | 1h | @devops | TODO |
| Docker image size | 🟢 Improvement | NO | 2h | @devops | TODO |

---

## Next Steps

1. **Immediate (today):** ADR-028 decision on agent routes → unlocks type-check
2. **Short-term (this week):** npm audit fix on VPS + lint task
3. **Medium-term (sprint):** Test framework + build optimization
4. **Long-term:** Docker image size audit

---

## How to Update This Document

Add entries under appropriate severity:
```markdown
### N. [Issue Title]

**Status:** [Discovered|Exploring|Designed|In-progress|Fixed]
**Impact:** [How it breaks or slows things]
**Root Cause:** [Why it exists]
**Fix:** [Steps to resolve]
**Est. time:** [Hours]
**Owner:** [@slack-handle or team]
```

Then move to ✅ RESOLVED when done, with completion date.

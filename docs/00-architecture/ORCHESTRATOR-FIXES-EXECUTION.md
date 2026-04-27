# 📋 Quick Fix Execution Guide - Orchestrator Critical Issues

**Target:** Fix 3 critical issues + 4 important issues  
**Time:** ~1.5 hours  
**Verification:** All tests pass + type-check green

---

## CRITICAL ISSUES (Fix Tonight - 30 min)

### Fix #1: Add Timeout to llm-gateway-client.ts (10 min)

```bash
# Step 1: Open file
cd /Users/dragon/cboteros/proyectos/intcloudsysops
open -a "Visual Studio Code" apps/orchestrator/src/llm-gateway-client.ts

# Step 2: Copy the FIXED version from /tmp (prepared by review)
cat /tmp/llm-gateway-client-FIXED.ts

# Step 3: Replace entire file content with fixed version (use cmd+a, cmd+v in VS Code)
# Or use this command to overwrite:
cp /tmp/llm-gateway-client-FIXED.ts apps/orchestrator/src/llm-gateway-client.ts

# Step 4: Verify changes
git diff apps/orchestrator/src/llm-gateway-client.ts

# Step 5: Type-check
npm run type-check -- --workspace=@intcloudsysops/orchestrator
# Expected: ✅ 0 errors
```

**Changes Applied:**

- ✅ Added AbortController with 30s timeout
- ✅ Added try-catch on JSON.parse
- ✅ Added Zod validation schema (LLMMetricsSchema, PlannerActionSchema, etc.)
- ✅ Added error handling for AbortError

---

### Fix #2: Add Default Case to planner-map.ts (2 min)

```bash
# Step 1: Open file
open -a "Visual Studio Code" apps/orchestrator/src/planner-map.ts

# Step 2: Find line 90 (end of switch statement, before function closing brace)
# Press Ctrl+G → type "90" → Enter

# Step 3: Add this code before the closing brace of the switch:
    default: {
      throw new Error(
        `plannerActionToOrchestratorJob: unknown tool "${tool}" - available: ${DEFAULT_PLANNER_TOOL_NAMES.join(", ")}`,
      );
    }

# Step 4: Verify syntax
npm run type-check -- --workspace=@intcloudsysops/orchestrator
# Expected: ✅ 0 errors
```

**Visual Guide:**

```typescript
    case "notify":
      // ... return notify job ...
      break;
    default: {  // ← ADD THIS
      throw new Error(
        `plannerActionToOrchestratorJob: unknown tool "${tool}" - available: ${DEFAULT_PLANNER_TOOL_NAMES.join(", ")}`,
      );
    }
  }  // ← End of switch
```

---

### Fix #3: Test That Fixes Work (5 min)

```bash
# Step 1: Run orchestrator tests
npm run test --workspace=@intcloudsysops/orchestrator
# Expected: ✅ All tests pass

# Step 2: Type-check all packages
npm run type-check
# Expected: ✅ 11/11 successful

# Step 3: Commit critical fixes
git add apps/orchestrator/src/llm-gateway-client.ts apps/orchestrator/src/planner-map.ts
git commit -m "fix(orchestrator): critical timeout, JSON validation, and default case

- Add AbortController timeout (30s) to callRemotePlanner fetch
- Add try-catch on JSON.parse and Zod validation schema
- Add default case in plannerActionToOrchestratorJob switch
- Fixes hanging requests, malformed JSON crashes, unknown tool issues

Status: CRITICAL issues resolved ✅
Tests: 11/11 type-check passing"

# Step 4: Push
git push origin main
```

---

## IMPORTANT ISSUES (This Week - 1 hour)

### Fix #4: Replace Array Index with Map in engine.ts (15 min)

```bash
# Step 1: Open file
open -a "Visual Studio Code" apps/orchestrator/src/engine.ts

# Step 2: Go to lines 103-124 (press Ctrl+G → type "103")

# Step 3: Find this block:
      const enqueued = await Promise.all(jobs.map((job) => enqueueJob(job)));
      await Promise.all(
        enqueued.map(async (job, index) => {
          const queuedJob = jobs[index];
          if (!queuedJob) {
            return;
          }
          await setJobState(String(job.id), {
            // ...
          });
        }),
      );

# Step 4: Replace with this:
      const enqueuedMap = new Map<string, OrchestratorJob>();
      for (const job of jobs) {
        const enqueuedJob = await enqueueJob(job);
        enqueuedMap.set(String(enqueuedJob.id), job);
      }

      await Promise.allSettled(
        Array.from(enqueuedMap.entries()).map(async ([bullmqJobId, queuedJob]) => {
          await setJobState(bullmqJobId, {
            id: bullmqJobId,
            type: queuedJob.type,
            status: "pending",
            tenant_slug: queuedJob.tenant_slug,
            tenant_id: queuedJob.tenant_id,
            plan: queuedJob.plan,
            request_id: queuedJob.request_id,
            idempotency_key: queuedJob.idempotency_key,
            cost_budget_usd: queuedJob.cost_budget_usd,
            agent_role: queuedJob.agent_role,
            started_at: new Date().toISOString(),
          });
        }),
      );

      return {
        jobs_enqueued: enqueuedMap.size,
        job_ids: Array.from(enqueuedMap.keys()),
        intent,
        request_id: correlationId,
        planner: {
          reasoning: gw.planner.reasoning,
          actions_count: gw.planner.actions.length,
          llm: gw.llm,
        },
      };

# Step 5: Verify
npm run type-check -- --workspace=@intcloudsysops/orchestrator
npm run test --workspace=@intcloudsysops/orchestrator
```

---

### Fix #5: Add Healthchecks to docker-compose.platform.yml (10 min)

```bash
# Step 1: Open file
open -a "Visual Studio Code" infra/docker-compose.platform.yml

# Step 2: Find the "app:" service (around line 69)

# Step 3: Add healthcheck after "restart: unless-stopped" (before deploy:):
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

# Step 4: Also add to "admin:" service (around line 106):
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

# Step 5: Also add to "portal:" service (around line 125):
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

# Step 6: Also add to "mcp:" service (around line 149):
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

# Step 7: Validate YAML syntax
docker-compose -f infra/docker-compose.platform.yml config > /dev/null && echo "✅ YAML is valid"
```

**Why healthcheck?**

- Docker Compose can detect service failures
- Orchestrator can check service health via Docker API
- Helps with auto-recovery and alerting

---

### Fix #6: Replace console.log with Logger (15 min)

```bash
# Step 1: Check if observability/worker-log.ts exists
ls -la apps/orchestrator/src/observability/worker-log.ts
# Expected: File exists ✅

# Step 2: Open apps/orchestrator/src/index.ts
open -a "Visual Studio Code" apps/orchestrator/src/index.ts

# Step 3: Replace console.log statements (8 instances)
# Example conversion:

# ❌ BEFORE:
console.log(`[orchestrator] Evento: ${event}`, eventData);

# ✅ AFTER (if using same format):
process.stdout.write(
  `${JSON.stringify({
    event: "orchestrator_event_received",
    event_type: event,
    data: eventData,
    timestamp: new Date().toISOString(),
  })}\n`,
);

# Or use a logger if one exists:
# import { logger } from "./observability/logger.js";
# logger.info("orchestrator event received", { event_type: event, data: eventData });

# Step 4: Type-check
npm run type-check

# Step 5: Verify no breaking changes
npm run test --workspace=@intcloudsysops/orchestrator
```

---

### Fix #7: Commit Important Fixes

```bash
# Step 1: Stage changes
git add apps/orchestrator/src/engine.ts infra/docker-compose.platform.yml apps/orchestrator/src/index.ts

# Step 2: Commit with detailed message
git commit -m "refactor(orchestrator): improve reliability with healthchecks and Map correlation

- Replace array index correlation with Map<jobId, job> in engine.ts
- Use Promise.allSettled instead of Promise.all for resilience
- Add healthchecks to all app services in docker-compose.yml
- Replace console.log with structured logging format
- Fixes race condition in job state tracking
- Fixes silent failures in healthcheck detection

Status: IMPORTANT issues resolved ✅
Tests: 11/11 type-check passing, full test suite green"

# Step 3: Push
git push origin main
```

---

## Verification Checklist (After All Fixes)

```bash
# 1. Type-check passes
npm run type-check
# Expected output:
#   Tasks:    11 successful, 11 total
#   Time:     XXms

# 2. Tests pass
npm run test
# Expected output:
#   ✅ 155 tests passing

# 3. Docker compose validates
docker-compose -f infra/docker-compose.platform.yml config > /dev/null
# Expected output: (none, just success)

# 4. Linting passes
npm run lint
# Expected output:
#   ✅ 0 warnings

# 5. Git status clean
git status
# Expected output:
#   On branch main
#   nothing to commit, working tree clean

# 6. Recent commits visible
git log --oneline -3
# Expected output:
#   XXXXXX refactor(orchestrator): improve reliability...
#   XXXXXX fix(orchestrator): critical timeout...
#   XXXXXX docs: architect security review...
```

---

## Optional: Test Timeout Behavior Locally

```bash
# Step 1: Create a slow-responding mock gateway
node -e "
const http = require('http');
const server = http.createServer((req, res) => {
  setTimeout(() => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      planner: { reasoning: 'test', actions: [] },
      llm: { model_used: 'test', tokens_input: 0, tokens_output: 0, cost_usd: 0, latency_ms: 35000, cache_hit: false },
      request_id: 'test-123'
    }));
  }, 35000); // 35 seconds (>30s timeout)
});
server.listen(9999);
console.log('Mock gateway on :9999, 35s response time');
"

# Step 2: In another terminal, test timeout
cd /Users/dragon/cboteros/proyectos/intcloudsysops
ORCHESTRATOR_LLM_GATEWAY_URL=http://localhost:9999 npm run test -- __tests__/llm-gateway-client.test.ts
# Expected: Test fails with "request timeout after 30000ms" ✅

# Step 3: Kill mock gateway
# (Ctrl+C in the first terminal)
```

---

## Time Estimate

| Phase | Task                        | Time   | Cumulative |
| ----- | --------------------------- | ------ | ---------- |
| 1     | Fix timeout + validation    | 10 min | 10 min     |
| 2     | Add default case            | 2 min  | 12 min     |
| 3     | Test + commit critical      | 5 min  | 17 min     |
| 4     | Fix engine.ts Map + Promise | 15 min | 32 min     |
| 5     | Add healthchecks            | 10 min | 42 min     |
| 6     | Update logging              | 15 min | 57 min     |
| 7     | Final tests + commit        | 5 min  | 62 min     |

**Total:** ~1 hour (leaves 30 min buffer for debugging)

---

## If You Get Stuck

**Issue:** TypeScript error after changes  
**Solution:** `npm run type-check -- --workspace=@intcloudsysops/orchestrator` to see exact error

**Issue:** Test failures  
**Solution:** `npm run test -- --workspace=@intcloudsysops/orchestrator --reporter=verbose`

**Issue:** YAML syntax error in docker-compose  
**Solution:** `docker-compose -f infra/docker-compose.platform.yml config` shows exact error line

**Issue:** Git merge conflict  
**Solution:** `git status` shows which files conflict; manually edit and `git add`

---

## Success Criteria

✅ All 3 critical issues fixed  
✅ All 4 important issues fixed  
✅ Type-check: 11/11 passing  
✅ Tests: 155/155 passing  
✅ ESLint: 0 warnings  
✅ 2 commits pushed to main  
✅ Code review complete

**Estimated Readiness:** Ready for staging deployment after these fixes + manual integration testing

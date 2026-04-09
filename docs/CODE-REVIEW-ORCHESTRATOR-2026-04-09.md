# 🔍 Code Review: Cursor Orchestrator Work - 2026-04-09

**Reviewer:** Staff Engineer & QA  
**Status:** FINDINGS + FIXES PROVIDED  
**Overall Quality:** 🟢 **GOOD** (TypeScript strict, but 3 critical issues)

---

## Executive Summary

| Aspect | Status | Impact |
|--------|--------|--------|
| **TypeScript** | ✅ All 11 packages pass type-check | High |
| **Security** | 🟡 No exposed secrets, but needs validation | Medium |
| **Reliability** | 🚨 3 critical issues: timeout, error handling, race condition | High |
| **Logging** | 🟡 Structured format OK, but should use logger module | Low |
| **Production Ready** | ❌ Fix critical issues first (2-3 hours work) | Blocker |

---

## 🚨 Critical Issues (Fix Tonight)

### Issue #1: NO TIMEOUT ON FETCH (CRITICAL)
**File:** `apps/orchestrator/src/llm-gateway-client.ts:42`  
**Severity:** CRITICAL  
**Risk:** If LLM gateway hangs, orchestrator job hangs forever → BullMQ queue stalls

```typescript
// ❌ BEFORE (no timeout):
const res = await fetch(url, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify(...),
});

// ✅ AFTER (with timeout):
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30_000);
try {
  const res = await fetch(url, {
    method: "POST",
    headers: { ... },
    body: JSON.stringify(...),
    signal: controller.signal,  // ← Add this
  });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

**Fix Time:** 5 minutes  
**Test:** Run `npm run test --workspace=@intcloudsysops/orchestrator`  

---

### Issue #2: JSON.PARSE WITHOUT TRY-CATCH (CRITICAL)
**File:** `apps/orchestrator/src/llm-gateway-client.ts:63`  
**Severity:** CRITICAL  
**Risk:** Malformed JSON from gateway crashes worker → job fails without retry

```typescript
// ❌ BEFORE (unsafe):
const parsed = JSON.parse(text) as PlannerGatewayResponseBody;

// ✅ AFTER (safe with Zod):
let parsed: unknown;
try {
  parsed = JSON.parse(text);
} catch (err) {
  throw new Error(`llm-gateway planner: failed to parse JSON: ${String(err)}`);
}

// Then validate with Zod:
const validation = PlannerGatewayResponseSchema.safeParse(parsed);
if (!validation.success) {
  throw new Error(`llm-gateway planner: invalid schema: ${validation.error.message}`);
}
```

**Why Zod?**
- Replaces incomplete manual checks (only checked `planner.reasoning`)
- Validates entire response structure (planner, llm, actions array)
- Type-safe: `validation.data` is guaranteed correct type

**Fix Time:** 10 minutes (add Zod schema)  
**Test:** `npm run test llm-gateway-client.test.ts`  

---

### Issue #3: DEFAULT CASE MISSING IN SWITCH (CRITICAL)
**File:** `apps/orchestrator/src/planner-map.ts:51-90`  
**Severity:** CRITICAL  
**Risk:** Unknown tool silently returns `undefined` → job type is invalid

```typescript
// ❌ BEFORE (missing default):
switch (tool) {
  case "execute_prompt":
    return { type: "cursor", ... };
  case "send_invitation":
    return { type: "n8n", ... };
  // ❌ If tool = "unknown_tool", returns undefined!
}

// ✅ AFTER (add default):
switch (tool) {
  case "execute_prompt":
    return { type: "cursor", ... };
  case "send_invitation":
    return { type: "n8n", ... };
  // ... other cases ...
  default: {
    throw new Error(
      `plannerActionToOrchestratorJob: unknown tool "${tool}" ` +
      `available: ${DEFAULT_PLANNER_TOOL_NAMES.join(", ")}`
    );
  }
}
```

**Fix Time:** 2 minutes  
**Test:** Add unit test for invalid tool name  

---

## 🟡 Important Issues (This Week)

### Issue #4: ARRAY INDEX RACE CONDITION (IMPORTANT)
**File:** `apps/orchestrator/src/engine.ts:103-124`  
**Severity:** IMPORTANT  
**Risk:** If `enqueueJob()` results reorder, `jobs[index]` mismatch → wrong metadata stored

```typescript
// ❌ BEFORE (index-based correlation):
const enqueued = await Promise.all(jobs.map((job) => enqueueJob(job)));
await Promise.all(
  enqueued.map(async (job, index) => {
    const queuedJob = jobs[index];  // ⚠️ Index mismatch if order changes!
    await setJobState(...);
  })
);

// ✅ AFTER (Map-based correlation):
const enqueuedMap = new Map<string, OrchestratorJob>();
for (const job of jobs) {
  const enqueuedJob = await enqueueJob(job);
  enqueuedMap.set(String(enqueuedJob.id), job);  // Use BullMQ job ID as key
}

await Promise.allSettled(
  Array.from(enqueuedMap.entries()).map(async ([bullmqJobId, queuedJob]) => {
    await setJobState(bullmqJobId, {
      id: bullmqJobId,
      type: queuedJob.type,
      // ... other fields
    });
  })
);
```

**Why Promise.allSettled?**
- If 1 state update fails, don't crash entire batch
- Log failed entries separately

**Fix Time:** 15 minutes  

---

### Issue #5: PROMISE.ALL WITHOUT ALLSETTLED (IMPORTANT)
**File:** `apps/orchestrator/src/engine.ts:103`  
**Severity:** IMPORTANT  
**Risk:** 1 failed enqueue → entire job batch fails → BullMQ inconsistent state

```typescript
// ❌ BEFORE:
const enqueued = await Promise.all(jobs.map((job) => enqueueJob(job)));
// If ANY job fails to enqueue, entire Promise.all fails

// ✅ AFTER:
const enqueuedMap = new Map<string, OrchestratorJob>();
for (const job of jobs) {
  try {
    const enqueuedJob = await enqueueJob(job);
    enqueuedMap.set(String(enqueuedJob.id), job);
  } catch (err) {
    console.error(`[orchestrator] Failed to enqueue job ${job.type}:`, err);
    // Continue with next job instead of failing entire batch
  }
}
```

**Fix Time:** 5 minutes  

---

### Issue #6: MISSING HEALTHCHECKS IN DOCKER (IMPORTANT)
**File:** `infra/docker-compose.platform.yml:69+`  
**Severity:** IMPORTANT  
**Risk:** Docker can't detect app failure → orchestrator jobs silently fail

```yaml
# ❌ BEFORE (app service):
app:
  image: ${APP_IMAGE:-...}
  # ❌ No healthcheck defined

# ✅ AFTER (add healthcheck):
app:
  image: ${APP_IMAGE:-...}
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s

# Also add to: admin, portal, mcp services
```

**API Endpoint Required:** `GET /api/health` must return 200 OK  
**Current Status:** ✅ Exists at `apps/api/app/api/health/route.ts`  

**Fix Time:** 10 minutes  

---

### Issue #7: INCOMPLETE VALIDATION SCHEMA (IMPORTANT)
**File:** `apps/orchestrator/src/llm-gateway-client.ts:64-66`  
**Severity:** IMPORTANT  
**Risk:** Missing fields silently pass → downstream code crashes

```typescript
// ❌ BEFORE (partial check):
if (!parsed.planner || typeof parsed.planner.reasoning !== "string") {
  throw new Error("llm-gateway planner: invalid response body");
}
// ❌ Doesn't validate:
// - planner.actions array (could be null/undefined)
// - llm object fields (tokens_input, etc.)
// - request_id field

// ✅ AFTER (full Zod schema):
const PlannerGatewayResponseSchema = z.object({
  planner: z.object({
    reasoning: z.string(),
    actions: z.array(z.object({
      tool: z.string(),
      params: z.record(z.unknown()),
    })),
  }),
  llm: z.object({
    model_used: z.string(),
    tokens_input: z.number().int().nonnegative(),
    tokens_output: z.number().int().nonnegative(),
    cost_usd: z.number().nonnegative(),
    latency_ms: z.number().nonnegative(),
    cache_hit: z.boolean(),
  }),
  request_id: z.string(),
});

const validation = PlannerGatewayResponseSchema.safeParse(parsed);
if (!validation.success) {
  throw new Error(`Invalid response: ${validation.error.message}`);
}
return validation.data;
```

**Fix Time:** 10 minutes  

---

## 🟢 Code Quality Observations (GOOD)

### ✅ TypeScript Strict
- No `any` types found
- All 11 packages pass type-check
- Interfaces properly defined (PlannerGatewayRequest, PlannerGatewayResponseBody)

### ✅ Structured Logging Format
- Uses consistent format: `"[component] message"`
- Compatible with `observability/worker-log.ts` pattern
- Suggestion: Replace `console.log` with logger module for consistency

### ✅ Error Messages
- Descriptive error messages ("Unknown tool: X")
- Includes context (tenant_slug, request_id in headers)
- HTTP status included in error responses

### ✅ Code Organization
- Clear separation: client → gateway, engine → jobs
- Planner map is well-structured for tool→job mapping
- Good use of interfaces for type safety

---

## 📋 Detailed Recommendations

### Logging Consolidation
Replace 8x `console.log` with structured logger:

```typescript
import { observabilityLog } from "./observability/worker-log.ts";

// ❌ Instead of:
console.log(`[orchestrator] Evento: ${event}`, eventData);

// ✅ Use:
observabilityLog({
  event: "orchestrator_event_received",
  event_type: event,
  data: eventData,
  request_id: eventData.request_id,
  tenant_slug: eventData.tenant_slug,
});
```

**Files Affected:**
- `apps/orchestrator/src/index.ts` (8 log statements)
- `apps/orchestrator/src/teams/TeamManager.ts` (1 log statement)

**Impact:** Better visibility in centralized logging, searchable by field

---

### Job Type Naming
Current mapping mixes concerns:

```typescript
case "get_health":
case "check_service_health":
  return { type: "notify", ... };  // ⚠️ Read-only ops as "notify"?
```

**Recommendation:** Create separate job types:
- `type: "read_only"` — Health checks, metrics queries (no side effects)
- `type: "notify"` — Notifications, alerts
- `type: "admin"` — Restart, suspend, dangerous operations

---

## 🧪 Testing Checklist

Before shipping Critical fixes:

```bash
# 1. Unit tests pass
npm run test --workspace=@intcloudsysops/orchestrator

# 2. Type-check passes
npm run type-check

# 3. Docker compose validates
docker-compose --file infra/docker-compose.platform.yml config

# 4. Integration test: Send intent to orchestrator
# See: apps/orchestrator/__tests__/remote-planner-engine.test.ts

# 5. Manual test: Call /v1/planner with timeout
curl --max-time 35 http://localhost:3010/v1/planner -X POST \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug":"test","context":{},"available_tools":["execute_prompt"]}'
```

---

## 📈 Implementation Order

### Tonight (Critical - 30 min total)
1. **llm-gateway-client.ts:** Add timeout + try-catch + Zod (10 min)
2. **planner-map.ts:** Add default case (2 min)
3. **Tests pass:** Run full suite (5 min)
4. **Commit:** `fix(orchestrator): critical timeout, validation, default case`

### Tomorrow (Important - 1 hour total)
5. **engine.ts:** Replace array index with Map + Promise.allSettled (15 min)
6. **docker-compose.platform.yml:** Add healthchecks (10 min)
7. **Logging:** Replace console.log with logger module (15 min)
8. **Tests + type-check:** Verify (10 min)
9. **Commit:** `refactor(orchestrator): improve reliability and logging`

---

## Final Assessment

| Category | Rating | Reason |
|----------|--------|--------|
| **Code Style** | 🟢 A | Consistent, readable, good naming |
| **Type Safety** | 🟢 A | Strict TypeScript, no `any` |
| **Error Handling** | 🟡 C | Missing timeout, incomplete validation |
| **Resilience** | 🟡 C | Race condition risk, no circuit breaker |
| **Testing** | 🟢 A | 155 tests pass, good coverage |
| **Logging** | 🟡 B | Format OK, should use logger module |
| **Security** | 🟢 B+ | No secrets exposed, but needs validation |
| **Documentation** | 🟡 B | Code is clear, but comments could explain WHY |

**Overall:** 🟢 **GOOD** (Fundamentals solid, needs reliability hardening)

---

## Sign-Off

**Reviewed by:** Copilot (Staff Engineer & QA)  
**Date:** 2026-04-09 22:51 UTC  
**Status:** Ready for fixes (critical + important) before staging deployment

**Next Step:** Apply fixes → test → commit → continue Cursor work

---

## Appendix: Code Samples

### Sample 1: llm-gateway-client.ts (FIXED)
See `/tmp/llm-gateway-client-FIXED.ts` for complete fixed version.

### Sample 2: engine.ts (Fixed Lines 103-136)
See `/tmp/engine-FIXES.ts` for Map-based correlation pattern.

### Sample 3: planner-map.ts (Add Default Case)
```typescript
default: {
  throw new Error(
    `plannerActionToOrchestratorJob: unknown tool "${tool}" ` +
    `available: ${DEFAULT_PLANNER_TOOL_NAMES.join(", ")}`
  );
}
```

---

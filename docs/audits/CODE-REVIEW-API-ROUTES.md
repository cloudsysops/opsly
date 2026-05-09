---
status: audit-complete
date: 2026-05-08T13:00:00Z
severity: mixed (3 critical, 16 important, 31 nice-to-have)
---

# Code Review: API Routes Audit

**Scope:** 93 route files in `apps/api/app/api/*`  
**Sample analyzed:** First 50 routes (prioritized by criticality)  
**Audit date:** 2026-05-08  

---

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total routes | 93 | Scanned |
| Routes analyzed (sample) | 50 | ✅ |
| Error handling coverage | 40/50 (80%) | 🟡 GOOD |
| Validation coverage | 2/50 (4%) | 🔴 CRITICAL |
| Auth check coverage | 34/50 (68%) | 🟡 ACCEPTABLE |
| Status code consistency | 41/50 (82%) | 🟡 GOOD |

**Key Issue:** **Validation layer is almost entirely absent** (only 2/50 routes have input validation)

---

## 🔴 CRITICAL FINDINGS (3 issues)

### 1. Missing Input Validation (48/50 routes)

**Problem:**
```
✗ Routes accept POST/PUT/PATCH without schema validation
✗ No zod/.parse() calls on 96% of routes
✗ Direct req.body usage without guards
```

**Impact:** HIGH
- Injection vulnerabilities (XSS, SQL injection potential)
- Invalid data reaching database
- Type safety compromised

**Example:** `admin/costs` (POST endpoint)
```typescript
// ❌ BEFORE (current)
export async function POST(req: Request) {
  const body = await req.json();
  // No validation on body shape/types
  return Response.json({ cost: body.amount });
}

// ✅ AFTER (recommendation)
import { z } from "zod";
const costSchema = z.object({
  amount: z.number().positive(),
  period: z.enum(["daily", "monthly", "yearly"]),
});

export async function POST(req: Request) {
  const body = await req.json();
  const validated = costSchema.parse(body); // Will throw if invalid
  return Response.json({ cost: validated.amount });
}
```

**Affected routes (top 10 of 48):**
1. `admin/billing/llm-costs`
2. `admin/costs`
3. `admin/docker/containers`
4. `admin/local-services/[slug]/bookings/[bookingId]/complete`
5. `admin/mission-control/orchestrator`
6. `billing/stripe-webhook`
7. `checkout/session`
8. `defense/audits/[id]`
9. `defense/audits`
10. `defense/pricing`
... and 38 more

**Fix timeline:** 2-3 hours (batch implementation per workspace)

**Owner:** @eng (validation pattern standardization)

---

### 2. Missing Error Handling (10/50 routes)

**Problem:**
```
✗ No try/catch blocks
✗ No error response objects
✗ Unhandled async rejections
```

**Impact:** MEDIUM
- 500 errors instead of meaningful responses
- Client receives raw error messages
- Stack traces exposed in responses

**Affected routes:**
1. `defense/pricing`
2. `docs`
3. `feedback/approve`
4. `feedback`
5. `health/lightweight`
6. `infra/docker/compose`
7. `infra/docker/logs`
8. `infra/redis/keys`
9. `metrics`
10. `tenants`

**Example fix:**
```typescript
// ❌ BEFORE
export async function GET() {
  const data = await db.query(...); // Could throw!
  return Response.json(data);
}

// ✅ AFTER
export async function GET() {
  try {
    const data = await db.query(...);
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Fix timeline:** 1 hour (add try/catch to identified routes)

---

### 3. Missing Status Codes (9 routes)

**Problem:**
```
✗ Always returns 200 (even on errors)
✗ No distinction between success/failure
✗ HTTP semantics ignored
```

**Affected routes:**
1. `admin/docker/containers`
2. `admin/local-services/technician-seed`
3. `admin/mission-control/orchestrator`
4. `defense/audits/[id]`
5. `defense/audits`
6. `infra/docker/compose`
7. `infra/docker/logs`
8. `infra/redis/keys`
9. `metrics`

**Example:**
```typescript
// ❌ BEFORE
return Response.json(result); // Always 200

// ✅ AFTER
return Response.json(result, { status: 201 }); // Created
// or
return Response.json(
  { error: "Not found" },
  { status: 404 }
);
```

---

## 🟡 IMPORTANT FINDINGS (16 issues)

### 4. Missing Auth Checks (16/50 routes)

**Routes that should require authentication but don't:**

1. `admin/local-services/[slug]/bookings/[bookingId]/complete` — Should require TECHNICIAN auth
2. `admin/mission-control/orchestrator` — Should require ADMIN auth
3. `admin/mission-control/teams` — Should require ADMIN auth
4. `billing/stripe-webhook` — Should verify Stripe signature (has special handling)
5. `checkout/session` — Should require USER auth or public key validation
6. `defense/audits/[id]` — Should require auth
7. `defense/audits` — Should require auth
... and 9 more

**Pattern found:**
```typescript
// ✗ Missing auth check
export async function POST(req: Request) {
  // Directly processes request
}

// ✓ Correct pattern (from other routes)
export async function POST(req: Request) {
  const auth = await getUserFromAuthorizationHeader(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Now safe to process
}
```

**Fix timeline:** 1.5 hours (add auth checks, verify Stripe webhook signature)

---

### 5. Inconsistent Response Format (12 routes)

**Problem:** Routes return different JSON shapes
```
✗ Some return { data: ... }
✗ Some return { result: ... }
✗ Some return raw data
✓ Standard should be: { success: boolean, data: T, error?: string }
```

**Impact:** Client confusion, harder to parse

**Fix timeline:** 1 hour (standardize response envelope)

---

## 🟢 NICE-TO-HAVE (31 issues)

### 6. Request Logging (missing on 20 routes)

Not critical but useful for debugging.

### 7. Rate Limiting (missing on public endpoints)

Endpoints like `/api/feedback`, `/api/checkout/session` could benefit from rate limiting.

### 8. Documentation (missing JSDoc on 35 routes)

No function documentation.

---

## Remediation Roadmap

### Phase 1: CRITICAL (3 hours)
- [ ] Add input validation (zod) to top 20 routes (billing, admin, checkout)
- [ ] Add error handling to 10 routes without try/catch
- [ ] Add proper HTTP status codes

**Routes to prioritize:**
1. `billing/stripe-webhook` (security-sensitive)
2. `checkout/session` (payment-related)
3. `admin/billing/llm-costs` (cost calculation)
4. `admin/costs` (cost query)
5. `admin/mission-control/orchestrator` (system control)

### Phase 2: IMPORTANT (2 hours)
- [ ] Add auth checks to 16 routes (verify each route's requirements)
- [ ] Standardize response format across all routes
- [ ] Add error response envelope

### Phase 3: NICE-TO-HAVE (3 hours)
- [ ] Add JSDoc comments
- [ ] Add request logging
- [ ] Add rate limiting to public endpoints

---

## Implementation Notes

### Validation Pattern (Recommended)

```typescript
import { z } from "zod";

const costUpdateSchema = z.object({
  amount: z.number().min(0),
  period: z.enum(["daily", "monthly", "yearly"]),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await getUserFromAuthorizationHeader(req);
    if (!auth) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = costUpdateSchema.parse(body);

    // Safe to process
    const result = await updateCost(validated);

    return Response.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /admin/costs:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Auth Pattern (Recommended)

```typescript
// For protected endpoints
export async function POST(req: Request) {
  const auth = await getUserFromAuthorizationHeader(req);
  if (!auth || auth.role !== "ADMIN") {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  // Proceed with request
}

// For webhook endpoints (special case)
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const verified = verifyStripeSignature(await req.text(), signature);
  if (!verified) {
    return Response.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }
  // Proceed with request
}
```

---

## Files to Modify (Batch 1: Critical)

1. `apps/api/app/api/billing/stripe-webhook/route.ts` (add signature verification)
2. `apps/api/app/api/checkout/session/route.ts` (add validation + auth)
3. `apps/api/app/api/admin/costs/route.ts` (add validation + auth)
4. `apps/api/app/api/admin/billing/llm-costs/route.ts` (add validation + auth)
5. `apps/api/app/api/admin/mission-control/orchestrator/route.ts` (add auth)

---

## Questions for @eng

1. **Validation library preference:** Use zod (already in package.json) or alternative?
2. **Auth requirement clarity:** Which routes are intentionally public vs. should be protected?
3. **Response format standard:** Adopt { success, data, error } envelope across all routes?
4. **Error logging:** Send to Sentry, console, or structured logging system?

---

## Next Steps

1. **Generate GitHub issue** from this audit (link to top 10 critical routes)
2. **Create PR template** with validation pattern
3. **Implement in batches** (critical first, then important)
4. **Add linting rule** to enforce validation on POST/PUT/PATCH

---

**Status:** ✅ Audit complete. Ready for implementation.  
**Owner:** @eng (validation pattern standardization)  
**Priority:** HIGH (4-8 hours total implementation)

---
status: audit-complete
date: 2026-05-08T13:50:00Z
methodology: "Code pattern scanning + security review"
---

# Security Hardening: Input Validation Audit

**Scope:** API routes accepting POST/PUT/PATCH requests  
**Methodology:** Pattern detection for validation frameworks (zod, joi, etc.)  
**Finding:** Critical gap in input validation coverage  

---

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| Routes with POST/PUT/PATCH | 43 | Total |
| Routes with validation | 2 | Only 4.7% ⚠️ |
| Routes without validation | 41 | 95.3% 🔴 CRITICAL |
| Validation frameworks in use | zod | (minimal usage) |

**Risk Level:** 🔴 **CRITICAL**

---

## The Gap

### What We Found

```
43 routes accept form data / JSON bodies
  ├─ 2 routes with .parse() validation
  ├─ 0 routes with safeParse() validation
  └─ 41 routes WITH ZERO INPUT VALIDATION
```

### Why This Matters

**Security Risks:**
- XSS (Cross-Site Scripting) if user input not sanitized
- SQL injection (if dynamic queries without parameterization)
- Type confusion (e.g., expecting number, get string)
- DoS (Denial of Service) from malformed input
- Data corruption from invalid values

**Reliability Risks:**
- Crashes from unexpected input types
- Silent failures on missing fields
- Database constraint violations
- Unpredictable behavior

---

## 🔴 CRITICAL: Routes Without Validation

### Category 1: Financial Routes (Payment Sensitive)

These handle money and MUST validate:

1. **POST /api/checkout/session** — Payment session creation
   - Should validate: amount, currency, customer_email, payment_method
   - Currently: OPEN

2. **POST /api/billing/stripe-webhook** — Stripe webhook handler
   - Should validate: Stripe signature, event type, event data
   - Currently: OPEN

3. **PUT /api/admin/billing/llm-costs** — Cost configuration
   - Should validate: pricing_model, cost_per_token, effective_date
   - Currently: OPEN

### Category 2: Admin Routes (Privilege Escalation Risk)

These require auth + input validation:

4. **POST /api/admin/costs** — Cost reporting
   - Should validate: date_range, metrics, aggregation_type
   - Currently: OPEN

5. **POST /api/admin/mission-control/orchestrator** — System control
   - Should validate: command, parameters, safety_checks
   - Currently: OPEN

6. **POST /api/admin/users** — User management
   - Should validate: email, role, tenant_id
   - Currently: OPEN

### Category 3: Public Routes (DoS Risk)

These should rate-limit + validate:

7. **POST /api/feedback** — User feedback
   - Should validate: message length, email format
   - Currently: OPEN

8. **POST /api/defense/audits** — Audit log creation
   - Should validate: action, resource_id, metadata
   - Currently: OPEN

... and 33 more routes

---

## Validation Pattern Recommendation

### Before (Current — Vulnerable)

```typescript
// ❌ NO VALIDATION
export async function POST(req: Request) {
  const body = await req.json();
  
  // Could be:
  // - undefined
  // - wrong type (string instead of number)
  // - malicious content
  
  const result = await db.insert({
    amount: body.amount,           // Might not be a number!
    customer_email: body.email,    // No format check!
    currency: body.currency,       // Could be invalid!
  });
  
  return Response.json(result);
}
```

### After (Recommended — Secure)

```typescript
// ✅ WITH VALIDATION
import { z } from 'zod';

const CheckoutSchema = z.object({
  amount: z.number().positive('Amount must be > 0'),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  customer_email: z.string().email('Invalid email'),
  payment_method: z.enum(['card', 'bank']),
  
  // Optional fields
  description: z.string().max(500).optional(),
  metadata: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // This will throw if invalid
    const validated = CheckoutSchema.parse(body);
    
    // Now we're safe
    const result = await db.insert({
      amount: validated.amount,           // Guaranteed number > 0
      customer_email: validated.customer_email,  // Guaranteed valid email
      currency: validated.currency,       // Guaranteed enum value
      description: validated.description,
      metadata: validated.metadata,
    });
    
    return Response.json(result, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Validation Schemas (Ready to Implement)

### Payment Routes

```typescript
export const PaymentSessionSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD']),
  customer_email: z.string().email(),
  customer_name: z.string().min(2).max(255),
  payment_method: z.enum(['card', 'bank', 'paypal']),
  metadata: z.record(z.string()).optional(),
  return_url: z.string().url().optional(),
});

export const StripWebhookSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.record(z.any()),
  created: z.number(),
  livemode: z.boolean(),
});
```

### Admin Routes

```typescript
export const CostReportSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  group_by: z.enum(['tenant', 'operation', 'date']).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const UserCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'operator', 'viewer']),
  tenant_id: z.string().uuid().optional(),
});
```

### Public Routes

```typescript
export const FeedbackSchema = z.object({
  message: z.string().min(10).max(5000),
  email: z.string().email().optional(),
  subject: z.string().max(200).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const AuditLogSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'read']),
  resource: z.string().max(100),
  resource_id: z.string().uuid(),
  changes: z.record(z.any()).optional(),
  metadata: z.record(z.string()).optional(),
});
```

---

## Remediation Roadmap

### Phase 1: CRITICAL (3 hours)
- [ ] Add validation to 5 financial routes (payment, billing, checkout)
- [ ] Add validation to 6 admin routes (users, costs, missions)
- [ ] Add error handling + HTTP 400 responses
- [ ] Test: Send invalid data, verify rejection

**Validation frameworks to use:**
- Primary: `zod` (already in package.json)
- Alternative: `joi` or `yup` (if team preference)

### Phase 2: IMPORTANT (2 hours)
- [ ] Add validation to 15 public/internal routes
- [ ] Create centralized schema file (schemas.ts per app)
- [ ] Add JSDoc for each schema

### Phase 3: MONITORING (1 hour)
- [ ] Log validation failures
- [ ] Create Sentry alerts for validation errors
- [ ] Add metrics: validation failure rate

---

## Implementation Checklist

### For Each Route

```typescript
// 1. Define schema
const ParameterSchema = z.object({ ... });

// 2. Create helper (optional but recommended)
async function validateRequest(req: Request, schema: ZodSchema) {
  const body = await req.json();
  return schema.parse(body);
}

// 3. Use in handler
export async function POST(req: Request) {
  try {
    const validated = await validateRequest(req, ParameterSchema);
    // Process...
  } catch (error) {
    // Handle error
  }
}
```

### Shared Validation Utility

Create `apps/api/lib/validation.ts`:

```typescript
import { ZodError, ZodSchema } from 'zod';

export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

export function validationErrorResponse(error: ZodError) {
  return Response.json(
    {
      error: 'Validation failed',
      issues: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    },
    { status: 400 }
  );
}
```

---

## Priority Routes (Start Here)

### Immediate (Today)
1. `POST /api/checkout/session` — Payment ↑ CRITICAL
2. `POST /api/billing/stripe-webhook` — Webhook ↑ CRITICAL
3. `PUT /api/admin/costs` — Cost config ↑ CRITICAL

### This Week
4. `POST /api/admin/users` — User creation
5. `POST /api/admin/mission-control/orchestrator` — System control
6. `POST /api/defense/audits` — Audit log

### This Sprint
7-41. All remaining routes with POST/PUT/PATCH

---

## Testing Validation

### Example Test Cases

```typescript
describe('POST /api/checkout/session validation', () => {
  it('rejects missing required fields', async () => {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      body: JSON.stringify({ currency: 'USD' }), // Missing amount
    });
    expect(response.status).toBe(400);
  });
  
  it('rejects invalid currency', async () => {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        currency: 'XYZ', // Invalid!
        email: 'test@example.com',
      }),
    });
    expect(response.status).toBe(400);
  });
  
  it('rejects negative amounts', async () => {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      body: JSON.stringify({
        amount: -100, // Invalid!
        currency: 'USD',
        email: 'test@example.com',
      }),
    });
    expect(response.status).toBe(400);
  });
  
  it('accepts valid input', async () => {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
        currency: 'USD',
        customer_email: 'test@example.com',
        payment_method: 'card',
      }),
    });
    expect(response.status).toBe(201);
  });
});
```

---

## Next Steps

1. **Generate GitHub issue:** "Security: Add input validation to 41 routes (critical)"
2. **Create validation schemas file:** `apps/api/lib/schemas.ts`
3. **Create PR template:** Shows validation pattern
4. **Implement in batches:**
   - Batch 1: 5 financial routes (today)
   - Batch 2: 6 admin routes (this week)
   - Batch 3: 15 public routes (next sprint)

---

**Status:** ✅ Audit complete. Schemas ready. Remediation planned.  
**Owner:** @eng (security + validation)  
**Priority:** CRITICAL (95% of routes lack validation)  
**Effort:** 5-7 hours total implementation  
**Impact:** Prevent XSS, SQL injection, type errors, DoS attacks  
**Risk if not fixed:** Security vulnerability, data corruption, crashes

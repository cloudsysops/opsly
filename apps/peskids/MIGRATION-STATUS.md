# ⚠️ Database Migration Status — CRITICAL BLOCKER

**Status:** Migrations created but NOT applied to database
**Impact:** 30+ TypeScript errors in type-check
**Blocking:** Production deployment, CI/CD

## Problem

Multiple migrations created but NOT applied:

### Confirmed Migration Files
- `migrations/20260725_create_student_points.sql` ✓ (exists)
- `migrations/20260725_create_store_system.sql` ✓ (exists)
- `migrations/006_referrals_discount.sql` ✓ (exists)
- `migrations/20260725_extend_payments_with_referral.sql` ✓ (exists)

### Missing or Not Applied
- Form system tables (form_templates, form_deliveries, form_responses)
- Franchise-scoped form tables

### Root Cause
1. ❌ Migrations have NOT been applied to Supabase database
2. ❌ TypeScript codegen has NOT been run → `Database` type missing tables
3. ❌ Services reference tables that TypeScript doesn't know about

## Affected Services & Missing Tables

| Service | Missing Tables | Errors |
|---------|---|---|
| `points.service.ts` | `student_points`, `point_transactions` | 6 |
| `store.service.ts` | `store_products`, `store_orders`, `store_order_items`, `store_cart_items` | 7 |
| `store-checkout.service.ts` | `referral_links` | 3 |
| `form.service.ts` | `form_templates`, `form_deliveries`, `form_responses` | 9 |
| `franchise-forms.service.ts` | franchise-scoped form tables + missing columns | 10 |
| **TOTAL** | — | **35+ errors** |

## Fix (for next agent with Doppler access)

### Step 1: Apply migrations
```bash
# Using Supabase CLI
supabase migration list --project-id jkwykpldnitavhmtuzmo
supabase db push --project-id jkwykpldnitavhmtuzmo

# Or using Doppler
doppler run --project ops-intcloudsysops --config prd -- \
  supabase db push --project-id jkwykpldnitavhmtuzmo
```

### Step 2: Regenerate TypeScript types
```bash
# Generate fresh types from database schema
supabase gen types typescript --project-id jkwykpldnitavhmtuzmo \
  > apps/peskids/lib/types/database.gen.ts

# Or via Doppler
doppler run --project ops-intcloudsysops --config prd -- \
  supabase gen types typescript --project-id jkwykpldnitavhmtuzmo \
  > apps/peskids/lib/types/database.gen.ts
```

### Step 3: Verify
```bash
npm run type-check  # Should report 0 errors in peskids
```

## Why This Happened

1. Code services were written before migrations were applied (chicken-and-egg problem)
2. Migrations created but deployment/application step missed
3. TypeScript codegen not run to update Database type definitions

## Prevention

- Always run migrations immediately after creation
- Always run codegen after migrations are applied
- Add pre-commit hook to verify `npm run type-check` passes

## Temporary Workaround (NOT recommended for production)

If migrations can't be applied yet, suppress errors with:
```typescript
// @ts-ignore: Tables pending migration application
type StudentPoints = Database['peskids']['Tables']['student_points']['Row'];
```

**This is only for unblocking CI/development.** Must be resolved before production.

---

**Owner:** Next agent with Supabase Doppler access  
**Timeline:** Before deployment  
**Severity:** CRITICAL

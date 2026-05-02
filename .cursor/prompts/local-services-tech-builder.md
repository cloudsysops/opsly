# CURSOR PROMPT: Local Services Tech Builder

## Context
Build the complete Opsly Local Services platform: booking, CRM, quotes, invoices, dashboards. This is the MVP that enables Sales Agent, Ops Agent, and Automation workflows.

**Why it matters:** Opsly Local Services is a new $5k→$10k/mo product tier for scaling local tech service businesses with 4 AI agents.

## Scope

**YOU own (Tech Builder via Cursor):**
- Database migrations (services, customers, bookings, quotes, reports)
- API routes in `/api/local-services/*`
- Public booking page (`/apps/local-services/app/book`)
- Customer dashboard (`/apps/local-services/app/dashboard`)
- Admin dashboard (extend `/apps/admin/app/local-services`)

**Assigned elsewhere (reference these prompts):**
- Sales Agent emails + WhatsApp → see `.cursor/prompts/local-services-sales-closer.md`
- Quote generation → see `.cursor/prompts/local-services-ops-admin.md`
- n8n automation → see `.cursor/prompts/local-services-automation.md`
- Week 1-4 roadmap → see `.cursor/prompts/local-services-mvp.md`

## Tech Stack (Use ONLY these)

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | Next.js 15 App Router | Opsly standard, SSR benefits |
| **Backend** | Next.js API routes | Zero new infra, reuses existing |
| **Database** | Supabase PostgreSQL | Multi-tenant, RLS, existing |
| **Auth** | Supabase Auth | Magic links, built-in |
| **ORM** | Direct `supabase-js` client | No Prisma, keep it lean |
| **Styling** | Tailwind CSS | Consistent with Opsly UI |
| **Validation** | Zod | Type-safe runtime checks |
| **State** | React hooks + Context | Simple, no Redux |
| **Testing** | Vitest | Same as rest of Opsly |

**FORBIDDEN:**
- No Pages Router (use App Router only)
- No Prisma (query Supabase directly with full RLS tenant context)
- No MongoDB, Firebase, or external DB
- No Bootstrap, Material UI, or custom CSS (Tailwind only)

## Key Existing Patterns to Reuse

### 1. Tenant Isolation
**File:** `/apps/api/lib/tenant-context.ts`

Every API route must use:
```typescript
import { getTenantId } from '@/lib/tenant-context';

export async function GET(req: Request) {
  const tenantId = getTenantId(); // from AsyncLocalStorage
  const { data } = await supabase
    .from('local_services.services')
    .select('*')
    .eq('tenant_id', tenantId);
  return Response.json(data);
}
```

### 2. API Structure
**Folder:** `/apps/api/app/api/billing/` (use as template)

New routes follow same pattern:
```
apps/api/app/api/local-services/
├── services/
│   └── route.ts        (GET/POST services)
├── customers/
│   └── route.ts        (GET/POST customers)
├── bookings/
│   ├── route.ts        (GET/POST bookings)
│   └── [id]/
│       └── route.ts    (PATCH booking status)
├── quotes/
│   ├── route.ts        (POST generate quote)
│   └── [id]/
│       └── route.ts    (GET quote details)
└── reports/
    └── route.ts        (GET service reports)
```

### 3. Database Repository Pattern
**File:** `/apps/api/lib/base-repository.ts`

Create `LocalServicesRepository` that extends BaseRepository:
```typescript
export class LocalServicesRepository extends BaseRepository {
  async getServices() {
    return this.query('local_services.services', {});
  }
  
  async createBooking(data: BookingInput) {
    return this.insert('local_services.bookings', data);
  }
}
```

### 4. Frontend Components
**Folder:** `/apps/portal/components/`

Reuse Button, Form, Card, etc. DON'T create new component library.

```typescript
import { Button, Card, Form } from '@/components';

export function BookingForm() {
  return (
    <Card>
      <Form onSubmit={...}>
        <input type="email" />
        <Button>Submit</Button>
      </Form>
    </Card>
  );
}
```

### 5. Admin Dashboard Pattern
**Folder:** `/apps/admin/app/`

Add new section:
```
apps/admin/app/local-services/
├── page.tsx          (main dashboard)
├── services/
│   └── page.tsx      (service catalog editor)
└── customers/
    └── page.tsx      (customer list)
```

## Files You'll Create/Modify

### CREATE (New Files)

**Migrations:**
- `supabase/migrations/0046_local_services_core.sql`

**API Routes:**
- `apps/api/app/api/local-services/services/route.ts`
- `apps/api/app/api/local-services/customers/route.ts`
- `apps/api/app/api/local-services/bookings/route.ts`
- `apps/api/app/api/local-services/bookings/[id]/route.ts`
- `apps/api/app/api/local-services/quotes/route.ts`
- `apps/api/app/api/local-services/quotes/[id]/route.ts`
- `apps/api/app/api/local-services/reports/route.ts`

**Repository:**
- `apps/api/lib/repositories/local-services-repository.ts`

**Frontend (NEW APP):**
- `apps/local-services/app/layout.tsx`
- `apps/local-services/app/book/page.tsx` (public booking form)
- `apps/local-services/app/dashboard/page.tsx` (customer portal)
- `apps/local-services/app/dashboard/bookings/page.tsx`
- `apps/local-services/app/dashboard/invoices/page.tsx`

**Admin Extension:**
- `apps/admin/app/local-services/page.tsx` (dashboard)
- `apps/admin/app/local-services/services/page.tsx`
- `apps/admin/app/local-services/customers/page.tsx`

**Tests:**
- `apps/api/app/api/local-services/__tests__/services.test.ts`
- `apps/api/app/api/local-services/__tests__/bookings.test.ts`
- `apps/api/app/api/local-services/__tests__/tenant-isolation.test.ts`

### MODIFY (Existing Files)

- `package.json` — add `@intcloudsysops/local-services` app (if monorepo needs it)
- `apps/admin/app/layout.tsx` — add Local Services nav link
- `supabase/.gitignore` — ensure migrations tracked

### DON'T TOUCH
- Core billing, orchestrator, or auth logic
- Existing database migrations (0001-0045)
- Portal or admin auth flows
- Task orchestrator configuration

## Database Schema

**File:** `supabase/migrations/0046_local_services_core.sql`

```sql
-- Local Services schema
CREATE SCHEMA local_services;

-- Services catalog per tenant
CREATE TABLE local_services.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2),
  duration_minutes INT,
  category TEXT, -- 'gamer', 'office', 'home', 'mac', 'wifi'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Customers (distinct from tenants)
CREATE TABLE local_services.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT,
  address TEXT,
  customer_type TEXT, -- 'home', 'business'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Bookings / Appointments
CREATE TABLE local_services.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  customer_id uuid NOT NULL REFERENCES local_services.customers(id),
  service_ids uuid[] NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, en_route, completed, cancelled
  notes TEXT,
  assigned_to UUID, -- technician_id (null = unassigned)
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX(tenant_id, status)
);

-- Quotes (formal pricing proposals)
CREATE TABLE local_services.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  customer_id uuid REFERENCES local_services.customers(id),
  service_ids uuid[] NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX(tenant_id, status)
);

-- Service Reports (post-visit summaries)
CREATE TABLE local_services.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  booking_id uuid NOT NULL REFERENCES local_services.bookings(id),
  description TEXT,
  findings TEXT,
  recommendations TEXT,
  duration_minutes INT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  INDEX(tenant_id, booking_id)
);

-- RLS Policies (tenant isolation)
ALTER TABLE local_services.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_services.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_services.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_services.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_services.service_reports ENABLE ROW LEVEL SECURITY;

-- Policies use tenant_id = current_user's tenant (via JWT claim)
CREATE POLICY "services_tenant_isolation" ON local_services.services
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Similar for customers, bookings, quotes, reports...
```

## API Endpoints

### Services
```
GET /api/local-services/services
  Returns: [{ id, name, description, base_price, category, ... }]

POST /api/local-services/services
  Body: { name, description, base_price, duration_minutes, category }
  Returns: created service + id
```

### Customers
```
GET /api/local-services/customers
  Returns: [{ id, email, full_name, customer_type, ... }]

POST /api/local-services/customers
  Body: { email, phone, full_name, address, customer_type }
  Returns: created customer
```

### Bookings
```
GET /api/local-services/bookings?status=pending
  Returns: [{ id, customer_id, scheduled_at, status, ... }]

POST /api/local-services/bookings
  Body: { customer_id, service_ids[], scheduled_at, notes }
  Returns: { id, status: 'pending' }

PATCH /api/local-services/bookings/[id]
  Body: { status: 'confirmed' | 'en_route' | 'completed' }
  Returns: updated booking
```

### Quotes
```
POST /api/local-services/quotes
  Body: { customer_id, service_ids[], notes }
  Returns: { id, total_price, valid_until, status: 'pending' }

GET /api/local-services/quotes/[id]
  Returns: quote details
```

### Reports
```
GET /api/local-services/reports?booking_id=[id]
  Returns: service report

POST /api/local-services/reports
  Body: { booking_id, description, findings, recommendations }
  Returns: created report
```

## Frontend Pages

### `/apps/local-services/app/book/page.tsx` (Public)
- Service selector (dropdown: Gamer PC / Laptop / Office)
- Issue description (textarea)
- Date/time picker (Google Calendar integration Week 2)
- Email + phone fields
- Submit → creates booking + sends email to Sales Agent

### `/apps/local-services/app/dashboard/page.tsx` (Authenticated)
- Customer login (magic link or email/password)
- Display: upcoming bookings, past invoices, recommendations
- Links to detailed booking view

## Validation Rules (Zod)

```typescript
import { z } from 'zod';

export const BookingSchema = z.object({
  customer_id: z.string().uuid(),
  service_ids: z.array(z.string().uuid()).min(1),
  scheduled_at: z.coerce.date(),
  notes: z.string().optional(),
});

export const QuoteSchema = z.object({
  customer_id: z.string().uuid().optional(),
  service_ids: z.array(z.string().uuid()).min(1),
  total_price: z.number().positive(),
  valid_until: z.coerce.date(),
});
```

Apply validation in every route:
```typescript
const data = BookingSchema.parse(await req.json());
```

## Constraints (Non-Negotiable)

✅ **Multi-tenant isolation:** Every query filters by tenant_id. Zero exceptions.  
✅ **Type safety:** No `any` in TypeScript. Use Zod for validation.  
✅ **Performance:** API responses <200ms. Add indexes on (tenant_id, created_at).  
✅ **Tests:** Write tests for all new routes. Run locally: `npm test --workspace=@intcloudsysops/api`.  
✅ **RLS policies:** Supabase RLS prevents data leaks between tenants.  
✅ **Backwards compatible:** Don't break existing Opsly APIs.

## Success Criteria

✅ All 5 API routes exist and respond  
✅ Database migration applies cleanly to staging Supabase  
✅ Public booking page loads and submits without errors  
✅ Customer dashboard shows authenticated user's bookings only  
✅ All TypeScript: `npm run type-check` passes  
✅ Tenant isolation tested (query with different tenant_ids, verify data isolation)  
✅ Tests pass locally: `npm run test --workspace=@intcloudsysops/api`  

## Example Tasks for This Prompt

1. **"Create Supabase migration for local_services tables"**
   - Apply `0046_local_services_core.sql` to staging
   - Verify schema with `npx supabase db show`

2. **"Build POST /api/local-services/bookings endpoint"**
   - Accept customer_id, service_ids[], scheduled_at
   - Validate with Zod
   - Create booking row + return response
   - Write test

3. **"Create public booking form at /apps/local-services/app/book"**
   - Service selector dropdown
   - Date/time picker
   - Form submission → POST /api/local-services/bookings
   - Success message

4. **"Add tenant isolation tests"**
   - Test query with tenant_id A, verify doesn't see tenant_id B data
   - Test RLS policies block cross-tenant access

## Questions? References

- Tenant context: `/apps/api/lib/tenant-context.ts`
- API pattern: `/apps/api/app/api/billing/` folder
- Base repo: `/apps/api/lib/base-repository.ts`
- Supabase RLS: `supabase/migrations/000X_*.sql` (search for RLS examples)
- Next.js App Router: `/apps/portal/app/` (folder structure)

# ICSO Phase 1-3 Completion Guide

**Status:** ✅ Complete  
**Created:** 2026-07-01  
**Last Updated:** 2026-07-01  
**For:** Future Tenant Implementations  

---

## Overview

Intcloudsysops (ICSO) has completed Phase 1-3 implementation within the Opsly monorepo. This guide documents the reusable patterns for future tenants seeking to replicate this stack: CRM management, dashboard analytics, GHL integration, and production deployment.

**Key Outcome:** Fully functional CloudOps management platform with:
- ✅ 5 core data entities (accounts, contacts, deals, feedback, followups)
- ✅ Complete REST API with Zod validation & tenant isolation
- ✅ Professional dashboard with Recharts visualizations
- ✅ GoHighLevel CRM integration layer
- ✅ Production-ready deployment configuration

---

## Phase 1: Schema & API Foundation (✅ Complete)

**PR:** #585  
**Files:** `apps/intcloudsysops/`  
**Time:** ~8 hours  

### What Was Built

#### Database Schema (Supabase)
- **Table:** `intcloudsysops_accounts` (name, type, status, billing_email, website, industry)
- **Table:** `intcloudsysops_contacts` (account_id, email, phone, role, status)
- **Table:** `intcloudsysops_deals` (account_id, value, stage, close_date, owner, probability)
- **Table:** `intcloudsysops_feedback` (account_id, rating, category, notes, status)
- **Table:** `intcloudsysops_followups` (polymorphic: related_type, due_at, assigned_to, priority)

All tables include:
- `tenant_slug = 'intcloudsysops'` (hardcoded during incubation)
- RLS policies enforcing tenant isolation
- Timestamps (created_at, updated_at)
- UUID primary keys

**Schema File:** `supabase/migrations/0081_intcloudsysops_schema.sql` (780 lines)

#### API Routes
All routes follow strict patterns:

```bash
# Base CRUD
POST   /api/accounts              # Create
GET    /api/accounts              # List all
GET    /api/accounts/[id]         # Get single
PUT    /api/accounts/[id]         # Update
DELETE /api/accounts/[id]         # Delete

# Same pattern for:
/api/contacts
/api/deals
/api/feedback
/api/followups
```

**Features:**
- Request ID tracing for debugging
- Zod schema validation on all inputs
- Proper HTTP status codes (201 for create, 204 for delete)
- Tenant-scoped queries (always `.eq('tenant_slug', 'intcloudsysops')`)
- Error handling with structured responses

**Route Files:**
- `apps/intcloudsysops/app/api/accounts/route.ts` (80 lines)
- `apps/intcloudsysops/app/api/accounts/[id]/route.ts` (65 lines)
- `apps/intcloudsysops/app/api/contacts/route.ts` (85 lines)
- `apps/intcloudsysops/app/api/deals/route.ts` (88 lines)
- `apps/intcloudsysops/app/api/feedback/route.ts` (similar)
- `apps/intcloudsysops/app/api/followups/route.ts` (polymorphic)

### How to Replicate

For a new tenant `{tenant}`:

1. **Create migration:**
   ```bash
   supabase migration new add_{tenant}_schema
   ```

2. **Define tables** with tenant_slug hardcoded:
   ```sql
   CREATE TABLE public.{tenant}_{entity} (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_slug text DEFAULT '{tenant}',
     ... fields ...
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   
   ALTER TABLE public.{tenant}_{entity} ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "{tenant}_{entity}_tenant_isolation"
     ON public.{tenant}_{entity}
     FOR ALL
     USING (tenant_slug = '{tenant}')
     WITH CHECK (tenant_slug = '{tenant}');
   ```

3. **Copy API routes** from `apps/intcloudsysops/app/api/` and update:
   - Table names: `intcloudsysops_accounts` → `{tenant}_accounts`
   - Schema names: `createAccountSchema` → `create{Tenant}AccountSchema`
   - Keep Zod validation identical

4. **Run migrations locally:**
   ```bash
   npm run db:migrate
   npm run db:codegen
   ```

---

## Phase 2: REST API Implementation (✅ Complete)

**PR:** #652  
**Files:** `apps/intcloudsysops/app/api/`  
**Time:** ~10 hours  

### API Contract

All endpoints return JSON:

```json
{
  "ok": boolean,
  "data": {...},
  "error": "string if ok=false",
  "request_id": "UUID for tracing"
}
```

### Validation Patterns

Use Zod for all inputs:

```typescript
const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name required'),
  account_type: z.enum(['prospect', 'customer', 'partner', 'vendor']),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  billing_email: z.string().email().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  employee_count: z.number().int().positive().optional(),
});
```

### Testing the APIs

**Create account:**
```bash
curl -X POST http://localhost:3005/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "account_type": "customer",
    "billing_email": "billing@acme.com"
  }'
```

**List accounts:**
```bash
curl http://localhost:3005/api/accounts
```

**Update account:**
```bash
curl -X PUT http://localhost:3005/api/accounts/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```

---

## Phase 3: Dashboard & Analytics (✅ Complete)

**PR:** #653  
**Files:** `apps/intcloudsysops/app/dashboard/`  
**Time:** ~12 hours  

### Dashboard Pages

#### Main Dashboard (`/dashboard`)
**URL:** `apps/intcloudsysops/app/dashboard/page.tsx` (120 lines)

**Components:**
- **Stats Cards:** Total Accounts, Monthly Revenue, Pipeline Deals, Pending Followups
- **Deal Pipeline Chart:** Bar chart showing deals by stage (lead → won/lost)
- **Deal Stage Distribution:** Pie chart of deal stage breakdown
- **Account Growth:** Area chart of accounts over time
- **Revenue Forecast:** Line chart with target line

**Recharts Components Used:**
```typescript
import { BarChart, LineChart, AreaChart, PieChart } from 'recharts';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Area, Pie, Cell } from 'recharts';
```

#### Entity Management Pages

- **Accounts:** `/dashboard/accounts` (search, status indicators, edit capability)
- **Contacts:** `/dashboard/contacts` (by account, role-based filtering)
- **Deals:** `/dashboard/deals` (by stage, probability, close_date timeline)
- **Feedback:** `/dashboard/feedback` (by rating, category, status)
- **Followups:** `/dashboard/followups` (by priority, due_date, assignment)

### Chart Patterns

**Bar Chart (Deal Pipeline):**
```typescript
<BarChart data={dealData} width={500} height={300}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="stage" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="count" fill="#3b82f6" />
</BarChart>
```

**Line Chart (Revenue with Target):**
```typescript
<LineChart data={revenueData}>
  <CartesianGrid />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="revenue" stroke="#10b981" />
  <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" />
</LineChart>
```

**Pie Chart (Distribution):**
```typescript
<PieChart width={400} height={300}>
  <Pie data={data} dataKey="count" nameKey="stage">
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

### Data Fetching

All components fetch from REST APIs:

```typescript
useEffect(() => {
  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };
  loadAccounts();
}, []);
```

### Styling

All dashboards use Tailwind CSS:
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Cards: `bg-white rounded-lg shadow`
- Status badges: `px-2 py-1 rounded text-xs font-medium`
- Responsive: Mobile-first with breakpoints

### How to Replicate

1. Create `/dashboard` layout with sidebar navigation
2. Build stat cards that aggregate API data
3. Use Recharts for visualizations (no custom Canvas)
4. Fetch data in useEffect hooks
5. Add search/filter on entity pages
6. Use Tailwind for styling (no CSS-in-JS)

---

## Phase 4: GoHighLevel Integration (✅ Complete)

**Files:** `apps/intcloudsysops/lib/gohighlevel-sync.ts`  
**Webhook:** `apps/intcloudsysops/app/api/webhooks/ghl-sync/route.ts`  
**Time:** ~4 hours  

### What Gets Synced

#### Account → GHL Contact
```json
{
  "type": "account",
  "data": {
    "name": "Acme Corp",
    "accountType": "customer",
    "billingEmail": "billing@acme.com",
    "website": "https://acme.com",
    "industry": "Technology",
    "employeeCount": 250
  }
}
```

**GHL Result:** Creates contact with custom fields:
- `account_type` = customer
- `industry` = Technology
- `employee_count` = 250
- `tenant_slug` = intcloudsysops

#### Contact → GHL Contact
```json
{
  "type": "contact",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@acme.com",
    "phone": "+1-555-0123",
    "role": "decision_maker",
    "accountId": "{account-uuid}"
  }
}
```

**GHL Result:** Creates contact linked to account via custom fields:
- `account_id` = {account-uuid}
- `role` = decision_maker

#### Deal → GHL Deal Record
```json
{
  "type": "deal",
  "data": {
    "title": "Enterprise Package - Year 1",
    "accountId": "{account-uuid}",
    "value": 150000,
    "stage": "negotiation",
    "probability": 75,
    "closeDate": "2026-09-30T00:00:00Z",
    "owner": "john@intcloudsysops.com"
  }
}
```

**GHL Result:** Creates deal record as contact with fields:
- `deal_value` = 150000
- `deal_stage` = negotiation
- `deal_probability` = 75
- `deal_owner` = john@intcloudsysops.com

### Webhook Usage

**Trigger sync from your app:**
```bash
curl -X POST http://localhost:3005/api/webhooks/ghl-sync \
  -H "Content-Type: application/json" \
  -H "x-request-id: {UUID}" \
  -d '{
    "type": "account",
    "data": {
      "name": "New Account",
      "accountType": "prospect",
      "billingEmail": "contact@newaccount.com"
    }
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "ghlContactId": "contact_ABC123"
  },
  "request_id": "{UUID}"
}
```

### Error Handling

All sync failures are non-blocking (return status 503, not 500):
```typescript
if (!result) {
  return NextResponse.json(
    { ok: false, error: 'GHL sync failed or not configured' },
    { status: 503 }
  );
}
```

This allows your app to continue working even if GHL is temporarily unavailable.

### Configuration

**Required Doppler Secrets:**
```
GOHIGHLEVEL_API_KEY
GOHIGHLEVEL_LOCATION_ID
GOHIGHLEVEL_BASE_URL
GOHIGHLEVEL_API_VERSION
```

**Verify Setup:**
```bash
doppler run --project ops-intcloudsysops --config prd -- bash -c 'echo $GOHIGHLEVEL_API_KEY'
```

---

## Production Deployment Checklist

### Pre-Deployment (Week -1)

- [ ] All CI checks passing (TypeScript, ESLint, tests)
- [ ] Database migrations applied to production Supabase
- [ ] GHL location created and configured
- [ ] Doppler secrets configured for production
- [ ] API endpoints load-tested (see `/scripts/load-test-api.sh`)
- [ ] Dashboard performance tested (< 2s load time)

### Deployment (Day 1)

- [ ] DNS configured (intcloudsysops.op-sly.com)
- [ ] SSL certificate provisioned
- [ ] Environment variables set in production
- [ ] Database backups configured
- [ ] Monitoring/alerting setup
- [ ] Deploy to Vercel or Docker (see deployment scripts)

### Post-Deployment (Day 1-2)

- [ ] Smoke tests pass:
  ```bash
  curl https://intcloudsysops.op-sly.com/api/accounts
  curl https://intcloudsysops.op-sly.com/dashboard
  ```
- [ ] GHL sync tested with sample data
- [ ] Logs monitored for errors
- [ ] Performance baseline recorded

### Ongoing (Weekly)

- [ ] Backup verification
- [ ] Security scanning
- [ ] Performance monitoring
- [ ] User feedback collection

---

## File Inventory

### Core Application
```
apps/intcloudsysops/
├── app/
│   ├── api/
│   │   ├── accounts/route.ts          # CRUD endpoints
│   │   ├── contacts/route.ts
│   │   ├── deals/route.ts
│   │   ├── feedback/route.ts
│   │   ├── followups/route.ts
│   │   └── webhooks/ghl-sync/route.ts # GHL integration
│   ├── dashboard/
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── accounts/page.tsx         # Entity management
│   │   ├── contacts/page.tsx
│   │   ├── deals/page.tsx
│   │   ├── feedback/page.tsx
│   │   ├── followups/page.tsx
│   │   └── layout.tsx                # Sidebar navigation
│   └── layout.tsx
├── lib/
│   ├── gohighlevel-sync.ts           # GHL integration layer
│   └── validation/
│       └── schemas.ts                # Zod schemas
├── components/
│   ├── charts/
│   │   ├── deal-pipeline-chart.tsx
│   │   └── account-metrics.tsx
│   └── dashboard/
│       └── stats-cards.tsx
└── migrations/
    └── 011_add_ghl_contact_id.sql    # GHL tracking columns
```

### Configuration
```
apps/intcloudsysops/
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
├── tailwind.config.js
└── CLAUDE.md
```

### Documentation
```
docs/
├── blueprints/
│   └── ICSO-PHASE-1-3-COMPLETION-GUIDE.md (this file)
├── tenants/
│   └── intcloudsysops/
│       ├── DATA-MODEL.md
│       ├── ARCHITECTURE.md
│       └── EXTRACTION-PLAN.md
```

### Database
```
supabase/migrations/
└── 0081_intcloudsysops_schema.sql   # 5 tables + RLS
```

---

## Common Issues & Solutions

### Issue: API returns 403 Forbidden
**Cause:** RLS policy not allowing access  
**Solution:** Verify `tenant_slug = 'intcloudsysops'` is in all queries

### Issue: Dashboard shows "Loading..." forever
**Cause:** API endpoint not responding  
**Solution:** Check Supabase connection in `.env.local`

### Issue: GHL sync returns 503
**Cause:** GOHIGHLEVEL_API_KEY not configured  
**Solution:** Verify Doppler secrets: `doppler secrets get`

### Issue: Charts render but show no data
**Cause:** Fetch returns empty array  
**Solution:** Create test data via API: `curl -X POST /api/accounts`

### Issue: TypeScript errors on deploy
**Cause:** Missing type definitions  
**Solution:** Run `npm run type-check` locally before pushing

---

## Next Steps: Production

### GHL Sales Engine
- Trigger n8n workflows on deal creation
- Auto-create tasks for follow-up
- Sync deal updates back to Supabase

### Advanced Analytics
- Revenue forecasting dashboard
- Sales performance by owner
- Account health scoring

### Multi-Tenant Support
- Parameterize tenant_slug (currently hardcoded)
- Implement customer hierarchy (accounts > contacts > deals)
- Add sub-account management

### Extraction to Standalone
- Move to repo: `cloudsysops/intcloudsysops-platform`
- Get own Supabase project
- Event-based integration with Opsly
- Criteria: 100+ customers or 50+ users + revenue

---

## Contact & Support

**Owner:** team@intcloudsysops.com  
**Maintainer:** Opsly DevOps  
**Slack:** #intcloudsysops  
**Repository:** cloudsysops/opsly  
**Issues:** https://github.com/cloudsysops/opsly/labels/intcloudsysops

---

**Last Verified:** 2026-07-01  
**Version:** 1.0 (Phase 1-3 Complete)

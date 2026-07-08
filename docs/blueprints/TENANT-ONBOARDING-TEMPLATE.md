# Tenant Onboarding Blueprint — Template for New Verticals

**Purpose:** Standardize onboarding for new tenants (after Peskids + ICSO patterns proven)  
**Audience:** Product managers, architects, operations  
**Baseline:** Peskids (MVP complete) + ICSO (in progress)

---

## Quick Checklist (Before Starting New Tenant)

- [ ] Define vertical (e.g., "fitness-coaching", "dental-practice")
- [ ] Assign owner email (who approves features)
- [ ] Decide: shared Supabase (incubation) or own project (extraction-ready)
- [ ] Plan: 3–6 month MVP timeline
- [ ] Choose: CRM (Twenty primary, GHL optional legacy, or other)
- [ ] Estimate: team size, feature count, data volume

---

## Structure: What Every Tenant Needs

### 1. App Directory (`apps/{tenant-slug}/`)

**Base structure (copy from Peskids):**
```
apps/my-tenant/
├─ app/
│  ├─ api/
│  │  ├─ leads/              (or equivalent entry point)
│  │  ├─ admin/              (team management, settings)
│  │  ├─ webhooks/           (Jelou, n8n, etc.)
│  │  └─ health.ts
│  ├─ (ui/pages)
│  └─ layout.tsx
├─ lib/
│  ├─ services/              (business logic, no raw DB)
│  ├─ validation/            (Zod schemas)
│  ├─ team-management.ts     (reuse from Peskids, update slugs)
│  ├─ staff-auth.ts          (reuse)
│  ├─ app-url.ts             (reuse)
│  └─ supabase.ts            (reuse)
├─ components/
│  └─ admin/                 (team panel, settings)
├─ migrations/               (Supabase, specific to tenant)
├─ .env.example
├─ CLAUDE.md                 (tenant-specific guidance)
└─ README.md
```

**Do NOT copy:**
- ❌ Old files: `peskids-canonical-api.ts` (rename to tenant-specific)
- ❌ Hardcoded strings: always use env vars for URLs, domains
- ❌ Duplicated node_modules or `.next/` (shared)

**DO copy:**
- ✅ `team-management.ts` (update tenant_slug hardcoding)
- ✅ `staff-auth.ts` (reuse middleware)
- ✅ API patterns (validation → service → DB)
- ✅ Error handling (errorJson, successJson helpers)

---

### 2. Config Entry (`config/tenants/{tenant-slug}.json`)

**Template:**
```json
{
  "tenant_name": "My Tenant",
  "tenant_slug": "my-tenant",
  "schema_name": "my_tenant",
  "platform_domain": "op-sly.com",
  "public_url": "https://my-tenant.op-sly.com",
  "internal_port": 300X,
  "stack_type": "incubator-app",
  "pattern_ids": ["incubator-app", "crm-starter-stack"],
  "staff_login_path": "/admin/login",
  "workflows_count": 4,
  "pricing_per_unit": 0,
  "currency": "USD",
  "owner_email": "owner@my-tenant.com",
  "notes": "Brief description of vertical + MVP scope",
  "integrations": {
    "twenty_crm": {
      "enabled": true,
      "default_opportunity_stage": "NEW"
    },
    "jelou": {
      "workspace_id": "TBD",
      "form_ids": ["lead-capture", "feedback"]
    },
    "n8n": {
      "container": "tenant_my_tenant",
      "workflows": 4
    }
  }
}
```

**What each field means:**
- `tenant_slug`: lowercase, hyphens, 3–30 chars (matches Supabase `platform.tenants.slug`)
- `internal_port`: unique port for local dev (3004=peskids, 3005=icso, 300X=new)
- `pattern_ids`: inherit from Peskids ("incubator-app" = local-first + auth + team mgmt)
- `integrations`: which CRMs, webhooks, n8n enabled for this vertical

---

### 3. Supabase Schema

**Tables to create (vertical-specific):**
```sql
-- Example: My Tenant leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL CHECK (tenant_slug = 'my-tenant'),
  parent_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text DEFAULT 'new',
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leads_tenant_email ON public.leads(tenant_slug, email);
```

**Always:**
- Filter all queries by `tenant_slug = 'my-tenant'` (tenant isolation)
- Add `created_at` + `updated_at` (audit trail)
- Create indices on `(tenant_slug, frequently_filtered_col)`
- Document schema in `docs/tenants/my-tenant/DATA-MODEL.md`

**Shared tables (no changes):**
- `platform.tenants` (one entry per vertical)
- `platform.tenant_memberships` (team members, roles)
- `auth.users` (Supabase auth, shared)

---

### 4. CRM Setup

**Option A: Twenty Primary (Recommended)**

```bash
# 1. Deploy Twenty stack (same as Peskids)
bash scripts/tenants/setup-twenty-my-tenant.sh --apply

# 2. Generate API key (UI)
# Go to https://crm-my-tenant.op-sly.com → Admin → API Tokens

# 3. Set Doppler
doppler secrets set TWENTY_API_URL=https://crm-my-tenant.op-sly.com
doppler secrets set TWENTY_API_KEY=<key>
doppler secrets set MY_TENANT_TWENTY_ENABLED=true
```

**Create abstraction layer:**
```typescript
// apps/my-tenant/lib/my-tenant-crm-sync.ts
// Copy pattern from peskids-crm-sync.ts
// Update: flags (MY_TENANT_TWENTY_ENABLED), function names, types
```

**Option B: Different CRM (e.g., HubSpot, Pipedrive)**

1. Choose CRM SDK (e.g., `@hubspotdev/api-client`)
2. Create service: `lib/services/hubspot-lead-sync.ts`
3. Follow same abstraction pattern (behind feature flag)
4. Test with smoke script: `scripts/my-tenant/crm-smoke.sh`

---

### 5. CLAUDE.md (Tenant Guidance)

**Template (copy from Peskids, update):**

```markdown
# My Tenant — [Vertical Description]

**Status:** MVP Phase (Phase 0 Incubation); tenant within Opsly monorepo  
**Stack:** Next.js 14 (TypeScript), Supabase, n8n, Opsly VPS target
**Tenant slug:** `my-tenant`  
**Team:** owner: owner@my-tenant.com  
**Dev port:** 300X  
**Prod URL:** https://my-tenant.op-sly.com

[Rest of guidance: quick commands, architecture, code rules, etc.]
```

---

### 6. Documentation Checklist

Create in `docs/tenants/my-tenant/`:

- [ ] **README.md** — 2–3 sentence overview
- [ ] **MVP-PLAN.md** — features by quarter, dependencies, acceptance criteria
- [ ] **DATA-MODEL.md** — schema diagram, table descriptions
- [ ] **ARCHITECTURE.md** — incubation vs extraction timeline
- [ ] **EXTRACTION-PLAN.md** — when + how to spin out to standalone repo
- [ ] **INTEGRATION-GUIDE.md** — CRM, n8n, webhooks setup

---

### 7. AI Stack Setup

Every new tenant gets an AI playbook generated by Fable 5 **once** at onboarding. Cheaper models execute from it forever.

**Required:** LLM Gateway running (`apps/llm-gateway`, port 3010).

```bash
# Generate tenant AI playbook (one-time, ~$0.30 in Fable 5 tokens)
doppler run --project ops-intcloudsysops --config prd -- \
  node scripts/llm-tenant-onboarding.js --tenant=my-tenant

# Creates in Supabase under tenant_slug:
# - lead_classification_rubric   (HOT/WARM/COLD scoring rules)
# - response_playbook            (20 situations + ideal responses)
# - digest_template              (daily admin summary format)
# - churn_signals                (at-risk detection patterns)
```

**Doppler secrets:**
```bash
doppler secrets set MY_TENANT_LLM_ENABLED=true
doppler secrets set MY_TENANT_DEFAULT_MODEL=sonnet   # use haiku for cost-sensitive tenants
```

**LLM model by use case:**

| Task | Model | Frequency |
|------|-------|-----------|
| Generate onboarding playbook | `fable` | Once |
| Hot lead response drafts | `sonnet` | Per hot lead |
| Intent classification / routing | `haiku` | Per message |
| Daily digest generation | `sonnet` | Daily |
| Architecture decisions / ADRs | `fable` | Per ADR |

**Add to `config/tenants/my-tenant.json`:**
```json
{
  "ai": {
    "enabled": true,
    "default_model": "sonnet",
    "playbook_generated": false
  }
}
```

See: `docs/blueprints/AI-TENANT-SETUP-BLUEPRINT.md` · `docs/brain/skills/fable5-manual.md`

---

### 8. Deployment

**Local dev:**
```bash
npm run dev --workspace=@{tenant-slug}/app
# Runs on http://localhost:300X
```

**Staging:**
```bash
docker build -t my-tenant:latest -f apps/my-tenant/Dockerfile .
docker tag my-tenant:latest registry.op-sly.com/my-tenant:latest
docker push registry.op-sly.com/my-tenant:latest
# Deploy via CI/CD to staging VPS
```

**Production (Phase 1 only after cutover proven):**
```bash
# Same as staging, but deploy to production VPS
```

---

## Vertical-Specific Customization

### For Each Vertical, You May Need To Add:

**Vertical: Fitness Coaching**
- Custom: Class schedule + attendance (Time-series data)
- CRM: Lead → Trial Class → Member → Recurring Payment
- Webhook: GymSQL or Zen Planner integration

**Vertical: Dental Practice**
- Custom: Appointment scheduling (Calendar)
- CRM: Inbound call → Consultation → Treatment Plan
- Compliance: HIPAA logging (audit trail for every query)

**Vertical: SaaS Onboarding**
- Custom: Workspace invitations + API key generation
- CRM: Trial signup → Conversion → Churn analysis
- Webhook: Stripe subscription events

**Pattern:** Each vertical has 1–3 custom tables + 2–4 integrations. Everything else reuses Peskids/ICSO pattern.

---

## Timeline: Incubation to Extraction

| Phase | Timeline | Criteria | Action |
|-------|----------|----------|--------|
| Phase 0: Incubation | MVP (3–6m) | Product-market fit | Build in Opsly monorepo |
| Phase 1: Validation | Post-MVP (6m) | 50+ active users | Deploy to VPS, monitor metrics |
| Phase 2: Extraction | Proven (9m+) | 100+ paying OR 50+ users + revenue | Move to standalone repo |

**Extraction decision:** Made by product + ops, not developer. See EXTRACTION-PLAN.md template in Peskids.

---

## What NOT to Do

- ❌ Hardcode domain names (`localhost:3000`, IP addresses)
- ❌ Duplicate code from another tenant (copy + paste → sync nightmare)
- ❌ Create custom ORM/service layer (use shared @intcloudsysops/services)
- ❌ Skip tenant isolation (ALL queries must filter by tenant_slug)
- ❌ Commit secrets or API keys (.env.example only)
- ❌ Skip validation (Zod + RLS policies)

---

## Checklist: Ready for MVP Launch

- [ ] App runs locally: `npm run dev`
- [ ] Type-check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Config exists: `config/tenants/my-tenant.json`
- [ ] Schema migrated: `supabase migration list` shows new tables
- [ ] Team management works: invite admin → login → see admin panel
- [ ] Lead capture works: POST `/api/leads` → data in Supabase
- [ ] CRM sync works: lead appears in Twenty (if enabled)
- [ ] Smoke test passes: `bash scripts/my-tenant/crm-smoke.sh`
- [ ] CLAUDE.md complete: docs + quick reference
- [ ] Owner approved: signed off on MVP scope + timeline

---

## Resources

### Templates to Copy

- `apps/peskids/` → Baseline app structure
- `config/tenants/peskids.json` → Config template
- `docs/tenants/peskids/` → Documentation template
- `scripts/tenants/setup-twenty-peskids.sh` → Deployment script (adapt for new tenant)
- `scripts/peskids/twenty-crm-smoke.sh` → Smoke test (adapt for new tenant)

### Guidance Documents

- Opsly CLAUDE.md (root) → Monorepo governance, stack decisions
- Peskids CLAUDE.md → Example tenant-specific guidance
- Peskids MVP-PLAN.md → Example feature planning
- TWENTY-CRM-CUTOVER-CHECKLIST.md → CRM migration procedure (reuse for any tenant)

### Support

- **Architecture questions:** See `docs/02-architecture/`
- **Code questions:** See `lib/` modules (reusable services)
- **Deployment questions:** See `scripts/`
- **Data model questions:** See tenant-specific `docs/tenants/*/DATA-MODEL.md`

---

## Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-07-02 | Ops Team | Initial template based on Peskids + ICSO |
| TBD | | Version 2: Post-Peskids-extraction lessons learned |

---

**Next tenant starts here. Copy this template, adapt vertical-specific parts, follow the checklist.**

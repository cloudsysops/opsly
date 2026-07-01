---
status: draft
owner: operations
last_review: 2026-05-24
type: app-doc
tags:
  - opsly/app
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Intcloudsysops — CloudOps Management Platform

**Status:** MVP Phase (Phase 0 Incubation); tenant within Opsly monorepo  
**Stack:** Next.js 14 (TypeScript), Supabase, n8n, Opsly VPS target
**Tenant slug:** `intcloudsysops`  
**Team:** owner: team@intcloudsysops.com  
**Dev port:** 3005  
**Prod URL:** https://intcloudsysops.op-sly.com (in development)

---

## Getting Started

### Quick commands

```bash
# Install and run
npm install
npm run dev          # http://localhost:3005

# Quality gates (required before commit)
npm run type-check   # TypeScript validation
npm run lint         # ESLint check
npm run build        # Verify production build

# Database
npx supabase migration list --project-id jkwykpldnitavhmtuzmo  # View migrations
npx supabase migration new <name>  # Create new migration
```

### Environment setup

1. Copy `.env.example` to `.env.local`
2. Get secrets from Doppler:
   ```bash
   doppler run --project intcloudsysops --config dev -- cat .env.example > .env.check
   ```
3. Verify: `npm run type-check` (should pass with no TypeScript errors)

---

## Architecture

### Tenant incubation within Opsly

Intcloudsysops is a tenant incubated within the Opsly monorepo. It is NOT yet a standalone product repo (see [EXTRACTION-PLAN.md](docs/tenants/intcloudsysops/EXTRACTION-PLAN.md) for future extraction criteria).

**Current setup (Phase 0):**
- App lives at `apps/intcloudsysops/` (Next.js 14)
- Schema lives in shared Supabase project (`jkwykpldnitavhmtuzmo`)
- n8n workflows run in VPS container `tenant_intcloudsysops`
- Metadata in `config/tenants/intcloudsysops.json`
- Docs in `docs/tenants/intcloudsysops/`

**Future extraction (Phase 1+):**
- Will move to standalone repo `cloudsysops/intcloudsysops-platform`
- Will get own Supabase project
- Will integrate with Opsly via event webhooks (not direct schema sharing)
- Criteria: 100+ paying customers OR 50+ real users + proven revenue

### Data model

**Core entities** (see `docs/tenants/intcloudsysops/DATA-MODEL.md` for full schema):

| Entity | Purpose | Key fields |
|--------|---------|-----------|
| `intcloudsysops_accounts` | Customer accounts | name, account_type, status, billing_email |
| `intcloudsysops_contacts` | Account contacts | account_id, email, phone, role, status |
| `intcloudsysops_deals` | Sales opportunities | account_id, value, stage, close_date, owner |
| `intcloudsysops_feedback` | Customer feedback | account_id, rating, category, notes, status |
| `intcloudsysops_followups` | Action items | related_type, due_at, assigned_to, priority, status |

All tables have `tenant_slug = 'intcloudsysops'` hardcoded during incubation (will parameterize during extraction).

### Role-based access (future RLS)

| Role | Access |
|------|--------|
| **owner** (team@intcloudsysops.com) | All data, tenant admin |
| **account_manager** | Own accounts, contacts, deals |
| **support** | All accounts, feedback, followups (read) |
| **sales** | Deals, accounts, contacts (read) |

During MVP, enforce roles in application logic; RLS will be added post-MVP.

### Integration points

#### n8n (CRM workflows on VPS)

Peskids has 4 CRM workflows running in `tenant_peskids` container:

1. **Lead capture** — forms → `leads` table → hot lead alert
2. **Follow-up reminder** — daily digest of `followups`
3. **Feedback digest** — summarize `feedback` for owner
4. **Hot lead notification** — email/Slack alert when lead status changes

Workflows are triggered by:
- Webhook from Jelou (form submissions)
- PostgreSQL polling (cron via n8n)
- Manual trigger (owner dashboard)

#### Opsly integration (post-extraction)

After extraction, Peskids will emit events to Opsly:

```
lead.created → Opsly tracks customer acquisition
feedback.created → Opsly health check
student.converted → Opsly revenue signal
```

See `EXTRACTION-PLAN.md` for event schema.

---

## Code rules

### API routes and business logic

**All API routes MUST have:**
- TypeScript strict mode (no `any`)
- Request ID for tracing
- Zod validation for inputs
- Proper error handling
- Service layer (never raw DB in routes)

**Pattern:**
```typescript
// api/leads.ts
import { createLogger } from '@intcloudsysops/observability';
import { LeadService } from '@/lib/services/lead.service';
import { createLeadSchema } from '@/lib/validation/lead.schema';

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = createLogger({ requestId });

  try {
    const body = await req.json();
    const data = createLeadSchema.parse(body);
    
    const service = new LeadService({ tenantSlug: 'peskids', requestId });
    const lead = await service.create(data);
    
    return Response.json({ ok: true, data: lead });
  } catch (error) {
    logger.error('lead creation failed', { error });
    return Response.json(
      { ok: false, error: 'Lead creation failed', request_id: requestId },
      { status: 400 }
    );
  }
}
```

### Tenant isolation

Every query MUST filter by `tenant_slug = 'peskids'`:

```typescript
// lib/services/lead.service.ts
async find(id: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('tenant_slug', 'peskids')  // ALWAYS
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}
```

### Validation

Use Zod schemas (pattern from smile-trip-care):

```typescript
// lib/validation/lead.schema.ts
import { z } from 'zod';

export const createLeadSchema = z.object({
  source: z.enum(['web', 'referral', 'event', 'manual']),
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'converted']),
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
```

### Migrations

Never edit existing migrations. New migrations go in `apps/peskids/migrations/`:

```bash
# Create migration
supabase migration new add_parent_phone_verification

# Content (migrations/TIMESTAMP_add_parent_phone_verification.sql):
alter table public.parents
add column phone_verified_at timestamptz;

alter index idx_parents_phone rename to idx_parents_phone_verified;
```

Always:
- Use `IF NOT EXISTS` for safety
- Include timestamp and descriptive names
- Document in Supabase dashboard
- Test locally first (`npm run dev`)

---

## Development workflow

### Branch strategy

- Work on feature branches: `feat/peskids-*` or `feat/*`
- PR to `main` (not direct push)
- Require CI green before merge
- Squash merge for clean history

### Commits and push

**MANDATORY after every task:**

```bash
# 1. Check status
git status

# 2. Stage changes
git add -A

# 3. Commit with clear message
git commit -m "feat(peskids): add lead status workflow"

# 4. Push to branch
git push origin feat/peskids-xyz
```

**Commit message format:**
- `feat(peskids): description` — new feature
- `fix(peskids): description` — bug fix
- `docs(peskids): description` — docs only
- `chore(peskids): description` — infra, deps

### Testing

Sprint 01 is documentation-focused; no unit tests required yet.

Phase 1 (MVP completion) will add:
- Form validation tests (Zod + Vitest)
- API route tests (mocked Supabase)
- Integration tests (real Supabase fixture)

For now:
- `npm run type-check` — always before commit
- Manual testing: `npm run dev` → http://localhost:3004
- Supabase migrations: test with `supabase migration test` (coming Phase 1)

---

## Sprint 01 — Documentation Phase (May 19–26, 2026)

**Goal:** Complete wireframes, forms spec, and demo script for owner approval.

**Tasks (all currently `todo`):**

1. **Landing Page Wireframe** — Lead capture form, benefits, CTA
2. **Lead Capture Form Fields** — Zod schema + HTML form spec
3. **Parent Feedback Form** — Survey structure + Jelou integration
4. **Dashboard Specification** — 5 cards minimum (leads, students, classes, feedback, followups)
5. **Event Contract for Opsly** — Webhook payload structure (future extraction)
6. **Demo Script (ES + EN)** — Walk-through for owner approval

**Dependencies:**
- Form spec → dashboard designs → demo script
- Wireframes are input to UI build (Phase 1)
- Event contract is reference for n8n workflows (Phase 2)

**Acceptance criteria (per SPRINT-01.md):**
- All wireframes in Figma or PDF
- Form validation schemas in `lib/validation/`
- Demo script runs locally on port 3004
- Both Spanish and English copy approved by owner

---

## Tenant-specific gotchas

### Do NOT

- Hardcode domain names — use env `NEXT_PUBLIC_TENANT_DOMAIN`
- Query without `tenant_slug = 'peskids'`
- Use `any` type in TypeScript
- Skip `npm run type-check` before commit
- Modify shared Opsly schema (orchestrator, auth core, BullMQ)
- Commit secrets or API keys (use Doppler)
- Bypass git add → commit → push protocol

### Do

- Filter all queries by `tenant_slug`
- Validate inputs with Zod before DB
- Keep business logic in `lib/services/`
- Test migrations locally first
- Reference `EXTRACTION-PLAN.md` when adding features (plan for future standalone)
- Commit after every meaningful change
- Use request ID in all logs

---

## Docs and references

### In this repo

- `docs/tenants/peskids/MVP-PLAN.md` — product roadmap
- `docs/tenants/peskids/ARCHITECTURE.md` — incubation → extraction overview
- `docs/tenants/peskids/DATA-MODEL.md` — schema design (draft)
- `docs/tenants/peskids/FORMS-SPEC.md` — lead form spec (in progress)
- `docs/tenants/peskids/EXTRACTION-PLAN.md` — phase-by-phase extraction criteria
- `docs/tenants/peskids/FUTURE-REPO-SEED.md` — blueprint for standalone repo
- `docs/tenants/peskids/INCUBATION-CHECKLIST.md` — MVP readiness checklist
- `config/tenants/peskids.json` — tenant metadata

### Parent monorepo

- `intcloudsysops/.claude/CLAUDE.md` — Opsly governance, OpenClaw, skills
- `AGENTS.md` — current op status (branch: `feat/peskids-sprint-01`)
- `docs/03-agents/AGENT-BRAIN-CONTRACT.md` — shared brain contract

### Reference repos (do NOT use as peskids product)

- `smile-trip-care/` — pattern source for auth, Supabase, Stripe (not peskids)
- `nuevo-repo/` — CI, security, runbooks (reference only)

---

## Ports and services

| Service | Port | Purpose |
|---------|------|---------|
| peskids dev | 3004 | Next.js dev server |
| Opsly API | 3000 | (shared, do not use directly) |
| Opsly portal | 3002 | Owner login (future) |
| n8n VPS | Tailscale | CRM workflows (`tenant_peskids` container) |
| Supabase | via Doppler | Shared project |

---

## Extraction path

Peskids is currently in **Phase 0 (Incubation)**. Extraction is NOT immediate.

**Extraction criteria (from EXTRACTION-PLAN.md):**
- 100+ paying customers OR
- 50+ real users + revenue proof

**When extraction happens (Phase 1+):**
1. Clone blueprint from `docs/tenants/peskids/FUTURE-REPO-SEED.md`
2. Create new repo: `cloudsysops/peskids-platform`
3. Migrate schema (parameterize `tenant_slug`, remove hardcoded Opsly refs)
4. Set up own Supabase project + separate hosting + Stripe
5. Integrate with Opsly via event webhooks (not schema sharing)

For now: **Build everything here in Opsly.** The extraction plan is a reference, not a blocker.

---

## Quick reference

| Question | Answer |
|----------|--------|
| Where is the app? | `apps/intcloudsysops/` |
| Where is the schema? | Supabase shared project `jkwykpldnitavhmtuzmo` |
| Where are CRM workflows? | VPS container `tenant_intcloudsysops` (n8n) |
| Where are the docs? | `docs/tenants/intcloudsysops/` |
| Where is tenant config? | `config/tenants/intcloudsysops.json` |
| How do I deploy? | Script pending: `scripts/deploy-intcloudsysops-finish.sh` (Phase 2) |
| Who owns intcloudsysops? | team@intcloudsysops.com |
| Can I extract to standalone now? | No — Phase 0 incubation. See EXTRACTION-PLAN.md. |
| What's the next task? | Sprint 01: complete schema + RLS + CRM sync + demo (all tasks are `todo`) |

---

## Related Links

- [[apps/intcloudsysops/README|intcloudsysops]]
- [[README|Home]]

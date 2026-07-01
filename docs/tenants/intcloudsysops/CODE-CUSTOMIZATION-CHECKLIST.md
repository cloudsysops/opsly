---
status: draft
owner: engineering
last_review: 2026-07-01
type: implementation-plan
tags:
  - opsly/tenant
  - phase-1-prep
---

# Intcloudsysops — Code Customization Checklist (Phase 2)

This document identifies all code components and API routes that require CRM-specific customization for Intcloudsysops. **Phase 1 focuses on configuration and testing; Phase 2 will implement these customizations.**

## Component Customization Index

### UI Components (React/Next.js)

#### Core Dashboard Components

| Component | Current Use | CRM Customization Needed | Priority | Status |
|-----------|-------------|-------------------------|----------|--------|
| **Dashboard Layout** | Generic portal frame | Add CRM metrics sidebar (deals, accounts, followups) | P1 | TODO |
| **Card Component** | Generic layout | Add deal/account summary cards with color coding | P1 | TODO |
| **Table Component** | Data display | Add CRM-specific sorting (stage, value, due date) | P1 | TODO |
| **Form Component** | Generic forms | Add Zod validation for accounts, contacts, deals, followups | P1 | TODO |
| **Modal/Dialog** | Generic modals | CRM modals for account creation, deal quick-add | P2 | TODO |
| **Search Component** | Text search | Add faceted search: by status, stage, owner, value range | P2 | TODO |

#### Dashboard Widgets (To Build)

| Widget | Purpose | Data Source | Priority |
|--------|---------|-------------|----------|
| **Pipeline Summary** | Total value by stage + count | `intcloudsysops_deals` query | P1 |
| **Top Accounts** | Top 5 by value or activity | `intcloudsysops_accounts` + aggregation | P1 |
| **Activity Feed** | Recent account/deal changes | `intcloudsysops_activity_log` (future) | P2 |
| **Overdue Followups** | Due actions by assignee | `intcloudsysops_followups` where status='pending' AND due_at < today | P1 |
| **Forecast** | Monthly revenue projection | `intcloudsysops_deals` with probability weighting | P2 |
| **Win Rate Trend** | Historical close % by month | `intcloudsysops_deals` historical data | P3 |

#### Page-Level Components (To Build)

| Page | Component File | Screens | Priority |
|------|-----------------|---------|----------|
| **Accounts** | `pages/accounts/` | List, Detail, Create, Edit | P1 |
| **Contacts** | `pages/contacts/` | List, Detail, Create, Bulk Add | P1 |
| **Deals** | `pages/deals/` | Pipeline View, List, Detail, Create | P1 |
| **Feedback** | `pages/feedback/` | Survey List, Results, Create | P2 |
| **Followups** | `pages/followups/` | List, Due Today, Create, Assign | P1 |
| **Admin Settings** | `pages/admin/settings/` | Team, Roles, Integrations (GHL, n8n) | P2 |
| **Reports** | `pages/reports/` | Pipeline summary, forecast, activity | P3 |

### API Routes (Next.js)

#### Accounts API

| Route | Method | Purpose | Zod Schema | Status |
|-------|--------|---------|-----------|--------|
| `/api/accounts` | GET | List accounts (with pagination, filters) | Query params schema | TODO |
| `/api/accounts` | POST | Create new account | `createAccountSchema` | TODO |
| `/api/accounts/[id]` | GET | Fetch single account + related data | — | TODO |
| `/api/accounts/[id]` | PATCH | Update account | `updateAccountSchema` | TODO |
| `/api/accounts/[id]/contacts` | GET | List contacts for account | — | TODO |
| `/api/accounts/[id]/deals` | GET | List deals for account | — | TODO |
| `/api/accounts/[id]/feedback` | GET | List feedback for account | — | TODO |
| `/api/accounts/[id]/timeline` | GET | Activity timeline (future) | — | TODO |

#### Contacts API

| Route | Method | Purpose | Zod Schema | Status |
|-------|--------|---------|-----------|--------|
| `/api/contacts` | GET | List contacts (global) | Query params schema | TODO |
| `/api/contacts` | POST | Create new contact | `createContactSchema` | TODO |
| `/api/contacts/[id]` | GET | Fetch single contact | — | TODO |
| `/api/contacts/[id]` | PATCH | Update contact | `updateContactSchema` | TODO |
| `/api/contacts/[id]/interactions` | GET | Contact history (calls, emails) | — | TODO |

#### Deals API

| Route | Method | Purpose | Zod Schema | Status |
|-------|--------|---------|-----------|--------|
| `/api/deals` | GET | List deals (pipeline view) | Query: stage, owner, account_id, status_filter | TODO |
| `/api/deals` | POST | Create new deal | `createDealSchema` | TODO |
| `/api/deals/[id]` | GET | Fetch single deal + contacts | — | TODO |
| `/api/deals/[id]` | PATCH | Update deal (stage, value, close date) | `updateDealSchema` | TODO |
| `/api/deals/[id]/move` | POST | Move deal to new stage (pipeline drag-drop) | `{ stage: enum }` | TODO |
| `/api/deals/[id]/close` | POST | Close deal (won or lost) | `{ status, reason?, close_date }` | TODO |
| `/api/deals/pipeline` | GET | Pipeline summary (grouped by stage) | — | TODO |
| `/api/deals/forecast` | GET | Revenue forecast (next 3 months) | Query: scenario (conservative, likely, optimistic) | TODO |

#### Feedback API

| Route | Method | Purpose | Zod Schema | Status |
|-------|--------|---------|-----------|--------|
| `/api/feedback` | GET | List feedback entries | Query: account_id, type, status | TODO |
| `/api/feedback` | POST | Submit feedback | `createFeedbackSchema` | TODO |
| `/api/feedback/[id]` | GET | Fetch single feedback | — | TODO |
| `/api/feedback/[id]` | PATCH | Update feedback (status, notes) | `updateFeedbackSchema` | TODO |
| `/api/feedback/summary` | GET | Aggregate feedback by account/category | — | TODO |

#### Followups API

| Route | Method | Purpose | Zod Schema | Status |
|-------|--------|---------|-----------|--------|
| `/api/followups` | GET | List followups (with filters) | Query: assigned_to, status, due_before | TODO |
| `/api/followups` | POST | Create new followup | `createFollowupSchema` | TODO |
| `/api/followups/[id]` | GET | Fetch single followup | — | TODO |
| `/api/followups/[id]` | PATCH | Update followup (status, due_date, notes) | `updateFollowupSchema` | TODO |
| `/api/followups/[id]/complete` | POST | Mark followup as done | `{ completed_at? }` | TODO |
| `/api/followups/due-today` | GET | Followups due today (daily digest source) | — | TODO |

#### Webhooks

| Route | Trigger | Purpose | Status |
|-------|---------|---------|--------|
| `/api/webhooks/gohighlevel/accounts` | GHL API | Sync account changes (POST from GHL) | TODO |
| `/api/webhooks/n8n/account-sync` | n8n workflow | Account created via n8n | TODO |
| `/api/webhooks/n8n/deal-update` | n8n workflow | Deal stage change notification | TODO |

### Validation Schemas (Zod)

All input validation schemas should live in `lib/validation/` directory.

#### To Create

| Schema | Location | Used By | Fields | Status |
|--------|----------|---------|--------|--------|
| `createAccountSchema` | `lib/validation/account.schema.ts` | POST /api/accounts | name, account_type, status, billing_email, phone, industry, estimated_value, owner_id | TODO |
| `updateAccountSchema` | `lib/validation/account.schema.ts` | PATCH /api/accounts/[id] | Subset of create schema (all optional) | TODO |
| `createContactSchema` | `lib/validation/contact.schema.ts` | POST /api/contacts | account_id, full_name, email, phone, role, status | TODO |
| `updateContactSchema` | `lib/validation/contact.schema.ts` | PATCH /api/contacts/[id] | Subset of create schema (all optional) | TODO |
| `createDealSchema` | `lib/validation/deal.schema.ts` | POST /api/deals | account_id, name, stage, status, value, probability, expected_close_date, owner_id, description | TODO |
| `updateDealSchema` | `lib/validation/deal.schema.ts` | PATCH /api/deals/[id] | Subset of create schema (all optional) | TODO |
| `moveDealSchema` | `lib/validation/deal.schema.ts` | POST /api/deals/[id]/move | stage (enum) | TODO |
| `closeDealSchema` | `lib/validation/deal.schema.ts` | POST /api/deals/[id]/close | status (won\|lost), reason?, close_date | TODO |
| `createFeedbackSchema` | `lib/validation/feedback.schema.ts` | POST /api/feedback | account_id, contact_id?, feedback_type, rating, category?, message | TODO |
| `updateFeedbackSchema` | `lib/validation/feedback.schema.ts` | PATCH /api/feedback/[id] | status, notes | TODO |
| `createFollowupSchema` | `lib/validation/followup.schema.ts` | POST /api/followups | title, related_type, related_id, due_at, priority, assigned_to?, notes? | TODO |
| `updateFollowupSchema` | `lib/validation/followup.schema.ts` | PATCH /api/followups/[id] | Subset of create schema (all optional) | TODO |

### Service Layer (Business Logic)

To create in `lib/services/`:

| Service | Methods | Purpose | Status |
|---------|---------|---------|--------|
| `AccountService` | create, find, list, update, archive, getWithRelated | Account lifecycle + related data | TODO |
| `ContactService` | create, find, list, update, delete, getByAccount | Contact management | TODO |
| `DealService` | create, find, list, update, move, close, getByAccount, getPipeline, getForecast | Deal pipeline management | TODO |
| `FeedbackService` | create, find, list, update, getSummary | Feedback collection + reporting | TODO |
| `FollowupService` | create, find, list, update, complete, getDueToday | Action item management | TODO |
| `ReportService` | getPipelineSummary, getForecastProjection, getActivityTimeline, getAccountHealthScore | Reporting/analytics | TODO |

Each service should:
- Accept `tenantSlug` + `requestId` in constructor
- Filter all queries by `tenant_slug = 'intcloudsysops'`
- Log operations via `@intcloudsysops/observability`
- Handle errors via `@intcloudsysops/errors`

### Peskids-Specific References to Remove

Search codebase for these patterns and verify they are **NOT present** in intcloudsysops:

```bash
grep -r "peskids" apps/intcloudsysops --ignore-case
grep -r "class" apps/intcloudsysops --ignore-case  # Peskids-specific entity
grep -r "enrollment" apps/intcloudsysops --ignore-case  # Peskids-specific
grep -r "student" apps/intcloudsysops --ignore-case  # Peskids-specific (may be allowed if we have "contacts")
grep -r "parent" apps/intcloudsysops --ignore-case  # Peskids-specific
grep -r "teacher" apps/intcloudsysops --ignore-case  # Peskids-specific
grep -r "attendance" apps/intcloudsysops --ignore-case  # Peskids-specific
grep -r "grade_interested" apps/intcloudsysops  # Peskids lead form field
```

**Expected result:** 0 matches in apps/intcloudsysops/ after cleanup.

## Integration Checklist

### GoHighLevel (GHL) Integration — Phase 2

**Status:** GHL infrastructure configured in Phase 0 (contract in place); customization in Phase 2.

- [ ] GHL account sync webhook receiver (`/api/webhooks/gohighlevel/accounts`)
  - [ ] Receives account.created events from GHL
  - [ ] Maps GHL contact → intcloudsysops_contact
  - [ ] Maps GHL opportunity → intcloudsysops_deal
  - [ ] Tests with GHL sandbox

- [ ] GHL integration settings in admin panel
  - [ ] Location ID configuration
  - [ ] Private integration verification
  - [ ] Webhook URL validation

### n8n Workflows Integration — Phase 2

**Status:** 3 workflows created (account-sync, deal-status-update, followup-reminder); Phase 2 adds triggers.

- [ ] Link webhook triggers to API routes
  - [ ] Account creation triggers account-sync workflow
  - [ ] Deal creation/update triggers deal-status-update workflow
  - [ ] Followup status updates trigger notifications

- [ ] n8n workflow monitoring in admin panel
  - [ ] Display last execution status
  - [ ] Show error logs
  - [ ] Manual trigger button

### Email/Notification Service — Phase 2

- [ ] Email templates for followup reminders
- [ ] SMS templates (if supported)
- [ ] Slack/Teams integration for alerts
- [ ] Notification preferences per user

## Type Safety & Validation

### TypeScript Strict Mode

All new code must comply with:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Pre-Commit Checks

```bash
npm run type-check  # Must pass
npm run lint        # Must pass
npm run build       # Must pass
```

## Testing Requirements

### Unit Tests

- [ ] Zod schemas (validation round-trips)
- [ ] Service methods (account CRUD, deal transitions)
- [ ] API route handlers (request/response contracts)

### Integration Tests

- [ ] Account → Contact → Deal flow
- [ ] Deal pipeline transitions
- [ ] Followup creation + completion
- [ ] GHL webhook parsing

### E2E Tests

- [ ] User creates account, adds contact, opens deal, closes won
- [ ] Pipeline view loads and displays correctly
- [ ] Followup reminder sends at scheduled time

## Phase 2 Kickoff Checklist

Before starting Phase 2 customization:

- [ ] All docs completed (DATA-MODEL.md, DEPLOYMENT.md, EXTRACTION-PLAN.md)
- [ ] npm run type-check passes
- [ ] npm run build passes
- [ ] Doppler secrets verified
- [ ] Supabase schema live (intcloudsysops_* tables)
- [ ] n8n workflows deployed to VPS
- [ ] GHL configuration complete
- [ ] Team approval from team@intcloudsysops.com

## Reference Patterns

### Similar Implementations

For UI/UX patterns, reference:
- **Peskids**: Lead form, feedback survey (UI only, not data model)
- **Smile Trip Care**: Customer account + service order flow
- **Panini Lab**: Contact + call tracking

Use these as **design reference only**; do NOT copy Peskids business logic.

### Opsly Lib Modules

Leverage existing Opsly modules:

| Module | Purpose | Usage |
|--------|---------|-------|
| `@intcloudsysops/observability` | Request logging | Every API route + service |
| `@intcloudsysops/errors` | Error handling | Service layer error wrapping |
| `@intcloudsysops/components` | UI components | Buttons, forms, layouts (if applicable) |
| `@intcloudsysops/session-manager` | Auth context | Portal session (Phase 2) |
| `@intcloudsysops/config` | Env management | Supabase URL, Doppler secrets |

## Blockers & Dependencies

### Known Blockers

- None for Phase 1 config/testing
- Phase 2 requires: GHL API credentials verified, n8n container running, Supabase schema deployed

### External Dependencies

| Dependency | Status | Blocks |
|------------|--------|--------|
| GoHighLevel API | Configured | GHL sync workflows (Phase 2) |
| Supabase Project | Live | Database operations (Phase 2) |
| n8n Container | Running | Workflow execution (Phase 2) |
| Doppler Secrets | Configured | All environment access |

## Success Criteria (Phase 1 → 2 Handoff)

- [ ] This checklist reviewed and signed off by engineering lead
- [ ] All "TODO" items converted to GitHub issues with Phase 2 tag
- [ ] npm run type-check, build, test all pass
- [ ] Code review approval from 1+ senior eng
- [ ] Product review approval from team@intcloudsysops.com
- [ ] Deployment readiness confirmed (see DEPLOYMENT.md)

## Related Documents

- **DATA-MODEL.md** — Database schema reference
- **DEPLOYMENT.md** — Dev/staging/prod setup
- **EXTRACTION-PLAN.md** — Future architecture
- **apps/intcloudsysops/CLAUDE.md** — Dev environment
- `.github/workflows/deploy-intcloudsysops-prod.yml` — CI/CD pipeline

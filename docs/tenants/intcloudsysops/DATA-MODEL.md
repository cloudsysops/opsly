---
status: draft
owner: product
last_review: 2026-07-01
tenant_slug: intcloudsysops
---

# Intcloudsysops — Data Model (Phase 1 Draft)

> **Status:** Schema design for MVP and future extraction. Phase 0 schema deployed to shared Supabase project `jkwykpldnitavhmtuzmo`.

## Principles

- All IDs: UUID v4
- `tenant_slug = 'intcloudsysops'` hardcoded during incubation (will parameterize on extraction to standalone repo)
- Timestamps: UTC with `timestamptz` type
- Soft-delete: `deleted_at` nullable on sensitive entities
- PII: Minimal retention per GDPR/CCPA; see retention policy in DEPLOYMENT.md

## Core Entities

### `intcloudsysops_accounts`

Customer accounts (prospects, customers, partners).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK, auto-generated |
| tenant_slug | text | Always `'intcloudsysops'` |
| name | text | Company/account name |
| account_type | enum | `prospect`, `customer`, `partner`, `reseller` |
| status | enum | `active`, `paused`, `at_risk`, `churned` |
| billing_email | text | Primary contact email for invoicing |
| phone | text | nullable — main phone line |
| industry | text | nullable — e.g., "SaaS", "Marketing Agency" |
| estimated_value | integer | cents; 0 if unknown |
| owner_id | uuid | nullable — FK to team member (future: `intcloudsysops_team_members`) |
| notes | text | nullable — internal notes |
| created_at | timestamptz | Record creation |
| updated_at | timestamptz | Last modification |
| deleted_at | timestamptz | nullable — soft-delete flag |

**Indexes:**
- `idx_intcloudsysops_accounts_tenant_status` — (tenant_slug, status, created_at)
- `idx_intcloudsysops_accounts_name_search` — (name) GIN for text search

### `intcloudsysops_contacts`

People associated with accounts (decision-makers, technical contacts, billing).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_slug | text | Always `'intcloudsysops'` |
| account_id | uuid | FK → intcloudsysops_accounts |
| full_name | text | |
| email | text | unique per account (partial unique index) |
| phone | text | nullable |
| role | enum | `decision_maker`, `technical`, `billing`, `other` |
| status | enum | `active`, `inactive`, `do_not_contact` |
| last_contacted_at | timestamptz | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable |

**Indexes:**
- `idx_intcloudsysops_contacts_account_id` — (account_id, status)
- `idx_intcloudsysops_contacts_email` — unique partial on (tenant_slug, account_id, email) where deleted_at IS NULL

### `intcloudsysops_deals`

Sales opportunities / revenue pipeline.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_slug | text | Always `'intcloudsysops'` |
| account_id | uuid | FK → intcloudsysops_accounts |
| name | text | Deal name / project title |
| stage | enum | `discovery`, `proposal`, `negotiation`, `closed_won`, `closed_lost` |
| status | enum | `open`, `stalled`, `won`, `lost` |
| value | integer | Deal value in cents |
| probability | integer | 0–100% (for weighted pipeline) |
| expected_close_date | date | Projected close date |
| actual_close_date | date | nullable — filled on close |
| owner_id | uuid | nullable — assigned sales rep |
| description | text | nullable — pitch, scope, notes |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable |

**Indexes:**
- `idx_intcloudsysops_deals_tenant_status` — (tenant_slug, status, updated_at)
- `idx_intcloudsysops_deals_account_id` — (account_id, status)
- `idx_intcloudsysops_deals_stage_date` — (stage, expected_close_date)

### `intcloudsysops_feedback`

Customer feedback, surveys, satisfaction scores.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_slug | text | Always `'intcloudsysops'` |
| account_id | uuid | FK → intcloudsysops_accounts |
| contact_id | uuid | nullable — FK → intcloudsysops_contacts |
| feedback_type | enum | `nps`, `satisfaction`, `feature_request`, `bug_report`, `general` |
| rating | integer | 1–5 (NPS or CSAT scale) |
| category | text | nullable — e.g., "onboarding", "support", "product" |
| message | text | Free-form feedback |
| status | enum | `new`, `reviewed`, `actioned`, `archived` |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable |

**Indexes:**
- `idx_intcloudsysops_feedback_tenant_status` — (tenant_slug, status, created_at)
- `idx_intcloudsysops_feedback_account_id` — (account_id)

### `intcloudsysops_followups`

Action items and reminders.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_slug | text | Always `'intcloudsysops'` |
| title | text | Short action description |
| related_type | enum | `account`, `contact`, `deal`, `feedback` |
| related_id | uuid | FK — points to account/contact/deal/feedback |
| due_at | date | When action is due |
| priority | enum | `low`, `normal`, `high`, `urgent` |
| assigned_to | uuid | nullable — team member ID |
| status | enum | `pending`, `in_progress`, `done`, `cancelled` |
| notes | text | nullable — detailed notes |
| completed_at | timestamptz | nullable — when marked done |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable |

**Indexes:**
- `idx_intcloudsysops_followups_tenant_status` — (tenant_slug, status, due_at)
- `idx_intcloudsysops_followups_assigned_to` — (assigned_to, due_at, status)
- `idx_intcloudsysops_followups_related` — (related_type, related_id)

## Supporting Entities

### `intcloudsysops_deal_digests` (auto-generated)

Daily snapshots of deal pipeline. Populated by n8n cron workflow.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_slug | text | Always `'intcloudsysops'` |
| generated_at | timestamptz | Timestamp of digest generation |
| digest_data | jsonb | Summary: `{ deal_count, by_stage, total_value, deals: [...] }` |
| created_at | timestamptz | Record creation (same as generated_at) |

**Indexes:**
- `idx_intcloudsysops_deal_digests_generated` — (generated_at DESC)

### `intcloudsysops_activity_log` (future)

Audit trail for data changes. Enables history and undo.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenant_slug | text | Always `'intcloudsysops'` |
| entity_type | enum | `account`, `contact`, `deal`, `feedback`, `followup` |
| entity_id | uuid | FK to affected entity |
| action | enum | `created`, `updated`, `deleted` |
| changes | jsonb | Old → new field values |
| actor_id | uuid | nullable — who made the change |
| created_at | timestamptz | |

**Indexes:**
- `idx_intcloudsysops_activity_tenant_entity` — (tenant_slug, entity_type, entity_id, created_at)

## Row-Level Security (RLS) — Phase 2

Post-MVP, RLS policies will enforce:

| Role | Access |
|------|--------|
| **owner** (team@intcloudsysops.com) | All tables, full CRUD |
| **account_manager** | Own accounts + related contacts/deals/feedback; read followups |
| **support** | All accounts/contacts (read); feedback/followups (read) |
| **sales** | Assigned deals + related accounts/contacts (read); create feedback |

During Phase 1 MVP, enforce roles in application logic (service layer).

## Data Retention & Cleanup

| Entity | Retention | Cleanup Rule |
|--------|-----------|-------------|
| Accounts | Indefinite (soft-delete only) | Soft-delete when `status = 'churned'` for 12 months |
| Contacts | 24 months after last_contacted_at | Hard-delete; soft-delete if do_not_contact |
| Deals | 12 months after close | Archive to `intcloudsysops_deals_archive` |
| Feedback | 24 months | Soft-delete or aggregate to summary table |
| Followups | 6 months after completed_at | Hard-delete; escalate if overdue |
| Activity Log | 12 months | Purge old records; weekly cron |

## Validation Rules

### At Insert/Update

- `name` (accounts): non-empty, max 255 chars
- `email` (contacts): valid email format; unique per account
- `value` (deals): non-negative integer
- `due_at` (followups): >= today
- `account_id` (all child tables): must exist in accounts
- All `tenant_slug` must = `'intcloudsysops'` (enforced at app layer during incubation)

### Constraints

```sql
ALTER TABLE intcloudsysops_accounts
  ADD CONSTRAINT check_value_positive CHECK (estimated_value >= 0);

ALTER TABLE intcloudsysops_deals
  ADD CONSTRAINT check_deal_value_positive CHECK (value >= 0),
  ADD CONSTRAINT check_probability_range CHECK (probability >= 0 AND probability <= 100);

ALTER TABLE intcloudsysops_feedback
  ADD CONSTRAINT check_rating_range CHECK (rating >= 1 AND rating <= 5);
```

## Migration Strategy

### Phase 0 → Phase 1 (Current)

Schema is live in shared Supabase. Migrations are applied via:

```bash
npm run db:migrate --workspace=@intcloudsysops/migrations
npx supabase migration new <name>  # Create new migration
```

### Phase 1 → Extraction (Future)

When extracting to standalone repo:
1. Clone schema to new Supabase project
2. Parameterize `tenant_slug` (remove hardcoded value)
3. Set up replication/sync if needed during cutover
4. Update app connection strings
5. Validate RLS policies

## Example Queries

### Pipeline Summary

```sql
SELECT stage, COUNT(*) as count, SUM(value) as total_value
FROM intcloudsysops_deals
WHERE tenant_slug = 'intcloudsysops' AND status = 'open'
GROUP BY stage
ORDER BY stage;
```

### Overdue Followups by Assignee

```sql
SELECT assigned_to, COUNT(*) as count, MIN(due_at) as earliest_due
FROM intcloudsysops_followups
WHERE tenant_slug = 'intcloudsysops'
  AND status = 'pending'
  AND due_at < CURRENT_DATE
GROUP BY assigned_to;
```

### Account Health Scorecard

```sql
SELECT 
  a.id, a.name,
  COUNT(DISTINCT d.id) as open_deals,
  SUM(d.value) as pipeline_value,
  COUNT(DISTINCT f.id) as recent_feedback,
  MAX(c.last_contacted_at) as last_contact
FROM intcloudsysops_accounts a
LEFT JOIN intcloudsysops_deals d ON d.account_id = a.id AND d.status = 'open'
LEFT JOIN intcloudsysops_feedback f ON f.account_id = a.id AND f.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN intcloudsysops_contacts c ON c.account_id = a.id
WHERE a.tenant_slug = 'intcloudsysops' AND a.deleted_at IS NULL
GROUP BY a.id, a.name;
```

## References

- **DEPLOYMENT.md** — Environment setup, secrets, database URL
- **EXTRACTION-PLAN.md** — How schema will evolve during extraction
- **N8N Workflows** — `.n8n/1-workflows/intcloudsysops/` — consume/produce from these tables

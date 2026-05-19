# Peskids Extraction Plan — Incubation to Independent Platform

**Purpose:** Define how Peskids transitions from Opsly-incubated tenant to independent product  
**Status:** Pre-MVP (Phase 1)  
**Timeline:** Year 1–2 (post-launch)

---

## Why Extraction?

Peskids serves two roles:

1. **Operational Pilot** (Now) — Validates Opsly multi-tenant framework
2. **Independent Product** (Future) — Standalone platform for after-school programs

Extraction is planned but not urgent. Focus now is proving the model in Opsly first.

---

## Extraction Phases

### Phase 0: Incubation (Peskids in Opsly)

**Timeline:** Now – Launch + 3 months  
**Ownership:** CloudSysOps + Opsly Ops team  
**Infrastructure:** Opsly Supabase, Opsly event bus, Opsly LLM Gateway

**Outcomes:**
- ✅ Multi-tenant isolation proven
- ✅ Event contract established
- ✅ Approval-first operations validated
- ✅ Real users, real data, real operational decisions

**Metrics:**
- 50+ leads captured
- 10+ active students
- Owner uses dashboard daily
- Zero data breaches
- Zero approval-first violations

---

### Phase 1: Extraction Readiness (Year 2, post-launch)

**Timeline:** Month 4–6 (post-launch)  
**Task:** Prepare Peskids to run standalone without Opsly

**Prerequisites:**
- RLS policies are Peskids-specific (no Opsly assumptions)
- Events can be re-routed to external event bus (Kafka, Temporal, etc.)
- No hardcoded Opsly LLM Gateway URLs
- Database schema is documented + migration-friendly
- API is versioned + stable

**Deliverables:**
- `EXTRACTION-CHECKLIST.md` — List of code changes needed
- `STANDALONE-SCHEMA.md` — Standalone database schema (stripped of Opsly dependencies)
- `EVENT-ROUTING.md` — How to swap Opsly event bus for external option
- `VERSIONING-PLAN.md` — Semantic versioning for Peskids APIs
- `LICENSE-DECISION.md` — Open-source or proprietary

---

### Phase 2: Partial Extraction (Year 2, late)

**Timeline:** Month 7–9  
**Task:** Run Peskids on separate infrastructure, test autonomy

**Setup:**
- Dedicated Supabase project (separate from main Opsly)
- Dedicated LLM provider (OpenAI, Anthropic, Claude API)
- Kafka/Redis event bus (standalone)
- Separate deployment (Vercel or own server)

**Testing:**
- ✅ Zero data loss during migration
- ✅ Real owner can use Peskids independently
- ✅ Third-party can operate Peskids (customer trial)
- ✅ API is stable + versioned
- ✅ Bugs don't affect Opsly

**Metrics:**
- Extraction time < 4 hours
- Zero customer-facing downtime
- 100% event delivery without Opsly
- Cross-platform compatibility (multiple owners)

---

### Phase 3: Full Independence (Year 2+)

**Timeline:** Month 10+ (or never, if product stays in Opsly)  
**Task:** Peskids is fully independent product

**Ownership:** Separate team or external partner  
**Infrastructure:** Fully external (AWS, GCP, Vercel, etc.)  
**Business:** Standalone pricing, support, roadmap

**Not required to do:**
- If Opsly can sustain growth
- If multi-tenant model is still valuable
- If economics don't support standalone ops

---

## Extraction Criteria (Decision Point)

**Extract Peskids if:**

1. ✅ **Product-market fit proven** — 100+ paying customers OR 50+ real users
2. ✅ **Revenue potential > Opsly overhead** — Standalone justifies separate team
3. ✅ **Regulatory mismatch** — Peskids needs different compliance than Opsly
4. ✅ **Infrastructure mismatch** — Peskids needs features Opsly can't provide
5. ✅ **Customer request** — Major customer wants to self-host

**Don't extract if:**

1. ❌ **Still proving hypothesis** — <50 users or <3 months revenue
2. ❌ **No sustainable business model** — No clear path to profitability
3. ❌ **Opsly benefits from presence** — Peskids validates framework for others
4. ❌ **Customer doesn't request it** — No self-hosting demand

---

## Technical Extraction Checklist

### Code Changes

- [ ] Remove hardcoded `tenant_id = "peskids"` assumptions
- [ ] Make tenant_id injectable (env var or config)
- [ ] Remove Opsly event bus subscriptions; make configurable
- [ ] Remove Opsly LLM Gateway dependency; add openai/anthropic SDKs
- [ ] Create `standalone/docker-compose.yml` for single-tenant deployment
- [ ] Document schema migration process
- [ ] Version all APIs with `/v1/`, `/v2/` paths
- [ ] Create `CHANGELOG.md` for schema + API changes
- [ ] Add feature flags for Opsly-specific features (future)

### Infrastructure

- [ ] Standalone database schema (Supabase or PostgreSQL)
- [ ] Standalone auth (Supabase Auth or custom)
- [ ] Standalone event bus config (in-process queue or external)
- [ ] Standalone LLM config (OpenAI, Anthropic, or local)
- [ ] Standalone deployment (Docker, Vercel, or manual)
- [ ] Standalone secrets management (Doppler or env vars)
- [ ] Standalone monitoring (Sentry, Datadog, or custom)

### Operations

- [ ] Runbook for installing Peskids standalone
- [ ] Runbook for migrating data from Opsly to standalone
- [ ] Support process for standalone Peskids customers
- [ ] SLA for standalone version (if paid product)
- [ ] Update process + backward compatibility plan

### Legal/Business

- [ ] Licensing decision (MIT, Apache, proprietary)
- [ ] Data export policy (customer can export their data)
- [ ] Support SLA (if commercial)
- [ ] Pricing model (per-user, per-tenant, flat, free)

---

## Version Strategy

Peskids uses **semantic versioning** after extraction:

```
Incubation:  (in Opsly) → versioning is internal
Phase 0–1:   0.1.x (MVP on Opsly)
Phase 1–2:   1.0.0 (Extraction readiness)
Phase 2–3:   1.x.y (Standalone operations)
Phase 3+:    2.0.0+ (Independent product)
```

**API Versioning:**
- v1 = Current (stable)
- v0 = Legacy (deprecated, sunset date set)
- Major version bump = Breaking change
- Minor version bump = New feature (backward compatible)
- Patch version bump = Bug fix

**Database Versioning:**
- All migrations are numbered and irreversible
- Export/import schemas between versions is tested
- Rollback tested for last 2 major versions

---

## Key Design Decisions (Locked for Extraction)

**These decisions assume future independence:**

1. **No Opsly-specific secrets in code** — All secrets injected via env
2. **No hardcoded Opsly URLs** — All URLs configurable
3. **No assumptions about other Opsly tenants** — Peskids is self-contained
4. **Events are portable** — Event schema works with any event bus
5. **Database is portable** — No Opsly-specific functions/triggers
6. **Auth is optional** — Works with or without Supabase Auth

**Violating these locks extraction timeline.**

---

## Post-Extraction Relationship

**If Peskids is extracted, it can still:**

- ✅ Use Opsly as a reference implementation
- ✅ Integrate with Opsly via public APIs
- ✅ Subscribe to Opsly events (if APIs allow)
- ✅ Contribute back (bug fixes, features)

**It will NOT:**

- ❌ Share source code with Opsly
- ❌ Use Opsly's event bus
- ❌ Depend on Opsly infrastructure
- ❌ Follow Opsly's roadmap decisions

---

## Decision Point Timeline

| Date | Question | Answer Needed |
|------|----------|---------------|
| Month 3 | Should we extract? | Ops review + CloudSysOps |
| Month 6 | Is extraction ready? | Tech readiness check |
| Month 9 | Will we extract? | Business + product decision |
| Year 2+ | When do we extract? | Market + customer demand |

**Until Month 9**, Peskids is incubated in Opsly and follows Opsly roadmap.  
**After Month 9**, extraction is optional but technically feasible.

---

## Success Definition

**Extraction is successful if:**

1. ✅ Standalone Peskids operates for 1 month without Opsly
2. ✅ Data is 100% migrated and accurate
3. ✅ All customers (Opsly-incubated users) continue working
4. ✅ New standalone customer signs up and uses Peskids
5. ✅ Zero data loss, zero regression

---

## References

- Peskids README: [README.md](./README.md)
- Blueprint Mapping: [BLUEPRINT-MAPPING.md](./BLUEPRINT-MAPPING.md)
- MVP Plan: [MVP-PLAN.md](./MVP-PLAN.md)
- MVP Backlog: [MVP-BACKLOG.md](./MVP-BACKLOG.md)

# Opsly Operational Blueprint v0.1

**Status:** Draft v0.1 (In Development)  
**Purpose:** Define how multi-tenant services operate safely and at scale within Opsly  
**Validation Pilot:** Peskids (after-school education tenant)  
**Updated:** 2026-05-19

---

## What is the Operational Blueprint?

The Operational Blueprint is a set of **non-negotiable principles** for how all Opsly tenants:

1. **Isolate data** (multi-tenant security)
2. **Communicate** (event-driven architecture)
3. **Operate safely** (approval-first AI)
4. **Scale reliably** (real-time observability)
5. **Evolve independently** (extraction-ready design)

It's not a technology choice. It's an **operational contract** every tenant must honor.

---

## Why Blueprint v0.1?

1. **Learning mode** — Peskids is the first operational pilot. We'll learn from real usage.
2. **Refinement path** — Feedback from Peskids will inform v0.2 (better, clearer).
3. **Not final** — Expect breaking changes. v0.2 will refactor based on Peskids findings.
4. **Principles not details** — Blueprint defines "what" (isolation, events, approval-first) not "how" (which database, which event bus).

---

## 5 Core Principles

### 1. Multi-Tenant Isolation

**Principle:** Data in Tenant A is never visible to Tenant B, by architecture not convention.

**How it works:**
- Every table has `tenant_id` column
- RLS (Row-Level Security) at database layer enforces filtering
- No query defaults to "show all tenants"
- No exception for admins
- Every API endpoint validates tenant context

**Validation method:**
- Two test tenants in staging
- Cross-tenant queries blocked (verified in CI)
- Audit logs show who accessed what tenant data

**Peskids implementation:** ✅ RLS on leads, students, feedback, followups tables

---

### 2. Event-Driven Communication

**Principle:** Services don't call each other directly. They emit events. Consumers subscribe.

**Why:**
- **Loose coupling** — Services don't need to know about each other
- **Auditability** — All changes flow through event log
- **Replayability** — Can rebuild data by replaying events
- **Scalability** — Add new consumers without changing producer

**How it works:**
```
User Action (form submit, button click)
  ↓
Service creates database record
  ↓
Service emits event to event bus
  ↓
Event bus logs event + routes to consumers
  ↓
Consumers (dashboard, alerts, metrics) process event
  ↓
(If consumer fails, retry with exponential backoff)
```

**Event contract:**
- Every event has: event_id, tenant_id, timestamp, payload
- Events are immutable (no editing)
- At-least-once delivery (consumer handles duplicates)
- 90-day retention (then archive)

**Peskids implementation:** ✅ 9 events defined: lead.created, feedback.created, followup.completed, etc.

---

### 3. Approval-First AI Operations

**Principle:** AI suggests, humans approve. No auto-send, no silent automations.

**Why:**
- **Transparency** — Owner sees what we're about to do
- **Trust** — No surprises. Owner controls their business.
- **Safety** — If AI makes a mistake, owner catches it before send
- **Regulation** — Audit trail: owner approved X on date Y

**How it works:**
```
AI generates suggestion: "Send follow-up email to Maria on Friday"
  ↓
Suggestion appears in dashboard: "Recommended: Email to Maria - [Approve] [Dismiss]"
  ↓
Owner reviews + clicks [Approve]
  ↓
Event emitted: "owner_approved_followup"
  ↓
Action executed (email sent, task created, etc.)
  ↓
Audit log shows: owner approved at time T, action executed
```

**Never auto-execute:**
- ❌ Auto-send emails to parents
- ❌ Auto-create follow-up tasks
- ❌ Auto-enroll students
- ❌ Auto-schedule messages

**Peskids implementation:** ✅ All follow-ups require explicit owner click; dashboard shows what will happen before approval

---

### 4. Real-Time Observability

**Principle:** Operators see what's happening NOW, not yesterday.

**Why:**
- **Operational need** — Owner needs to know if a lead came in 2 minutes ago
- **Quick response** — Alert on negative feedback within 1 second
- **Trust** — Dashboard is source of truth, not batch report from email

**How it works:**
- New data appears in dashboard within 2–5 seconds
- Alerts (e.g., "low satisfaction feedback") within 1 second
- Trend charts update every 5 minutes
- No overnight batch jobs hiding urgencies

**Implementation choice:** WebSocket subscriptions (Supabase Realtime) + fallback to 5-second poll

**Peskids implementation:** ✅ Supabase Realtime for lead/feedback; 5-second poll for follow-ups

---

### 5. Extraction-Ready Design

**Principle:** Every tenant can eventually run independently, without Opsly.

**Why:**
- **Business flexibility** — If tenant grows, they can own infrastructure
- **Risk mitigation** — Tenant is not locked into Opsly
- **Quality assurance** — Forces us to avoid hardcoding tenant-specific assumptions

**How it works:**
- Tenant configuration is injectable (env vars, not code)
- Event bus connection is swappable (Opsly → Kafka → Redis)
- Database schema is portable (works with any PostgreSQL)
- APIs are versioned (v1, v2, avoiding breaking changes)

**Extraction checklist:**
- [ ] No hardcoded Opsly URLs
- [ ] No hardcoded tenant secrets
- [ ] All external services are injected via config
- [ ] Database migrations are documented + reversible
- [ ] API version is explicit (v1, v2)

**Peskids implementation:** ✅ Designed to extract; EXTRACTION-PLAN.md defines timeline

---

## Operational Guardrails

### Security

- **Minimum PII:** Collect only what's operationally necessary
- **No plaintext secrets:** All secrets injected via Doppler or env
- **Encrypted at rest:** Database encryption enabled
- **Encrypted in transit:** HTTPS only
- **RLS enforced:** Database layer blocks cross-tenant access
- **Audit logs:** All data access logged + queryable

### Performance

- **Dashboard load:** <3 seconds (including real-time update)
- **API response:** <200ms (p95)
- **Event delivery:** <1 second (median)
- **Database queries:** All indexed; <100ms (p99)

### Reliability

- **Uptime:** 99%+ (outside of planned maintenance)
- **Data durability:** 99.99% (Supabase + backups)
- **Event delivery:** At-least-once (no data loss)
- **Graceful degradation:** Dashboard works even if real-time fails

### Observability

- **Error tracking:** All errors logged (Sentry or similar)
- **Metrics:** Events/min, users/day, latency
- **Alerts:** Ops alerted on anomalies (downtime, high error rate)
- **Logging:** Structured JSON logs, PII-free

---

## Governance Model

### Who Defines the Blueprint?

- **Opsly Architecture Team** — Initial design + v1 refinement
- **Tenant Pilots** — Feedback from real usage (Peskids, others)
- **Opsly Ops Team** — Operational constraints + safety requirements

### Who Must Follow It?

**Mandatory for all tenants:**
- Multi-tenant isolation (RLS)
- Event emission (all user actions)
- Approval-first (no silent automations)
- Real-time observability (dashboard, not batch)

**Recommended but flexible:**
- Which event bus (Supabase, Kafka, Redis)
- Which database (PostgreSQL preferred)
- Which API framework (Next.js, FastAPI, Go)
- Which monitoring (Sentry, Datadog, custom)

### Change Process

**To propose Blueprint change:**
1. Document proposal in `docs/blueprints/proposals/`
2. Get feedback from 2+ tenant pilots
3. Get approval from Opsly Architecture Team
4. Create PR → review → merge
5. Announce in AGENTS.md + all-hands
6. Existing tenants have 30 days to align

---

## Peskids as Validation Pilot

**Why Peskids?**
- Real user (after-school education nonprofit)
- Clear operational workflows (leads → enrollment → feedback)
- Low infrastructure risk (no new systems needed)
- Realistic scope (5–7 user stories per sprint)

**What we're learning:**
1. ✅ Multi-tenant isolation is viable for real users
2. ✅ Event contracts work for cross-service communication
3. ❓ Approval-first creates friction or builds trust?
4. ❓ Real-time dashboards matter operationally?
5. ❓ Can we extract tenants without breaking Opsly?

**Feedback loop:**
- Phase 1 (Design): Owner validates workflows
- Phase 2 (Build): Dev team learns from specs
- Phase 3 (Operations): Ops sees operational realities
- Phase 4 (Reflection): All teams refine blueprint

---

## Next Steps

### Phase 1: Design & Validation (Now)
- Owner reviews Peskids wireframes + demo script
- Team refines blueprint based on design feedback
- **Gate:** Owner says "yes, build this"

### Phase 2: MVP Build
- Dev team implements per blueprint
- CI validates RLS, events, approval-first
- **Gate:** 0 security issues, <2s dashboard load

### Phase 3: Operations
- First real owner uses system
- Ops monitors for anomalies
- Blueprint assumptions tested in production
- **Gate:** Owner uses daily, zero breaches

### Phase 4: Reflection & v0.2 Planning
- All learnings documented
- Blueprint v0.2 drafted
- Next tenant (TBD) onboards with updated blueprint

---

## Roadmap (Blueprint Maturity)

| Version | Timeline | Focus | Status |
|---------|----------|-------|--------|
| **v0.1** | Now | Core principles + Peskids pilot | Active |
| **v0.2** | Post-Peskids | Refinements + 2nd tenant | Planned |
| **v1.0** | Month 6+ | Stable, production-ready | TBD |
| **v2.0** | Year 2+ | Advanced features (scaling, extraction automation) | Future |

---

## References

- **Peskids Docs:** `docs/tenants/peskids/`
  - README.md — Overview
  - BLUEPRINT-MAPPING.md — How Peskids aligns
  - EXTRACTION-PLAN.md — Future independence
  - MVP-PLAN.md — MVP scope + architecture
  - MVP-BACKLOG.md — 9 epics
  - SPRINT-01.md — 7-day phase 1
  - DEMO-SCRIPT.md — Owner presentation

- **Opsly Docs:** `VISION.md`, `AGENTS.md`
- **Architecture:** `docs/adr/` (Architecture Decision Records)

---

## Questions?

- **What does Blueprint v0.1 guarantee?** Multi-tenant isolation + approval-first operations for all tenants
- **Can we break it?** Only with approval from Opsly Architecture Team
- **What if Peskids finds it unworkable?** We refine it. That's why it's a pilot.
- **How long until v1.0?** 6+ months; depends on how much Peskids teaches us
- **What about tenants that can't follow it?** They're either not ready for Opsly, or blueprint evolves to accommodate

---

**Blueprint v0.1 approved for Peskids pilot on 2026-05-19.**

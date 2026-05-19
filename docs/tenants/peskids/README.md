# Peskids — Opsly Operational Pilot

**Status:** Incubation (Phase 1 — Design & Validation)  
**Role:** Reference pilot for Opsly multi-tenant operations framework  
**Owner:** CloudSysOps (incubated tenant)  
**Blueprint:** Opsly Operational Blueprint v0.1

---

## What is Peskids?

Peskids is an after-school education program management platform incubated within Opsly. It serves as the **first operational pilot** for the Opsly Operational Blueprint, proving how a real tenant:

- Operates within the multi-tenant isolation model
- Uses event-driven architecture for cross-service communication
- Implements approval-first AI workflows
- Follows incubation → extraction lifecycle
- Maintains operational safety without sacrificing user experience

## Why Peskids?

Peskids was selected as the pilot because it:

1. **Realistic operational scope** — 5-7 user stories per sprint, manageable
2. **Clear approval-first requirement** — No auto-send, no automations without owner approval
3. **Fits Opsly's multi-tenant model perfectly** — Isolated leads, students, feedback, follow-ups by tenant
4. **Demonstrates extraction potential** — Clear future path to standalone platform
5. **Low infrastructure risk** — Uses existing Supabase, no new systems needed

## Key Phases

| Phase | Timeline | Focus | Owner |
|-------|----------|-------|-------|
| **Phase 1: Design & Validation** | 7 days (Sprint 01) | Wireframes, specs, demo | CloudSysOps Product |
| **Phase 2: MVP Build** | 7 days (Sprint 02) | Landing page, forms, dashboard | CloudSysOps Dev |
| **Phase 3: Launch & Ops** | 7 days (Sprint 03) | Live, first real users, metrics | CloudSysOps Ops |
| **Phase 4: Stabilization** | Ongoing | Monitoring, feedback loops, scaling | CloudSysOps + Opsly Ops Agent |

## Documentation Structure

- **[BLUEPRINT-MAPPING.md](./BLUEPRINT-MAPPING.md)** — How Peskids aligns with Opsly Operational Blueprint v0.1
- **[EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md)** — Incubation → extraction lifecycle and versioning strategy
- **[MVP-PLAN.md](./MVP-PLAN.md)** — MVP architecture grounded in operational blueprint
- **[MVP-BACKLOG.md](./MVP-BACKLOG.md)** — 9 prioritized epics with acceptance criteria
- **[SPRINT-01.md](./SPRINT-01.md)** — 7-day sprint plan (design & validation)
- **[DASHBOARD-SPEC.md](./DASHBOARD-SPEC.md)** — 5-card admin dashboard specification
- **[FORMS-SPEC.md](./FORMS-SPEC.md)** — 4 forms with validation, API, events
- **[EVENT-CONTRACT.md](./EVENT-CONTRACT.md)** — 9 events and Opsly integration contract
- **[DEMO-SCRIPT.md](./DEMO-SCRIPT.md)** — Bilingual 10-minute demo for owner

## Quick Start (for Ops)

**For owner review:**
1. Read BLUEPRINT-MAPPING.md (5 min) — understand Peskids role in Opsly
2. Watch DEMO-SCRIPT.md (10 min, in person or video) — see landing page, dashboard, forms
3. Review MVP-PLAN.md (10 min) — understand timeline and phases

**For team execution:**
1. Read MVP-BACKLOG.md — epics, priorities, dependencies
2. Execute SPRINT-01.md — 7 days of design and validation
3. Move to SPRINT-02.md upon owner approval

## Opsly Integration Points

**Event Bus:** Peskids emits 9 events to Opsly event bus for:
- Lead capture attribution (which channel converts best?)
- Analytics dashboards (cross-tenant benchmarking future)
- Follow-up automation triggers (if owner opts in)
- Weekly report generation (with owner approval)

**Tenant Isolation:** 
- Supabase RLS policies enforce tenant data separation
- No lead from Tenant A visible to Tenant B
- Events tagged with tenant_id for proper routing

**Approval-First AI:**
- No auto-messaging to parents (yet)
- No auto-follow-up creation (yet)
- No auto-enrollment (yet)
- Owner approves every action that touches parents/students

## Success Metrics (Phase 1–3)

- **Phase 1:** Owner says "yes, build this" after demo ✅
- **Phase 2:** Landing page live, first 5 real leads captured ✅
- **Phase 3:** 20+ leads captured, 3+ students enrolled, owner uses dashboard daily ✅

## Future (Post-MVP)

- **Multi-language** (Spanish, Portuguese, English)
- **WhatsApp integration** (approval-first messaging)
- **AI suggestions** (smart follow-up ideas, parent sentiment)
- **Webhook APIs** (3rd-party CRM sync)
- **Standalone extraction** (Peskids as independent product)

---

## Related

- Opsly Operational Blueprint: `docs/blueprints/opsly-operational-blueprint/`
- AGENTS.md: Current operational status
- VISION.md: Opsly product direction

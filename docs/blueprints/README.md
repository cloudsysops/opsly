---
status: canonical
owner: founder
last_review: 2026-06-02
type: operating-blueprint
priority: HIGH
tags: [opsly/founder-mode, opsly/blueprint]
---

# Blueprints — Founder Mode Reference Templates

**Purpose:** Reusable, step-by-step templates extracted from Peskids (live case study).

These blueprints enable **Agency distribution** — the ability to replicate Opsly's model for new clients without starting from scratch.

---

## Blueprint Hierarchy (Founder Mode)

### Tier 1: Peskids Live Case Study
**Location:** [`../tenants/peskids/`](../tenants/peskids/)  
**Status:** Production (go-live is success metric)  
**Audience:** Internal (reference implementation)  
**Deliverables:**
- Go-live checklist
- Production runbooks
- Crisis response plans
- Metrics (uptime, revenue, CAC)

### Tier 2: Academy Blueprint (Extracted)
**Location:** [`./academy/`](./academy/) ← **Create this**  
**Status:** In extraction (post-Peskids go-live)  
**Audience:** Internal team + auditing partners  
**Deliverables:**
- Step-by-step guide to replicate Peskids (start to finish)
- Environment config template (`config/tenants/<slug>.json`)
- Database migration scripts (Supabase DDL)
- n8n workflow exports (JSON)
- Docker Compose overlay for tenant
- Acceptance criteria checklist

**Extraction source:** Peskids EXTRACTION-PLAN.md + operational docs

**Success criteria:**
- [ ] Someone unfamiliar with Peskids can follow the guide end-to-end
- [ ] Replication time: 4-6 hours (automation + manual setup)
- [ ] Production parity (same stack, same security)

### Tier 3: Agency Blueprint (Commercial)
**Location:** [`./agency/`](./agency/) ← **Create this**  
**Status:** Roadmap (post-Academy validation)  
**Audience:** Agency partners, customers, franchisees  
**Deliverables:**
- Commercial pitch + business model
- Lead capture funnel (web form, email/WhatsApp routing)
- Sales Agent prompts (custom quote generation)
- Ops Agent prompts (execution, troubleshooting)
- Replication playbook (how to run for each new client)
- Pricing guidance (Starter/Business/Enterprise)
- Margin expectations + revenue share

**Extraction source:** Academy Blueprint + Agency playbooks

**Success criteria:**
- [ ] Partner can acquire leads independently
- [ ] Partner can execute sales + onboarding with Opsly guidance
- [ ] First new client (via Blueprint) generates revenue
- [ ] CAC < LTV

---

## Current Blueprints (2026-06-02)

| Blueprint | Status | Audience | Next Step |
|-----------|--------|----------|-----------|
| [OPSLY-ENTERPRISE-HARDENING-BLUEPRINT.md](./OPSLY-ENTERPRISE-HARDENING-BLUEPRINT.md) | Draft | Ops + internal | Review after Peskids go-live |
| [opsly-operational-blueprint/](./opsly-operational-blueprint/) | Draft | Ops + internal | Retire or consolidate into Academy |
| **Academy Blueprint** | ❌ Not started | TBD | Create after Peskids go-live (Tier 2) |
| **Agency Blueprint** | ❌ Not started | TBD | Create after Academy validation (Tier 3) |

---

## Extraction Timeline (Founder Mode)

### Phase 1: Peskids Go-Live (NOW)
- Make Peskids production-ready
- Document every decision, script, config
- Measure: uptime, revenue, CAC

### Phase 2: Academy Blueprint (POST GO-LIVE)
- Extract Peskids runbooks → Academy template
- Test: can someone replicate it?
- Measure: replication time, success rate

### Phase 3: Agency Blueprint (POST ACADEMY)
- Package Academy for partners
- Create lead capture + sales playbook
- Find first partner/client to validate
- Measure: lead conversion, revenue

---

## Rules for Blueprint Work

### Branch Naming
- `blueprint/*` — extraction, template creation, docs
- Example: `blueprint/academy-extraction`, `blueprint/agency-playbook`

### Commit Format
```
docs(blueprint): extract Peskids auth flow to Academy template

Contributes to: blueprint
```

### PR Requirements
- Explain which tier (Academy/Agency) this serves
- Link to Peskids source (e.g., "Extracted from peskids/DEPLOYMENT-2026-05-21.md")
- Include acceptance criteria for the extracted artifact

### Ownership
- **Academy Blueprint:** Ops team + Founder
- **Agency Blueprint:** Founder + Sales/Partners team

---

## What NOT to Do

- ❌ Create blueprints before Peskids go-live (premature extraction)
- ❌ Generalize beyond what Peskids needs (YAGNI principle)
- ❌ Copy-paste code without documenting the "why"
- ❌ Skip testing the extracted blueprint on a test tenant

---

## Related Docs

- **Founder Mode Goal:** [`../01-development/FOUNDER-MODE-OPERATING-GOAL.md`](../01-development/FOUNDER-MODE-OPERATING-GOAL.md)
- **Peskids Case Study:** [`../tenants/peskids/README.md`](../tenants/peskids/README.md)
- **Peskids Extraction Plan:** [`../tenants/peskids/EXTRACTION-PLAN.md`](../tenants/peskids/EXTRACTION-PLAN.md)
- **Agency Division (older):** [`../01-development/OPSLY-AGENCY-DIVISION.md`](../01-development/OPSLY-AGENCY-DIVISION.md) ← Reconcile with new Founder Mode goal

---

**Last updated:** 2026-06-02  
**Next milestone:** Peskids go-live (Academy Blueprint extraction begins)

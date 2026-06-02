---
status: canonical
owner: founder
last_review: 2026-06-02
type: operating-goal
priority: CRITICAL
tags: [opsly/founder-mode, opsly/strategic]
---

# Founder Mode Operating Goal — Peskids → Blueprint → Agency Replication

**Effective:** 2026-06-02  
**Replaces:** Previous "platform-first" framing  
**Scope:** Repository-wide priority for all agents and sessions

---

## The Goal

Transform Opsly from a multi-tenant platform into a **founder-mode business model** by:

1. **Peskids** — Make it a live, revenue-generating, zero-downtime product
2. **Blueprint** — Extract Peskids as a reusable, step-by-step template
3. **Agency** — Distribute the Blueprint as the core distribution channel (not a new platform)

**Success metrics:**
- Peskids go-live (measurable: uptime, users, revenue)
- Blueprint documented (measurable: someone else can replicate Peskids)
- Agency model validated (measurable: leads captured → converted via Blueprint)

---

## Why This Replaces "Platform-First"

### Old Model (Platform-First)
```
Platform (Opsly core) → Multiple products bolted on
  ├─ Automation (n8n stacks)
  ├─ Shield (Guardian Grid)
  ├─ Peskids (incubated)
  ├─ Local Services (experiment)
  └─ Agency Division (aspirational)

Problems:
- Platform complexity grows unbounded
- Each "product" requires platform work
- No clear revenue signal
- Replication not modeled
```

### New Model (Founder-Mode)
```
Peskids (live case study) → Blueprint (reusable template) → Agency (distribution)
  ├─ Everything serves the live case
  ├─ Blueprint makes it repeatable
  ├─ Agency channels the replication
  └─ Platform stays simple (Compose, no K8s)

Benefits:
- Single, measurable success metric (Peskids revenue)
- Blueprint forces operational clarity
- Agency distribution is the business model
- Platform work only if it unblocks the above
```

---

## The Decision Gate (Every Branch, Every Task)

**Before creating a branch or starting work, ask in this order:**

```
Q1: Does this help Peskids go live?
    → YES: Proceed. (go-live metrics: uptime, users, revenue)
    → NO: Go to Q2

Q2: Does this make Blueprint replicable?
    → YES: Proceed. (Blueprint metrics: docs, template extraction, clear steps)
    → NO: Go to Q3

Q3: Does this measure lead capture/conversion?
    → YES: Proceed. (Agency metrics: leads, conversion rate, MRR)
    → NO: STOP. Don't do this work.
```

**If you answer NO to all three: escalate to Founder. Do not branch.**

---

## Hard Rules (Non-Negotiable)

### Infra/Architecture
- ✗ **No Kubernetes, Swarm, or Terraform** — Docker Compose only
- ✗ **No multi-cloud or multi-region as a feature** — single VPS until revenue validates scaling
- ✗ **No new platform modules** — reuse existing lib/, don't build abstractions for hypotheticals

### Products/Services
- ✗ **No new product lines** — focus is Peskids → Blueprint → Agency
- ✗ **No new marketplaces, autonomous agents, or AI memory systems**
- ✗ **No SDKs/APIs that don't serve lead capture or conversion**

### Scope Boundary
- ✗ **Refactoring unrelated to the three goals** — no cleanup PRs, no tech debt sprints
- ✗ **"Nice to have" platform work** — if it doesn't unblock Peskids/Blueprint/Agency, defer it
- ✗ **Ambiguous features** — if you can't clearly tie it to a goal, ask Founder first

### Examples of What to Reject

| Task | Reason | Action |
|------|--------|--------|
| "Upgrade Tailwind to v4" | Not tied to goal | Defer unless blocking |
| "Add new MCP tool for X" | Platform bloat | Only if Peskids/Blueprint needs it |
| "Implement multi-tenant billing v2" | Premature scaling | Wait for revenue signal |
| "Refactor orchestrator for clarity" | Not goal-tied | Reject (unless Peskids depends on it) |
| "Setup Kubernetes for future scale" | Hard rule violation | NEVER — escalate if proposed |

---

## What Gets Prioritized

### Tier 1: Peskids Go-Live Blockers
- Production uptime (SLA, monitoring)
- Revenue collection (Stripe, invoicing, accounts)
- User experience (signup, activation, onboarding)
- Go-live checklist items

### Tier 2: Blueprint Clarity
- Documentation of Peskids architecture
- Step-by-step extraction guide
- Template for replication (config, migrations, prompts)
- Clear definition of "minimum viable tenant"

### Tier 3: Agency Model
- Lead capture (web form, email/WhatsApp routing)
- Lead conversion (sales agent, ops agent)
- Measurement (CRM, conversion funnel)
- Replication playbook (how to run the same model for new clients)

### Everything Else
- **Deferred** unless it directly unblocks one of the three tiers

---

## Session/Branch Rules

### One Branch = One Theme
- **Peskids branch** (`peskids/*`) — only go-live work
- **Blueprint branch** (`blueprint/*`) — only extraction/docs
- **Agency branch** (`agency/*`) — only lead capture/conversion
- **Docs branch** (`docs/*`) — only rules/AGENTS.md updates

**Do NOT mix themes.** Don't do "Peskids feature + Agency docs + random refactor" in one branch.

### Commit Message Format
```
{type}({scope}): {description}

{body}

Contributes to: peskids|blueprint|agency
```

**Enforce in CI:** Commits without "Contributes to:" tag are flagged.

### PR Description Must Explain Contribution
- Don't just describe the code change
- Explain how it serves Peskids/Blueprint/Agency
- Justify if it's "prep work" for a later tier

### If Blocked by Goal Ambiguity
- **Stop.** Don't guess.
- Escalate to Founder with context.
- Document the question in AGENTS.md under "🔄 Bloqueantes"

---

## Roles & Accountability

| Role | Responsibility |
|------|-----------------|
| **Founder** | Final call on goal alignment, priority disputes, scope boundaries |
| **Agent/Session** | Check decision gate before branching; escalate ambiguity; tag commits |
| **Reviewer** | Verify "Contributes to:" tag; question PRs that don't tie to goal |
| **CI/Rules** | Enforce branch naming, commit format, no merge if tag missing |

---

## Tracking Progress

### Peskids Metrics
- [ ] Go-live date (target)
- [ ] Uptime SLA (99%+)
- [ ] Daily active users (target)
- [ ] MRR (monthly recurring revenue)
- [ ] Customer acquisition cost (CAC)

### Blueprint Metrics
- [ ] Extraction 80% complete (docs, template, migration scripts)
- [ ] Can someone unfamiliar run the Blueprint end-to-end? (test)
- [ ] Replication time estimate (hours to go from template → live tenant)

### Agency Metrics
- [ ] Lead capture funnel operational (form → email/WhatsApp routing)
- [ ] Sales Agent E2E tested (10+ leads simulated)
- [ ] Conversion rate tracked (leads → meetings → contracts)
- [ ] Replication playbook documented

---

## When to Deviate

**If you believe this goal is wrong or blocking something critical:**
1. Document your concern in AGENTS.md under "🔄 Bloqueantes"
2. Tag the Founder with context and rationale
3. Do NOT work around the goal; escalate explicitly

**Example:**
```
## 🔄 Bloqueantes

**Goal alignment question (2026-06-02):**
- Issue: Peskids needs Redis optimization to meet uptime SLA
- Current rules block "platform refactoring"
- Question: Does infrastructure optimization count as "unblocking Peskids"?
- Escalate to: Founder
```

---

## References

- **Session instructions:** `.claude/CLAUDE.md` — SESSION STARTUP section
- **Session rules:** `.cursor/rules/git-workflow.mdc` — FOUNDER MODE GATE section
- **Peskids case study:** `docs/tenants/peskids/` — go-live docs
- **Blueprint template:** `docs/blueprints/` — extraction guide
- **Agency playbook:** `docs/agency/` — replication steps

---

**Last updated:** 2026-06-02  
**Next review:** After Peskids go-live decision

EOF

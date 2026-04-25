---
status: canon
owner: product
last_review: 2026-04-24
---

# Opsly: The Autonomous DevOps Agent

## What we're building

Opsly is the first DevOps agent that operates your infrastructure without supervision.

Connect it to your stack. It monitors what's running, fixes what breaks, scales what needs scaling, deploys what you push, and reports back only when something needs your attention. While you sleep, it works.

## Why this exists

Every founder running a SaaS at 5-50 people knows the moment: it's 2am, something broke in production, you wake up to fix it. Or you don't, and you wake up to angry customers.

The current solutions don't fit:

- **Hire a DevOps engineer** ($120K+/year). Most startups can't afford this.
- **Outsource to a DevOps agency** ($5-15K/month). Slow, transactional, doesn't learn your stack.
- **Use monitoring tools** (Datadog, PagerDuty). They tell you something broke. They don't fix it.
- **Use AI chatbots** (Resolve.ai, RunWhen). They suggest commands. You still execute them at 2am.

Opsly is different. It doesn't suggest. It operates.

## How it works

Opsly is an OAR (Plan-Execute-Reflect) orchestrator with three layers:

1. **Perception**: Connects to your infrastructure (VPS, Kubernetes, Docker, n8n, databases, monitoring tools) via secure agents.
2. **Decision**: Hybrid LLM routing — local Llama for routine decisions, cloud models (Haiku, Sonnet, GPT-4o) for critical ones. 90% of decisions are rule-based and free; 10% use LLMs with cost budgets per tenant.
3. **Action**: Executes via existing tools (Docker, Terraform, Ansible, custom scripts). Every action is logged, reversible, and explainable.

The agent has bounds:
- Low-risk actions (restart container, scale replica, rotate logs): autonomous
- Medium-risk (deploy, schema migration): autonomous with audit trail
- High-risk (delete data, change billing, modify auth): requires human approval

## Who it's for

**Indie hackers and side-project founders** running 1-3 services who don't want to wake up to alerts.

**Solo technical founders** running 5-15 services who can't justify a DevOps hire yet but lose hours every week to ops tasks.

**Small SaaS teams** (5-50 people) who want to outsource operations without an agency, and need an SLA-backed solution that's not a black box.

## Why we can build this

The orchestration substrate already exists in production. We use it to operate this very platform — every PR you see in this repo was provisioned, deployed, and verified by the same agent we're commercializing. The codebase is the demo.

Three technical advantages that compound:

1. **Hybrid LLM routing keeps costs 80% lower than competitors** that route everything to GPT-4. Most decisions are rule-based; LLMs are escalation, not first response.

2. **OAR with feedback loop** means the agent learns your stack over time. Decisions become more accurate, escalations decrease, MTTR drops.

3. **Open architecture**. n8n today, Kubernetes tomorrow, custom integrations always. We're not locked into any single tool category.

## What we're NOT

- We're not a managed n8n hosting service. (We use n8n; we don't sell n8n.)
- We're not an AI assistant for DevOps engineers. (We replace much of the role for early-stage teams.)
- We're not a monitoring tool. (We act on monitoring data; we don't generate dashboards as the product.)
- We're not enterprise-grade today. (We're focused on the underserved indie/SMB segment first.)

## Roadmap directions

See `ROADMAP.md` for current quarterly plans. The strategic vectors are:

1. **Deepen autonomy**: more action types, more verification before action, better rollback
2. **Expand integrations**: beyond n8n/Docker to Kubernetes, Terraform, common SaaS APIs
3. **Improve explainability**: every action traceable to a reason, viewable as a timeline
4. **Reduce cost-to-serve**: more local LLM, smarter caching, cheaper inference

## How we measure success

Not in features shipped. In:

- **Hours of human ops work prevented per tenant per month** (target: 20+)
- **MTTR reduction vs baseline** (target: 50%+ in 90 days)
- **% of incidents resolved without human intervention** (target: 70% within 6 months)
- **Cost-to-serve per tenant** (target: <15% of revenue)

## Status

In production. Operating real infrastructure (smiletripcare, peskids, intcloudsysops). External pilot tenants in onboarding (LocalRank).

This is the canon vision document. For current operational state, see `AGENTS.md`. For execution detail, see `SPRINT-TRACKER.md`. For roadmap, see `ROADMAP.md`.

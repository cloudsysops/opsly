---
status: canon
owner: operations
updated: 2026-05-08T14:45:00Z
---

# Opsly Documentation Hub

**Source of truth for all operational, technical, and product information.**

Quick jump to what you need:

---

## 🚀 Getting Started

- **[README.md](README.md)** — This file. Start here.
- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** — Cheatsheet: SSH, commands, env vars
- **[VISION.md](../VISION.md)** — Product north star + roadmap

---

## 📊 Current Status

- **Production:** 🟢 GREEN (API 200 OK, all services healthy)
- **Deployments:** Last: 2026-05-08 (VPS via Tailscale)
- **Cost:** $1,050/month (baseline), -15% optimization identified
- **Coverage:** 23.3% (tests), 70%+ target

View real-time status: See [AGENTS.md](../AGENTS.md)

---

## 🔧 Operations (How-To Guides)

### Runbooks (Step-by-Step)

| Document | Use When |
|----------|----------|
| [OPERATIONS-HANDBOOK.md](runbooks/OPERATIONS-HANDBOOK.md) | Daily operations, health checks, escalation |
| [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md) | 🆕 Something is broken — find solution here |
| [VPS-DEPLOYMENT-2026-05-08.md](runbooks/VPS-DEPLOYMENT-2026-05-08.md) | How we deployed to production |
| [SUPER-AGENT-SHADOW-DEPLOY.md](runbooks/SUPER-AGENT-SHADOW-DEPLOY.md) | Deploy Super Agent (experimental) |

### Guides (Deep Dives)

| Document | Purpose |
|----------|---------|
| [DATABASE-OPERATIONS.md](database/DATABASE-OPERATIONS.md) | SQL, migrations, Supabase management |
| [REDIS-QUEUE-GUIDE.md](infrastructure/REDIS-QUEUE-GUIDE.md) | Job queue, worker management |
| [COST-MONITORING-GUIDE.md](operations/COST-MONITORING-GUIDE.md) | Track, forecast, optimize costs |
| [SECURITY-POSTURE-AUDIT.md](security/SECURITY-POSTURE-AUDIT.md) | Security findings + remediations |
| [WORKER-SETUP-MAC2011.md](WORKER-SETUP-MAC2011.md) | Run agents on remote worker |

---

## 🔍 Audits & Analysis (May 2026)

**Comprehensive audits covering code, DB, tests, performance, security, and costs.**

Location: `docs/audits/`

| Document | Find |
|----------|------|
| [CODE-REVIEW-API-ROUTES.md](audits/CODE-REVIEW-API-ROUTES.md) | 50 API routes analyzed, validation gaps (48 missing) |
| [DATABASE-QUERY-AUDIT.md](audits/DATABASE-QUERY-AUDIT.md) | 1 N+1 pattern, 6 unfiltered queries, missing indexes |
| [TEST-COVERAGE-BASELINE.md](audits/TEST-COVERAGE-BASELINE.md) | 23.3% coverage, admin 0%, portal 5.4% (CRITICAL) |
| [LINT-RULES-GUIDE.md](audits/LINT-RULES-GUIDE.md) | ESLint gaps, migration plan |
| [DOCKER-OPTIMIZATION.md](audits/DOCKER-OPTIMIZATION.md) | 60-70% image size reduction potential |
| [PERFORMANCE-BOTTLENECK-ANALYSIS.md](audits/PERFORMANCE-BOTTLENECK-ANALYSIS.md) | 3 critical patterns (10-300x improvement) |
| [SECURITY-INPUT-VALIDATION-AUDIT.md](audits/SECURITY-INPUT-VALIDATION-AUDIT.md) | 41/43 routes without validation (CRITICAL) |
| [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md) | Per-tenant breakdown, -15% savings potential |

**Summary:** 89 issues identified (26 critical, 40 important, 23 nice-to-have)  
**Remediation:** 18-27 hours work planned

---

## 🏗️ Architecture & Design

### Decision Records (ADRs)

View all: `docs/adr/`

Key decisions:
- **ADR-009:** MCP agent tooling
- **ADR-011:** BullMQ orchestration
- **ADR-025:** NotebookLM integration
- **ADR-027:** Hybrid compute plane (K8s, future)
- **ADR-028:** Agent routing (current blocker, resolved)

### Technical Specs

| Document | Topic |
|----------|-------|
| [OPENCLAW-ARCHITECTURE.md](OPENCLAW-ARCHITECTURE.md) | LLM Gateway, routing, cost tracking |
| [IMPLEMENTATION-IA-LAYER.md](IMPLEMENTATION-IA-LAYER.md) | TypeScript routes, actual file locations |
| [KNOWLEDGE-SYSTEM.md](KNOWLEDGE-SYSTEM.md) | NotebookLM + Obsidian for agents |
| [AGENTS-GUIDE.md](AGENTS-GUIDE.md) | Multi-agent orchestration conventions |

---

## 💰 Financial & Growth

| Document | Use For |
|----------|---------|
| [COST-MONITORING-GUIDE.md](operations/COST-MONITORING-GUIDE.md) | Daily/weekly/monthly cost tracking |
| [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md) | Per-tenant analysis + optimization roadmap |
| [ROADMAP.md](../ROADMAP.md) | Product timeline, milestones, releases |

**Current:** $1,050/month (infrastructure $50 + operational $50 + AI $950)  
**Target:** $900/month (-15% via token limits, caching, model selection)

---

## 🛠️ Development & Debugging

### Setup & Configuration

- **[SESSION-GIT-SYNC.md](SESSION-GIT-SYNC.md)** — Git workflow before editing
- **[ACTIVE-PROMPT.md](ACTIVE-PROMPT.md)** — Optional: auto-execute shell commands from file

### Debugging

- **[TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)** — Symptom → solution tree
- **[TECHNICAL-DEBT.md](TECHNICAL-DEBT.md)** — Known issues + workarounds (incl. audit npm / deuda moderate)
- **[SYSTEMATIC-DEBUGGING.md]** — Coming soon (skill available)

---

## 📚 How to Use This Wiki

### For Operators
1. Start: [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
2. Daily: [OPERATIONS-HANDBOOK.md](runbooks/OPERATIONS-HANDBOOK.md)
3. Issues: [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)

### For Engineers
1. Start: [VISION.md](../VISION.md) + [IMPLEMENTATION-IA-LAYER.md](IMPLEMENTATION-IA-LAYER.md)
2. Code: Relevant audit (CODE-REVIEW-API-ROUTES.md, DATABASE-QUERY-AUDIT.md, etc.)
3. Issues: [TECHNICAL-DEBT.md](TECHNICAL-DEBT.md) + [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)

### For DevOps
1. Start: [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
2. Infra: [REDIS-QUEUE-GUIDE.md](infrastructure/REDIS-QUEUE-GUIDE.md), [DATABASE-OPERATIONS.md](database/DATABASE-OPERATIONS.md)
3. Costs: [COST-MONITORING-GUIDE.md](operations/COST-MONITORING-GUIDE.md) + [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md)
4. Deploy: [VPS-DEPLOYMENT-2026-05-08.md](runbooks/VPS-DEPLOYMENT-2026-05-08.md)
5. CI: catálogo workflows + **actionlint** — [ops/workflows-index.md](ops/workflows-index.md) (§ Workflow lint)

### For Product/Leadership
1. Vision: [VISION.md](../VISION.md)
2. Status: [AGENTS.md](../AGENTS.md)
3. Roadmap: [ROADMAP.md](../ROADMAP.md)
4. Costs: [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md)

---

## 📋 Full File Index

```
docs/
├─ README.md (this file)
├─ QUICK-REFERENCE.md
├─ TROUBLESHOOTING-GUIDE.md 🆕
├─ TECHNICAL-DEBT.md
├─ OPENCLAW-ARCHITECTURE.md
├─ IMPLEMENTATION-IA-LAYER.md
├─ KNOWLEDGE-SYSTEM.md
├─ AGENTS-GUIDE.md
├─ SESSION-GIT-SYNC.md
├─ ACTIVE-PROMPT.md
├─ WORKER-SETUP-MAC2011.md
│
├─ audits/
│  ├─ CODE-REVIEW-API-ROUTES.md
│  ├─ DATABASE-QUERY-AUDIT.md
│  ├─ TEST-COVERAGE-BASELINE.md
│  ├─ LINT-RULES-GUIDE.md
│  ├─ DOCKER-OPTIMIZATION.md
│  ├─ PERFORMANCE-BOTTLENECK-ANALYSIS.md
│  ├─ SECURITY-INPUT-VALIDATION-AUDIT.md
│  └─ COST-DEEP-DIVE.md
│
├─ runbooks/
│  ├─ OPERATIONS-HANDBOOK.md
│  ├─ VPS-DEPLOYMENT-2026-05-08.md
│  └─ SUPER-AGENT-SHADOW-DEPLOY.md
│
├─ database/
│  ├─ DATABASE-OPERATIONS.md
│  └─ SUPABASE-MIGRATION-AUDIT.md
│
├─ infrastructure/
│  ├─ REDIS-QUEUE-GUIDE.md
│  ├─ DOCKER-OPTIMIZATION.md (linked from audits)
│  └─ TRAEFIK-CONFIG.md
│
├─ operations/
│  ├─ COST-MONITORING-GUIDE.md
│  └─ COST-DEEP-DIVE.md (linked from audits)
│
├─ security/
│  └─ SECURITY-POSTURE-AUDIT.md
│
└─ adr/
   ├─ ADR-009-mcp.md
   ├─ ADR-011-bullmq.md
   ├─ ADR-025-notebooklm.md
   ├─ ADR-027-hybrid-compute.md
   └─ ADR-028-agent-routing.md
```

---

## 🔄 Maintenance

**Wiki updated:** 2026-05-08  
**Next review:** 2026-05-15  
**Owner:** @operations + @architects

To update:
1. Edit relevant `.md` file
2. `git add` + `git commit` + `git push`
3. Update this README if new doc added

---

## Quick Links

- **GitHub:** https://github.com/cloudsysops/opsly
- **Supabase:** https://app.supabase.com
- **Stripe:** https://dashboard.stripe.com
- **Admin Dashboard:** https://admin.ops.smiletripcare.com (Tailscale)
- **API Docs:** Auto-generated from OpenAPI spec (see IMPLEMENTATION-IA-LAYER.md)

---

**Last updated:** 2026-05-08  
**Version:** 2.1  
**Status:** ✅ Active

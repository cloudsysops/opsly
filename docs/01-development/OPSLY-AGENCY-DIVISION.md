---
status: draft
owner: product + engineering
created: 2026-08-04
target_launch: end of week 4 (beta)
---

# Opsly Agency Division — Service Specifications

Three new revenue services launching parallel to agent execution improvements (Q3 2026).

---

## SERVICE 1: API Factory (Starter: $29/mo, Pro: $99/mo)

### Purpose

**What:** Template marketplace + hosted infrastructure for founders to deploy specialized AI agents without code.

**Positioning:** "Deploy an AI ops worker in 3 minutes — no engineering needed"

**Why:** Founders don't want to build agents; they want results. Opsly handles infrastructure, scaling, and reliability.

---

### Service Architecture

```
API Factory
├── Agent Template Registry
│   ├── Pre-built agents (6 starter)
│   ├── Versioning + rollback
│   └── Custom prompt injection
├── Deployment & Hosting
│   ├── Serverless execution (Temporal)
│   ├── Auto-scaling per tier
│   └── Cost metering per request
├── API Gateway
│   ├── Rate limiting per customer
│   ├── Webhook triggers
│   ├── Usage dashboard
│   └── Billing integration (Stripe)
└── Customer Onboarding
    ├── Web UI (Portal)
    ├── Quick-start templates
    ├── API key management
    └── 1:1 onboarding calls
```

---

### Included Agents (MVP)

| Agent | Purpose | Triggers | Cost Model |
|-------|---------|----------|-----------|
| **Content Writer** | Blog posts, email copy, social | Webhook, Schedule | Per request (~$0.02-0.05) |
| **Support Classifier** | Ticket triage, sentiment analysis | Email, Slack, Webhook | Per classification (~$0.01) |
| **Lead Scorer** | CRM lead qualification | Webhook, Scheduled batch | Per scoring (~$0.02) |
| **Data Ingester** | CSV/API → database normalization | Scheduled, Manual upload | Per job (~$0.03-0.10) |
| **Analytics Reporter** | Daily/weekly metrics digest | Schedule | Per report (~$0.05) |
| **Slack Responder** | Auto-response bot (internal use) | Slack channel → Workflow | Per interaction (~$0.01) |

---

### Pricing Tiers

#### Starter — $29/month
- **Quota:** 10,000 requests/month (~330/day)
- **Agents:** 1 deployed agent
- **Features:**
  - Pre-built agents only (no custom prompts)
  - Webhook + schedule triggers
  - Basic usage dashboard
  - Email support (24h response)
- **Target:** Solo founder, light automation
- **Example use:** 1 content writer + manual trigger

#### Pro — $99/month
- **Quota:** 100,000 requests/month (~3,300/day)
- **Agents:** 5 deployed agents
- **Features:**
  - Pre-built + custom prompt injection
  - Webhook + schedule + API triggers
  - Advanced dashboard + analytics
  - Slack integration
  - Priority email support (6h response)
  - Usage alerts
- **Target:** Early-stage startup, multiple workflows
- **Example use:** Content writer + support classifier + lead scorer

#### Enterprise — Custom
- Unlimited requests
- Unlimited agents
- Custom agent development (add $2k-5k per agent)
- White-label option
- Dedicated Slack channel
- Quarterly business review

---

### Onboarding Flow (UX)

```
1. Sign up (email / OAuth)
   ↓
2. Select starter agent
   ↓
3. Configure (basic settings)
   ├─ Webhook URL (optional)
   ├─ Schedule (optional)
   └─ Custom prompt injection (Pro only)
   ↓
4. Deploy (1 click)
   ↓
5. Test (webhook / schedule test)
   ↓
6. Monitor (usage dashboard)
   ↓
7. Upgrade (to Pro / add agents)
```

**Onboarding time goal:** < 3 minutes

---

### API Specification (OpenAPI)

**Base URL:** `https://api.opsly.io/v1`

#### Create Agent Deployment

```typescript
POST /agents
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "name": "my-content-writer",
  "agent_type": "content_writer",        // Enum: content_writer, support_classifier, etc.
  "custom_prompt": "Write in Gen-Z voice", // Pro+ only, optional
  "triggers": [
    {
      "type": "webhook",
      "url": "https://example.com/webhook"
    },
    {
      "type": "schedule",
      "cron": "0 9 * * MON-FRI"
    }
  ],
  "config": {
    "output_format": "markdown",
    "max_length": 2000
  }
}

Response:
{
  "id": "agent_abc123",
  "status": "active",
  "api_key": "ak_xyz789",
  "webhook_secret": "whsec_...",
  "created_at": "2026-08-04T10:00:00Z",
  "usage_url": "https://dashboard.opsly.io/agents/agent_abc123"
}
```

#### Execute Agent

```typescript
POST /agents/{agent_id}/execute
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "input": "Write a tweet about AI automation",
  "context": {
    "brand_voice": "professional",
    "char_limit": 280
  }
}

Response:
{
  "execution_id": "exec_xyz789",
  "status": "completed",
  "output": "Your tweet...",
  "cost": 0.05,
  "duration_ms": 2341,
  "tokens_used": {
    "input": 45,
    "output": 120
  },
  "timestamp": "2026-08-04T10:05:00Z"
}
```

#### Get Usage & Billing

```typescript
GET /usage?period=2026-08
Authorization: Bearer {api_key}

Response:
{
  "period": "2026-08",
  "plan": "pro",
  "quota": 100000,
  "used": 45230,
  "remaining": 54770,
  "agents": [
    {
      "id": "agent_abc123",
      "name": "content-writer",
      "requests": 10234,
      "cost": $10.23
    }
  ],
  "total_cost": $45.23,
  "billing_cycle_ends": "2026-09-04T00:00:00Z"
}
```

---

### Implementation Roadmap

#### Week 3 (by Aug 11)
- [ ] Design Portal pages for API Factory
  - Agent marketplace
  - Deployment form
  - Usage dashboard
- [ ] Define OpenAPI spec (finalize routes)
- [ ] Create database schema (agent_deployments, executions)

#### Week 4 (by Aug 18)
- [ ] Build Portal UI (React components)
- [ ] Implement API routes (create, execute, usage)
- [ ] Integrate with billing (Stripe webhooks, metering)
- [ ] Add webhook signing + security
- [ ] Seed 6 starter agents (prompts + testing)

#### Week 5 (by Aug 25)
- [ ] Beta testing with 5 early customers
- [ ] Documentation + quick-start guide
- [ ] Email onboarding sequence
- [ ] Performance testing (scale to 10k req/day)

---

### Success Metrics (End of Q3)

**Adoption:**
- [ ] 20+ active customers (Starter + Pro mix)
- [ ] 50k+ total requests processed
- [ ] 4.5+ star rating (NPS tracking)

**Revenue:**
- [ ] $600+ MRR (10 customers avg $60/mo)
- [ ] Customer acquisition cost < $50 (via Twitter)
- [ ] 80%+ month-over-month retention

**Product:**
- [ ] < 2s avg execution latency
- [ ] 99.5%+ uptime
- [ ] < 5 support tickets/day

---

## SERVICE 2: Opsly Shield White-Label ($199/mo + 30% rev-share)

### Purpose

**What:** Resellable security operations platform (SOC-in-a-box) for IT consultants and agencies.

**Positioning:** "Bundle Guardian Grid with your services — 70% margin per customer"

**Why:** Consultants want recurring revenue; Opsly wants distribution. Win-win through white-labeling.

---

### White-Label Features

- **Branding:** Custom domain, logo, CSS variables
- **Guardian Grid:** 7 bots monitoring 24/7 (infrastructure, secrets, compliance)
- **Dashboard:** Security score, findings, remediation status
- **Auto-Remediation:** With human approval workflows
- **Alerts:** Webhook + email to partner's customers
- **Commission Tracking:** Partner dashboard showing customer metrics, payouts

### Pricing Model

**Partner:** $199/month (base + infrastructure)  
**Per Customer:** Partner sets own pricing (suggested $299+/mo)  
**Revenue Share:** Partner keeps 70%, Opsly gets 30%

**Example economics:**
- Partner onboards 5 customers @ $399/mo each
- Partner revenue: $1,995 + (5 × $399 × 0.70) = $3,390/mo
- Opsly revenue: 5 × $399 × 0.30 = $598/mo

---

### Implementation (Week 2-5)

- [ ] Extract Shield into multi-tenant white-label module
- [ ] Add partner branding layer (CSS, domain, emails)
- [ ] Build partner commission dashboard
- [ ] Create onboarding documentation for partners
- [ ] Set up Stripe for commission tracking

---

## SERVICE 3: Custom Agent Development ($2k-5k per project)

### Purpose

**What:** Done-for-you AI agent development for founders' unique workflows.

**Positioning:** "Your ops problem, solved by AI in 48 hours"

**Why:** High-touch, high-margin service bridges founders' custom needs with Opsly's platform.

---

### Scope & Pricing

**Small (1-2 weeks): $2k-3k**
- Single agent, focused workflow
- Examples: marketing workflow automation, customer data tagging
- Includes: discovery call, 1 revision round, 30 days support

**Medium (2-4 weeks): $3k-5k**
- 2-3 agents, integration with customer's stack
- Examples: end-to-end lead pipeline, content production + distribution
- Includes: discovery, 2 revision rounds, 90 days support, training call

**Large (4+ weeks): Custom**
- Complex multi-agent systems, custom training data
- Examples: full operations platform, industry-specific solutions
- Includes: ongoing advisory, quarterly reviews

---

### Sales & GTM (Week 1-2)

- **Target:** 50 founder communities (Twitter, Indie Hackers, Makerlog, founder Slack groups)
- **Launch:** "Your ops problem, solved by AI in 48 hours" Twitter thread
- **Case study:** Record 1-2 example projects, publish results
- **Goal:** 2 projects booked by end of week 4

---

## GTM Integration

All three services share:

1. **Unified onboarding** via Portal (single account, multiple services)
2. **Shared billing** (Stripe, usage metering, invoice)
3. **Common dashboard** for usage, costs, support
4. **Messaging:** "Scale operations with AI, not headcount"

### Launch Sequence

| Week | Milestone | Owner |
|------|-----------|-------|
| 1 | Error Classifier merge + Twitter account | Engineering + Marketing |
| 2 | API Factory spec + Shield WL design | Product |
| 3 | API Factory MVP + first blog post | Engineering + Marketing |
| 4 | API Factory beta + custom dev case study | Product |
| 5 | Product Hunt launch (Shield) | Marketing |
| 6 | Twitter Spaces (Autonomous Ops) | Marketing + Community |
| 8 | 20+ customers + 3-5 white-label partners | Sales |

---

## Success Metrics by End of Q3

**API Factory:**
- 20+ customers
- 100k+ total API requests
- $600+ MRR

**Shield White-Label:**
- 3-5 agency partners
- 15-25 end-customer installations
- $800-1.2k MRR

**Custom Development:**
- 2+ projects completed
- $1k MRR (recurring support)

**Combined:**
- **$2.7k-3.1k MRR** (target: $5k by end 2026)
- 20-30 founders actively using Opsly
- 500+ Twitter followers (@OpslyAI)

---

*Related:*
- `STRATEGY-Q3-2026.md` — Full 90-day roadmap
- `docs/00-architecture/AGENT-EXECUTION-IMPROVEMENTS.md` — Technical foundation
- `lib/orchestrator-error-classifier/README.md` — Incremento 1 deliverable

---

*Last updated: 2026-08-04*  
*Next review: 2026-08-11*

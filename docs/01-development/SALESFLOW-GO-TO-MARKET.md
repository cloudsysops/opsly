---
status: canon
owner: product-strategy
last_review: 2026-08-04
type: go-to-market
---

# SalesFlow — Go-to-Market & Launch Strategy

> **Target:** First product to launch from Opsly ecosystem  
> **Timeline:** Q3-Q4 2026  
> **Goal:** $50k ARR, 20 customers, product-market fit signals

---

## Phase 1: Validation (Weeks 1-4)

### Customer Discovery
**20 conversations with sales leaders (2-3 per week)**

- **Targeting:** VP Sales at SaaS companies with 50-500 employees
- **Channels:** LinkedIn, Product Hunt, Sales subreddits, Paul Graham's Y Combinator emails
- **Script:**
  - "How many hours/week do you spend on manual CRM work?"
  - "What's the cost of manual follow-ups falling through cracks?"
  - "Would you pay $X/month for autonomous follow-up that generates pipeline?"

**Output:** 5-10 screenshare sessions with prospects willing to pilot

### Define ICP (Ideal Customer Profile)

From calls, extract:
- **Industry:** B2B SaaS (can add B2B Services, Insurance after)
- **Company size:** 50-200 employees
- **Sales team size:** 5-15 reps
- **Pain:** Manual CRM logging + follow-up urgency
- **Budget:** $5k-$25k/year available in sales tech budget
- **Decision maker:** VP Sales / VP Revenue Ops
- **Use case:** Early stage pipeline (not qualified yet) — where LLM email is less risky

### MVP Scope Locked

**Week 2:**
- Implement Pipedrive OAuth integration (ONLY Pipedrive first; don't build HubSpot yet)
- One prompt template: "friendly follow-up email after 7 days no activity"
- Orchestrator job: "every hour, find stale opportunities, send email"

**Week 3:**
- Portal: dashboard showing "emails sent today", "responses this week"
- Feedback mechanism: "was this email good? yes/no" for each sent email

**Week 4:**
- Internal pilot with Peskids team (use case: follow up stale leads from their referrals)
- Collect first signals: "email open rate", "response rate", "mistakes made"

---

## Phase 2: MVP Launch to Beta Customers (Weeks 5-12)

### Build (Weeks 5-8)

**Team structure:**
- 1 full-stack engineer (Cursor) — frontend + backend
- 1 PM (you) — product, customer calls, positioning
- 1 GTM person (contractor) — outreach, scheduling, demos

**Architecture (reuse Opsly core):**

```
┌────────────────────────────────────────┐
│      SalesFlow API (3000)              │
├────────────────────────────────────────┤
│ POST /api/auth/login                   │ Supabase JWT
│ POST /api/crm/oauth/pipedrive          │ Trigger Pipedrive login
│ GET  /api/opportunities                │ Fetch stale opps from tenant's CRM
│ GET  /api/emails/sent                  │ History of sent emails
│ POST /api/feedback                     │ User marks email good/bad
│ GET  /api/health                       │ Orchestrator health
└────────────────────────────────────────┘
              ↓
         Orchestrator
    ┌──────────────────────┐
    │  BullMQ Job: email   │ Every hour:
    │  1. Query stale opps │ - Read Pipedrive
    │  2. Gen email (LLM)  │ - Filter stale (7+ days)
    │  3. Send via email   │ - Call LLM Gateway
    │  4. Log in Pipedrive │ - Send via Resend
    │  5. Store in DB      │ - Update CRM
    └──────────────────────┘
              ↓
      LLM Gateway (3010)
    ┌──────────────────────┐
    │ Prompt template:     │
    │ "Write friendly      │
    │  follow-up to {name},│
    │  company {co},       │
    │  opportunity {desc}" │
    │                      │
    │ Cache by prospect ID │
    └──────────────────────┘
```

**Database schema (minimal):**
```sql
-- Users & auth (via Supabase)
supabase.auth.users

-- Multi-tenant
create table tenants (
  id uuid primary key,
  slug text unique,
  name text,
  plan text, -- starter, pro, enterprise
  created_at timestamp
);

-- Pipedrive connection
create table crm_credentials (
  id uuid primary key,
  tenant_id uuid references tenants,
  service text, -- 'pipedrive'
  access_token text, -- encrypted
  refresh_token text,
  expires_at timestamp,
  created_at timestamp
);

-- Sent emails (for analytics)
create table sent_emails (
  id uuid primary key,
  tenant_id uuid references tenants,
  opportunity_id text, -- Pipedrive ID
  email_to text,
  subject text,
  body text,
  status text, -- 'sent', 'bounced', 'opened', 'clicked', 'replied'
  sent_at timestamp,
  feedback text, -- 'good', 'bad', null
  created_at timestamp
);

-- Email templates (prompt variations)
create table email_templates (
  id uuid primary key,
  tenant_id uuid references tenants,
  name text, -- "friendly_followup"
  prompt text,
  active boolean,
  created_at timestamp
);
```

**Stripe products (Billing):**
```
Product: SalesFlow
├─ Price: Starter ($499/month)
│  └ feature_tier: starter
│     │ - 1 sales agent
│     │ - 100 emails/month
│     │ - Basic analytics
│
├─ Price: Pro ($1,999/month)
│  └ feature_tier: pro
│     │ - 5 agents
│     │ - 2,000 emails/month
│     │ - Advanced analytics
│
└─ Price: Enterprise (custom)
   └ contact sales
```

Usage-based add-on (future):
```
Price: $0.05 per email above plan limit
```

### Launch to Beta (Weeks 9-12)

**Week 9: Close first 5 beta customers**
- Offering: 50% discount for 3 months ($250/mo) + direct Slack with PM
- In exchange: weekly call, detailed feedback, case study if successful
- Targeting: Companies we talked to in validation phase

**Selection criteria:**
- Already using Pipedrive (no migration required)
- Sales team <20 people (easier to get buy-in)
- 1 decision maker (PM or VP Sales can decide without committee)
- Willing to let us see their Pipedrive data (for evaluation)

**Launch playbook (per customer):**
1. Week 9: Send SalesFlow login link + Pipedrive OAuth link
2. Day 1: Sync their opportunities; show "X stale opportunities found"
3. Day 2: Send first batch of emails (sample, for approval before production)
4. Day 3: Collect feedback: "is this email good?" 
5. Day 5-30: Monitor metrics: open rate, response rate, rep satisfaction

**Metrics to track per customer:**
- Opportunities processed (how many stale opps)
- Emails sent
- Opens (via tracking pixel)
- Responses (from Pipedrive)
- Rep feedback (NPS)
- Churn rate (customer drops out)

**Success criteria:**
- >40% open rate on emails (vs industry baseline ~15%)
- >5% response rate
- >80% rep feedback positive
- 0% churn (customers continue after 3-month trial)

### Beta Pricing & Economics

**Cost per customer:**
- LLM: ~$2 per prospect email (Anthropic API)
- Email sending: ~$0.001 per email (Resend)
- Infrastructure: ~$50/month fixed orchestrator cost / N customers
- → At 100 emails/month per customer: $0.20 + $0.01 + $0.50 = **$0.71 per email**

**Beta pricing:** $250/month → $2.50 per email budget (3x margin)

---

## Phase 3: Product-Market Fit Signals (Weeks 13-24)

### Iterate on Feedback

**Weekly customer calls:** Ask each beta customer:
1. Are your reps actually using emails we generate?
2. What's wrong with them?
3. Would you keep paying full price ($499)?
4. What feature would make it 10x better?

**Expected feedback patterns:**
- "Emails are too generic" → Add personalization (company size, industry)
- "Wrong deals selected" → Better filtering (by stage, probability)
- "Follow-ups at wrong time" → Smart timing (when sales team is active)
- "Need HubSpot too" → Add CRM #2

**Product decisions (lock fast):**
- Week 15: Decide whether to keep email templates customizable or AI-only
  - If customers want control: Add UI template editor
  - If customers like AI-only: Lock UI, iterate prompts instead
  
- Week 18: Decide whether to add HubSpot
  - If 3+ prospects ask: Build it (4 weeks)
  - If 0-1: Skip, focus on Pipedrive depth instead

### Build Toward $50k ARR Target

**Conversion funnel (12-month):**
```
Inbound traffic: 200/month
    ↓
Free trial signup: 20/month (10% conversion)
    ↓
Demo scheduled: 5/month (25% of signups)
    ↓
Purchase: 1/month (20% of demos)
    ↓
Annual ARR: 12 customers × $500 avg = $6k

**Target:** 100 customers × $500 = $50k ARR
→ Requires: 12 months × 12 purchases/month = scaling purchase rate 12x
```

**How to scale purchase rate:**
1. **Improve product** (reduce churn, increase NPS) — makes viral feedback better
2. **Improve positioning** (speak the language of VP Sales, not AI enthusiasts) — better targeting
3. **Add features** (HubSpot, templates, analytics) — more reasons to stay

---

## Phase 4: Positioning & Messaging (Weeks 1-24)

### Core Narrative

**NOT:** "AI sales assistant that writes emails"  
**NOT:** "Stripe for sales automation"

**YES:** "Sales operations that actually scales"

**Key message:**
- Your best reps do $X/year
- 30% of their time is admin (CRM, email, followup)
- If you recovered that time, each rep does +$300k/year
- SalesFlow does that admin automatically
- Cost: $500/month per agent (1 FTE saves ~$120k/year)

**Proof points:**
- "40+ sales leaders tested it; 80% kept it"
- "Handles 2,000 follow-ups/month per customer"
- "Opens rates 3x industry average"
- "Integrates with your CRM in 2 minutes"

### Content Marketing (Win Conversations)

**Launch content (Weeks 13-16):**
1. Blog: "The hidden cost of manual sales" (SEO for "sales automation")
2. Short case study: "How [Beta customer] reclaimed 4 hours/week"
3. Twitter thread: "Sales ops should be a machine, not a person"
4. LinkedIn article: "Why your Pipedrive isn't getting the job done"

**Channel strategy:**
- **Organic:** Twitter + LinkedIn (VP Sales lurks there)
- **Paid:** Google Ads ("sales follow-up automation") + LinkedIn ads
- **Viral:** Product Hunt ("autonomous sales ops")
- **SMB:** Review sites (G2, Capterra) after 20 customers

### Pricing Strategy (Weeks 17-24)

**Beta pricing:** $250/mo (50% off)  
**GA pricing:** $499/mo (Starter)

**Why this price?**
- Comparable to Pipedrive add-ons ($300-500)
- Cheaper than 1 FTE ($120k/year = $10k/month)
- Suggests quality (Zapier is $200 - we're "premium automation")

**Packaging:**
- **Starter ($499):** 1 agent, 100 emails/month
  - Target: Startups, single sales leader testing
  - Usage: 1 rep using SalesFlow
  
- **Pro ($1,999):** 5 agents, 2k emails/month, templates
  - Target: Growth-stage companies, sales teams 5-15
  - Usage: Multiple reps, different strategies
  
- **Enterprise ($5k+):** Unlimited, custom integrations
  - Target: Public companies, sales ops teams
  - Usage: Corporate sales army

---

## Phase 5: Metrics to Track

### Product Metrics

| Metric | Target (Month 6) | Target (Month 12) | How to measure |
|--------|------------------|-------------------|----------------|
| Beta customers | 5 | 20 | Active in Stripe |
| Monthly active tenants | 100% retention | 80% | Portal logins |
| Emails sent/month | 500 | 40,000 | DB count |
| Email open rate | 40% | 35% | Tracking pixel |
| Email response rate | 5% | 4% | CRM integration |
| Customer NPS | 45+ | 55+ | Quarterly survey |
| Churn rate | 0% (beta) | <5%/month | Cohort analysis |

### Business Metrics

| Metric | Target (Month 6) | Target (Month 12) |
|--------|------------------|-------------------|
| ARR | $25k | $50k |
| MRR | $2.1k | $4.2k |
| Customers | 15 | 50 |
| CAC | $500 | $800 |
| LTV (36mo) | $6,000 | $10,000 |
| CAC payback | 3 months | 4 months |
| Gross margin | 65% | 75% |

### Customer Metrics

| Metric | Target |
|--------|--------|
| Days to value | <1 day (first emails sent) |
| Onboarding completion | >95% (connected CRM) |
| Feature adoption | >80% (sent ≥1 email) |
| CSAT | >85% |
| Renewal rate (year 1) | >95% |

---

## Phase 6: Launch Materials

### Sales One-Pager

```
SalesFlow — Sales Operations as a Service

THE PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your best reps close deals. But 30% of their time?
CRM logging. Email writing. Follow-up management.

That's 300 hours/year/rep at $150/hr = $45k lost.

THE SOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SalesFlow is an AI agent that handles sales admin.

1. Reads your Pipedrive (or HubSpot)
2. Finds deals that need follow-up
3. Writes personalized emails
4. Logs results back to CRM

Result: Your team gets 4 hours/week back. Pipelines stay warm.

THE PROOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 40 sales leaders tested it
• 80% chose to pay after free trial
• 40% email open rate (vs 15% industry)
• 2,000 follow-ups/month per customer

PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Starter: $499/mo (1 agent, 100 emails/mo)
Pro: $1,999/mo (5 agents, 2k emails/mo)
Enterprise: Custom

Try free for 14 days → No credit card needed
```

### Demo Script (15 minutes)

```
[0:00-1:00] Hook
"Most VP Sales will tell you that 30% of their time 
is wasted on CRM admin. Let me show you how to get 
that time back."

[1:00-5:00] Login + Sync
"First time, connect your Pipedrive. Takes 30 seconds.
[Show OAuth, choose account, select a few opportunities]
Now SalesFlow has context about your deals."

[5:00-8:00] Show Dashboard
"Here's what SalesFlow found:
- 47 opportunities haven't been touched in 7+ days
- Revenue at risk: $2.1M
- We recommend following up on 15 high-probability ones
[Click to see]"

[8:00-12:00] Show an Email
"Here's an email SalesFlow wrote for one of these deals.
[Read it aloud]
Notice: specific to the company, references their product,
suggests next step.

You can approve, reject, or edit. Your edits teach SalesFlow."

[12:00-14:00] Results
"After sending batch like this:
- 40% open rate
- 5% response rate
- 1 meeting booked

All logged back to Pipedrive automatically. Your team sees it."

[14:00-15:00] CTA
"Want to try on your data? [Offer 14-day free trial]
We'll set it up today, your team uses it tomorrow."
```

---

## Appendix: Customer Acquisition Channels

### Direct Outbound (Best CAC)

1. **LinkedIn Sales Navigator**
   - Search: "title:VP Sales OR title:Sales Manager" + "SaaS"
   - Message: "Hey [name], quick question: how many hours/week on CRM vs selling?"
   - Volume: 5 conversations/day = 25/week = 100/month
   - Conversion: 5% → 5 demos/month = 1 customer
   - CAC: $200 (1 month AE salary / 5 customers)

2. **Referral (Best LTV)**
   - Every new customer gets: $200 credit for each referral closed
   - Incentivizes customers to refer peers
   - Target: 20% of new customers via referral by month 12

### Inbound (Best LTV)

3. **SEO for "sales automation"**
   - 2,000 monthly searches globally
   - Target: Top 3 ranking for "sales follow-up automation"
   - Timeline: 6 months (need authority)
   - Volume: 10-50 organic visits/week
   - Conversion: 1% → 1 customer/month

4. **Product Hunt**
   - Launch: Week 20 (when product is clearly better than competitors)
   - Goal: #1 Product of the Day (traffic spike, press coverage)
   - Expected: 500-1,000 signups, 2-5% conversion = 10-50 customers

### Paid (Highest CAC, necessary at scale)

5. **Google Ads (search)**
   - Keywords: "sales automation", "CRM follow-up", "sales ops tool"
   - Budget: $2,000/month
   - Expected: 100 clicks ($20 CPC), 2 conversions/month
   - CAC: $1,000

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM emails are bad | Customers churn | Beta test with 5 customers first, iterate prompts |
| API rate limits (Pipedrive) | Can't scale | Pre-fetch opportunities daily, cache aggressively |
| Competitor launches similar | Price pressure | Be 3 months ahead; differentiate on accuracy + reliability |
| Churn if CRM changes | Loss of revenue | Monitor CRM API changes, maintain 2+ CRM adapters |
| Sales team doesn't use feature | Product adoption fails | Integrate feedback mechanism; show impact in CRM |

---

## Decision Gates

### Gate 1 (Week 4): Are we solving a real problem?

**Criteria:**
- 5+ prospects express interest in free trial
- Each says "this would save me time" or "this would find deals I miss"
- No competitor offers exactly this

**Decision:** Go / No-Go to Phase 2

### Gate 2 (Week 12): Is the MVP working?

**Criteria:**
- 5 beta customers active
- >30% email open rate (vs 15% baseline)
- >2% response rate
- >70% customers say they'd pay
- No critical bugs in production

**Decision:** Go / No-Go to Phase 3

### Gate 3 (Week 24): Do we have product-market fit?

**Criteria:**
- 20+ customers (vs 5 beta)
- >50% monthly retention
- >80% customer NPS
- >$25k ARR (vs $5k if starting from scratch)
- Sales cycle < 30 days (not >60)
- <10% churn/month

**Decision:** Scale via paid ads (SEM) / Launch phase 2 product (HelpMind)

---

**Next Step:** Approve this roadmap, assign team, lock Week 1 customer calls.

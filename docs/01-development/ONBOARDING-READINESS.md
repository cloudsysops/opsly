---
status: draft
owner: operations
version: 1.0
---

# Opsly Onboarding — System Readiness Matrix

**Date:** 2026-06-10  
**Assessment:** Based on Peskids + ICSO implementations

---

## EXECUTIVE SUMMARY

```
┌────────────────────────────────────────────────────────────┐
│ ONBOARDING READINESS: 73% (MVPD — Minimum Viable)         │
│                                                            │
│ Can onboard new client: YES                               │
│ Automation level: 60% automatic, 40% manual               │
│ Estimated time: 3-5 business days                         │
│ Known blockers: GHL UI templates, n8n OAuth setup         │
│                                                            │
│ Recommendation: PROCEED with next client using playbook   │
└────────────────────────────────────────────────────────────┘
```

---

## COMPONENT READINESS MATRIX

### 1. INFRASTRUCTURE

| Item | Status | Ready | Notes |
|------|--------|-------|-------|
| **Multi-tenant database** | ✅ READY | YES | Supabase schema per tenant, RLS working |
| **API provisioning endpoints** | ✅ READY | YES | `/api/provisioning/*` fully implemented |
| **Docker Compose isolation** | ✅ READY | YES | Per-tenant Compose files, networking isolated |
| **Doppler secrets** | ✅ READY | YES | Centralized, audit trail, rotation ready |
| **Redis orchestration** | ✅ READY | YES | BullMQ queues, persistent state |
| **Webhook receivers** | ✅ READY | YES | GHL, n8n, Stripe endpoints implemented |
| **Health monitoring** | ✅ READY | YES | Datadog integration, alerting configured |

**Status: 🟢 READY (100%)**

**Automation:** 100% automatic (scripts/CLI)

**Manual effort:** 5 min (review config)

**Time to onboard:** 30 min

**Blockers:** None

---

### 2. GOHIGHLEVEL INTEGRATION

| Item | Status | Ready | Notes |
|------|--------|-------|-------|
| **API client library** | ✅ READY | YES | `@intcloudsysops/services/gohighlevel` complete |
| **Contact creation** | ✅ READY | YES | Webhook receiver, multi-tenant isolation |
| **Tag provisioning** | ✅ READY | YES | API script creates tags automatically |
| **Custom field provisioning** | ✅ READY | YES | API script creates fields, schema validated |
| **Calendar provisioning** | ✅ READY | YES | API script creates calendars, schedule rules |
| **Pipeline provisioning** | ✅ READY | YES | API script validates stages |
| **Form provisioning** | ⚠️ PARTIAL | PARTIAL | Form creation needs UI; form schema in API |
| **Email templates** | ❌ MANUAL | NO | Must create in GHL UI, specs in manifest |
| **SMS templates** | ❌ MANUAL | NO | Must create in GHL UI, specs in manifest |
| **Workflows** | ❌ MANUAL | NO | Must create in GHL UI, specs documented |
| **Webhook integration** | ✅ READY | YES | Receiver endpoint, idempotency, logging |

**Status: 🟡 PARTIAL (60%)**

**Automation:** 60% automatic (API provisioning)

**Manual effort:** 90 min (templates + workflows in UI)

**Time to onboard:** 2 hours

**Blockers:**
- [ ] GHL private integration creation (30 min client-side)
- [ ] GHL API key setup (requires client auth)
- [ ] Email/SMS template creation (no API available)
- [ ] Workflow drag-and-drop setup (no API export/import)

---

### 3. N8N AUTOMATION

| Item | Status | Ready | Notes |
|------|--------|-------|-------|
| **Docker Compose setup** | ✅ READY | YES | Per-tenant instance, auto-scaling ready |
| **Multi-tenant isolation** | ✅ READY | YES | Separate DB per tenant |
| **Webhook receiver** | ✅ READY | YES | Endpoint for lead intake, execution logging |
| **Execution logging** | ✅ READY | YES | Stored in tenant schema, searchable |
| **Workflow templates (catalog)** | ❌ MISSING | NO | Specs exist, but no importable templates |
| **OAuth pre-configuration** | ❌ MANUAL | NO | Each provider requires separate setup |
| **Workflow builder** | ✅ READY | YES | n8n UI available, but requires expertise |
| **Error handling** | ✅ READY | YES | Slack notifications, retry logic |
| **Data mapping** | ⚠️ PARTIAL | PARTIAL | Framework ready, field names customizable |

**Status: 🟡 PARTIAL (50%)**

**Automation:** 50% automatic (Docker, isolation)

**Manual effort:** 30 min (OAuth + starter workflow import)

**Time to onboard:** 1 hour

**Blockers:**
- [ ] OAuth credentials setup (per integration: Stripe, Gmail, etc.)
- [ ] Workflow template availability (need catalog)
- [ ] Workflow customization approval (requires client review)
- [ ] Custom connector development (if client needs unique step)

---

### 4. PORTAL & DASHBOARD

| Item | Status | Ready | Notes |
|------|--------|-------|-------|
| **Onboarding UI (step-1)** | ✅ READY | YES | Client info collection, validation |
| **Onboarding UI (step-2)** | ✅ READY | YES | API config, GHL credentials, n8n setup |
| **Authorize deployment** | ✅ READY | YES | One-click Docker Compose start |
| **Tenant dashboard** | ✅ READY | YES | Overview, recent activity, API usage |
| **API key management** | ✅ READY | YES | Generate, rotate, revoke keys |
| **Invite system** | ✅ READY | YES | Email-based invites, role assignment |
| **Role-based access control** | ✅ READY | YES | Admin, developer, viewer roles |
| **Billing page** | ✅ READY | YES | Subscription, usage, invoices |
| **Settings** | ✅ READY | YES | Domain, webhook URLs, integrations |
| **Help center** | ⚠️ PARTIAL | PARTIAL | Playbook exists, needs client-facing docs |

**Status: 🟢 READY (90%)**

**Automation:** 100% automatic (no manual UI setup)

**Manual effort:** 5 min (send invite link)

**Time to onboard:** 10 min

**Blockers:** None

---

### 5. BILLING & REVENUE

| Item | Status | Ready | Notes |
|------|--------|-------|-------|
| **Stripe integration** | ✅ READY | YES | Customer creation, subscription API |
| **Subscription API** | ✅ READY | YES | Create, update, cancel subscriptions |
| **Invoice generation** | ✅ READY | YES | Auto-generated, sent to customer email |
| **Payment method handling** | ✅ READY | YES | Stripe Elements, 3D Secure support |
| **Usage tracking** | ✅ READY | YES | Contact count, API calls metered |
| **Billing onboarding email** | ⚠️ PARTIAL | PARTIAL | Template exists, needs per-client customization |
| **Multi-currency** | ❌ MISSING | NO | USD only, needs implementation |
| **Usage-based metering** | ⚠️ PARTIAL | PARTIAL | Framework ready, pricing rules incomplete |
| **Dunning (auto-retry)** | ❌ MISSING | NO | Manual retry via Stripe dashboard |

**Status: 🟡 PARTIAL (70%)**

**Automation:** 70% automatic (API, metering)

**Manual effort:** 15 min (client adds payment method)

**Time to onboard:** 30 min

**Blockers:**
- [ ] Payment method required (client-side)
- [ ] Billing email customization (Opsly-side, 10 min)
- [ ] Multi-currency setup (if needed, 1+ day)

---

## WHAT'S AUTOMATIC?

**Duration: ~30 minutes**

1. **Database provisioning**
   - Create tenant schema in Supabase
   - Create tables (contacts, opportunities, tags, etc.)
   - Set RLS policies
   - Add webhook logs table

2. **API provisioning**
   - Register webhook receivers
   - Create API key
   - Set rate limiting
   - Configure CORS for client domain

3. **Docker provisioning**
   - Generate Compose file
   - Create service definition
   - Set healthcheck
   - Mount volumes

4. **GHL resource provisioning** (requires API key)
   - Create tags
   - Create custom fields
   - Create calendars
   - Validate pipeline stages

5. **n8n provisioning**
   - Start Docker container
   - Generate initial credentials
   - Set webhook receiver URL
   - Configure Redis connection

6. **Portal setup**
   - Create tenant record
   - Generate dashboard
   - Set up invite system
   - Enable API key management

**Script:** `npm run provision:tenant -- --slug {slug} --execute`

---

## WHAT'S MANUAL?

**Duration: ~2-3 hours (distributed)**

### Client-side (90 min)

1. **GHL private integration** (30 min)
   - Log into GHL console
   - Create private integration
   - Request scopes
   - Generate token
   - Copy credentials to Doppler

2. **GHL email/SMS templates** (30 min)
   - Create email template in GHL UI
   - Create SMS template in GHL UI
   - Test send

3. **GHL workflows** (20 min, optional)
   - Create workflow 1: Welcome Lead
   - Create workflow 2: Trial Confirmation
   - Create workflow 3: Reminder
   - Create workflow 4: No-show Recovery

4. **n8n OAuth setup** (10 min per integration)
   - Add Stripe API credentials
   - Add Gmail credentials
   - Add other OAuth providers as needed

### Opsly-side (30 min)

1. **GHL provisioning execution** (10 min)
   - Verify API key in Doppler
   - Run `npm run ghl-provision`
   - Review provisioning report

2. **n8n workflow import** (15 min)
   - Import starter templates
   - Customize webhook URLs
   - Test workflow execution

3. **Billing setup** (5 min)
   - Create Stripe customer
   - Create subscription
   - Send payment link to client

---

## WHAT BLOCKS ONBOARDING?

| Blocker | Severity | Resolution | Time |
|---------|----------|-----------|------|
| **GHL API key** | 🔴 CRITICAL | Client must create private integration | 30 min |
| **Stripe payment method** | 🔴 CRITICAL | Client must add card | 5 min |
| **Data Processing Agreement** | 🔴 CRITICAL | Legal review required | 1-3 days |
| **GHL email templates** | 🟡 HIGH | Can launch without, add later | 30 min |
| **n8n OAuth credentials** | 🟡 HIGH | Can use test credentials, client updates | 15 min |
| **Custom domain DNS** | 🟡 MEDIUM | Default to `{slug}.op-sly.com` | 24-48 hours |
| **Client approval (n8n)** | 🟡 MEDIUM | Async review, doesn't block go-live | 1 day |
| **Client training** | 🟢 LOW | Can defer to week 2 | varies |

---

## ESTIMATED ONBOARDING TIME

### Fast Track (Parallel Execution) — 2 Days

```
DAY 1:
├─ Pre-onboarding (30 min, async)
├─ Opsly: Run automated provisioning (30 min)
├─ Client: Create GHL private integration (parallel, 30 min)
└─ Client: Add Stripe payment method (parallel, 5 min)

DAY 2:
├─ Opsly: GHL resource provisioning (10 min)
├─ Client: GHL templates (parallel, 30 min)
├─ Opsly: n8n setup (20 min)
├─ Client: n8n OAuth (parallel, 15 min)
└─ All: Smoke tests + go-live (30 min)

Total: 2 days (with parallelization)
```

### Standard Track (Sequential) — 3-5 Days

```
DAY 1: Pre-onboarding + infrastructure
DAY 2: GHL setup + Doppler secrets
DAY 3: n8n + OAuth + billing
DAY 4: Testing + client training
DAY 5: Go-live + monitoring

Total: 5 business days (safe margin)
```

---

## READINESS BY COMPONENT

```
Infrastructure:    ████████████████████ 100% 🟢 READY
Portal:           ██████████████████░░ 90%  🟡 PARTIAL
Billing:          ██████████████░░░░░░ 70%  🟡 PARTIAL
GHL Integration:  ████████████░░░░░░░░ 60%  🟡 PARTIAL
n8n Automation:   ██████████░░░░░░░░░░ 50%  🟡 PARTIAL
─────────────────────────────────────────────
OVERALL:          ███████████░░░░░░░░░ 73%  🟡 PARTIAL
```

---

## NEXT IMPROVEMENTS (Post-MVP)

### High Priority (Q3 2026)

- [ ] **Workflow templates catalog** (n8n)
  - Impact: Save 1 hour per onboarding
  - Effort: 2-3 sprints (design, test, docs)

- [ ] **GHL form builder API**
  - Impact: Enable custom form creation without UI
  - Effort: 1 sprint (coordinate with GHL team)

- [ ] **Billing email templates**
  - Impact: Branded, professional setup experience
  - Effort: 1 day (Markdown template + Handlebars variables)

### Medium Priority (Q4 2026)

- [ ] **Portal onboarding walkthrough**
  - Impact: Reduce need for training calls
  - Effort: 1 sprint (video, interactive guide)

- [ ] **Automated compliance checks** (GDPR, HIPAA, CCPA)
  - Impact: Reduce legal review time
  - Effort: 2 sprints (audit, validation framework)

- [ ] **Multi-currency billing**
  - Impact: Expand to non-USD markets
  - Effort: 1-2 sprints (Stripe setup, currency conversion)

---

## SIGN-OFF

**Ready to onboard second client?** ✅ YES

**Confidence level:** 7/10

**Notes:**
- Infrastructure is rock-solid
- GHL/n8n have good API coverage, but UI steps remain
- Playbook tested with Peskids implementation
- Recommend parallelizing client/Opsly work streams to reduce duration

**Next steps:**
1. Review playbook with operations team
2. Identify first second client
3. Run through dry-run with playbook
4. Iterate on any unclear steps
5. Go live with confidence!

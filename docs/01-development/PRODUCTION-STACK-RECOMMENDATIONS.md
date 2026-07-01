---
status: recommended
created: 2026-07-01
type: architecture
tags:
  - production-stack
  - tools
  - recommendations
---

# Production Stack Recommendations — Peskids + ICSO

**Goal:** Production-ready, scalable, cost-efficient stack for education CRM + enterprise operations  
**Philosophy:** Open-source first, self-hosted where possible, managed services only when necessary

---

## 🏗️ CORE STACK (Already Chosen)

| Layer | Tool | Status | Alternative |
|-------|------|--------|-------------|
| **Frontend** | Next.js 14 + TypeScript | ✅ Chosen | Remix, SvelteKit |
| **DB** | Supabase (PostgreSQL) | ✅ Chosen | Neon, Render |
| **CRM** | Twenty (open-source) | ✅ Chosen | Frappe, SuiteCRM |
| **Automation** | n8n (open-source) | ✅ Chosen | Zapier, Make.com |
| **Auth** | Supabase Auth | ✅ Chosen | Auth0, Clerk |
| **Hosting** | VPS (Tailscale) | ✅ Chosen | Render, Railway |

---

## 📊 RECOMMENDED ADDITIONS

### 1. **Analytics & Metrics** (for spectacular dashboards)

**RECOMMENDED: PostHog (open-source, self-hosted)**
```
Why PostHog:
✅ Full-stack analytics (events, funnels, retention, paths)
✅ Open-source (can self-host on VPS)
✅ Product analytics built-in
✅ Session recordings (understand user behavior)
✅ A/B testing
✅ Feature flags
✅ $0 if self-hosted (vs Amplitude $1k+/month)

Installation:
docker run -d --name posthog posthog/posthog:latest

Usage in Peskids/ICSO:
- Track lead creation → conversion funnel
- Track student enrollment → completion rate
- Track deal pipeline → conversion metrics
- Teacher dashboard usage → engagement
- Parent feedback → satisfaction trends
```

**Alternative:** Plausible (privacy-focused, simpler)

---

### 2. **Error Tracking & Monitoring** (uptime + crashes)

**RECOMMENDED: Sentry (open-source edition)**
```
Why Sentry:
✅ Exception tracking + alerting
✅ Performance monitoring (Cron jobs, API latency)
✅ Release tracking
✅ Self-hosted option available
✅ $0 with generous free tier (100k events/month)

Setup:
npm install @sentry/nextjs

apps/peskids/sentry.client.config.ts:
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

Alerts:
- When deal sync fails (n8n)
- When lead capture crashes
- When student enrollment errors
- When revenue KPI calculation fails
```

**Alternative:** Rollbar, LogRocket

---

### 3. **Email Delivery** (confirmations, notifications)

**RECOMMENDED: Resend or SendGrid**

**Option A: Resend (modern, developer-friendly)**
```
Pros:
✅ React Email templates (write emails as React components)
✅ Clean API
✅ Great deliverability
✅ $20/month = 100k emails
✅ Team: builders of this tool are top-tier

apps/peskids/lib/email.ts:
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Peskids: Lead confirmation
await resend.emails.send({
  from: 'leads@peskids.op-sly.com',
  to: lead.email,
  subject: '¡Gracias por tu interés!',
  react: LeadConfirmationEmail({ lead }),
});

// ICSO: Deal won notification
await resend.emails.send({
  from: 'deals@icso.op-sly.com',
  to: owner.email,
  subject: `🎉 Deal Won: ${deal.title}`,
  react: DealWonEmail({ deal }),
});
```

**Option B: SendGrid (enterprise-ready, batch)**
- Better for bulk emails (newsletters, reports)
- More expensive at scale ($30+/month)
- Better infrastructure for high volume

**Recommendation:** Start with Resend, migrate to SendGrid if volume > 100k/month

---

### 4. **SMS/WhatsApp** (Jelou integration)

**RECOMMENDED: Twilio (already integrated via Jelou)**
```
Current: Peskids/ICSO → Jelou → Twilio (WhatsApp)
Status: ✅ Already in use

Optimization:
- Add SMS fallback for critical alerts (deal won, enrollment confirmed)
- Use n8n Twilio node for scheduled reminders
- Track SMS delivery rates in analytics

Cost: $0.01-0.05/SMS (reasonable at your scale)
```

**Alternative:** Vonage, AWS Pinpoint

---

### 5. **Payments & Billing** (Stripe)

**RECOMMENDED: Stripe + Stripe Billing**
```
Current Status: ❓ Check if Stripe is integrated

For Peskids (student enrollment):
✅ Accept credit card for class enrollment
✅ Recurring billing for subscriptions (monthly classes)
✅ Invoicing parents automatically
✅ Dunning (retry failed payments)

For ICSO (enterprise deals):
✅ Billing for accounts
✅ Invoice generation for closed deals
✅ Subscription management

Setup:
npm install stripe

apps/peskids/app/api/checkout/route.ts:
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const { studentId, classId, amount } = await req.json();
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Class Enrollment: ${classId}` },
        unit_amount: amount * 100,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `https://peskids.op-sly.com/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://peskids.op-sly.com/cancel`,
    metadata: { studentId, classId },
  });

  return Response.json({ sessionId: session.id });
}

Webhooks → n8n:
- charge.succeeded → Mark student as paid
- charge.failed → Notify parent + schedule retry
- invoice.paid → Generate certificate (future)
- subscription.ended → Send upsell email
```

**Cost:** 2.9% + $0.30 per transaction (industry standard)

**Alternative:** Paddle (better for SaaS billing)

---

### 6. **Observability & Logging** (production debugging)

**RECOMMENDED: Axiom (structured logs, real-time)**
```
Why Axiom:
✅ Structured logging (JSON)
✅ Real-time querying
✅ $0 tier = 50GB/month (enough for most SaaS)
✅ Works with Next.js seamlessly
✅ Better UX than ELK for cost

Setup:
npm install @axiomhq/js

libs/observability/axiom-logger.ts:
import { Axiom } from '@axiomhq/js';
const axiom = new Axiom({ token: process.env.AXIOM_API_TOKEN });

export const logEvent = async (event: {
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, any>;
  tenant_slug: string;
  request_id: string;
}) => {
  await axiom.ingestEvents([{
    timestamp: new Date(),
    ...event,
  }]);
};

Usage:
// When lead created
await logEvent({
  level: 'info',
  message: 'Lead captured',
  context: { leadId, source: 'web', quality: 'hot' },
  tenant_slug: 'peskids',
  request_id: req.id,
});

// When deal sync fails
await logEvent({
  level: 'error',
  message: 'GHL→Twenty sync failed',
  context: { dealId, error: err.message },
  tenant_slug: 'intcloudsysops',
  request_id: req.id,
});

Query in dashboard:
filter("level" == "error") 
  | stats count() by tenant_slug
  | sort count() desc
```

**Alternative:** DataDog (expensive $15/month per host), Logtail (simpler)

---

### 7. **CDN & Image Optimization** (fast dashboards)

**RECOMMENDED: Cloudflare + Vercel (already using)**
```
Cloudflare:
✅ Free tier = full CDN + DDoS protection
✅ Automatic image optimization
✅ Edge caching
✅ Rate limiting for API

Setup: Already configured (likely)

Add Image Optimization:
// components/dashboard-chart.tsx
import Image from 'next/image';

<Image
  src={dashboardChart}
  alt="Revenue chart"
  width={1200}
  height={600}
  quality={80}
  placeholder="blur"
  blurDataURL="..."
/>

Result: Dashboards load < 1 second
```

**Cost:** $0 (free tier)

---

### 8. **Search** (if you need full-text search)

**RECOMMENDED: Meilisearch (open-source)**
```
When to use:
- Searching through 1000s of leads/contacts
- Teacher searching student progress
- Admin searching feedback by keyword
- Deal search by company name, value range

Setup (Docker):
docker run -d --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterkeyHere \
  getmeili/meilisearch:latest

Usage in Peskids:
// Search students by name, parent name, class
const students = await meilisearch.index('students')
  .search('Juan', {
    filter: ['grade >= 6 AND grade <= 8'],
  });

Cost: $0 (self-hosted on VPS)
Alternative: Algolia ($0-200/month)
```

---

### 9. **Feature Flags** (safe deployments)

**RECOMMENDED: PostHog Feature Flags (included!)**
```
Use case:
- Roll out Twenty CRM gradually (10% → 50% → 100%)
- A/B test new dashboard layout
- Disable features if bugs detected
- Beta features for specific tenants

Setup (via PostHog SDK already installed):
import { useFeatureFlagEnabled } from 'posthog-js/react';

export function DashboardChart() {
  const showTwentyIntegration = useFeatureFlagEnabled('show-twenty-crm');
  
  return showTwentyIntegration ? <TwentyCRM /> : <LegacyDashboard />;
}

// Server-side
if (posthog.isFeatureEnabled('new-billing', userId)) {
  // Show Stripe billing instead of manual invoicing
}
```

**Cost:** $0 (PostHog free tier)

---

### 10. **Performance Monitoring** (dashboards responsiveness)

**RECOMMENDED: Vercel Analytics (if hosted on Vercel)**
```
Metrics tracked automatically:
- Largest Contentful Paint (LCP) - when main content loaded
- First Input Delay (FID) - responsiveness
- Cumulative Layout Shift (CLS) - visual stability

View dashboard: https://vercel.com/analytics

Result: Identify slow pages
- If teacher dashboard LCP > 3s, optimize charts
- If lead form CLS > 0.1, fix layout shifts
- If student enrollment checkout FID > 100ms, optimize JS

Cost: $0 (Vercel Pro included)
```

**Alternative:** Web Vitals library (manual)

---

## 🎯 COMPLETE RECOMMENDED STACK

```yaml
FRONTEND:
  - Next.js 14 (TypeScript)
  - Recharts (dashboards already using)
  - Tailwind CSS (styling)
  - React Query (data fetching)

BACKEND:
  - Next.js API Routes
  - Supabase (PostgreSQL + Auth)
  - n8n (workflows)
  - Twenty (CRM)

INTEGRATIONS:
  - Stripe (payments)
  - Resend (emails)
  - Jelou/Twilio (SMS/WhatsApp)
  - Sentry (error tracking)
  - PostHog (analytics)
  - Axiom (logging)

INFRASTRUCTURE:
  - VPS (Docker + Tailscale)
  - Cloudflare (CDN)
  - GitHub Actions (CI/CD - already using)

OBSERVABILITY:
  - PostHog (product analytics)
  - Sentry (exceptions)
  - Axiom (logs)
  - Vercel Analytics (web vitals)

COST BREAKDOWN (Monthly):
  - VPS: $50-100 (existing)
  - Stripe: 2.9% + $0.30 per txn
  - Resend: $20 (100k emails)
  - Sentry: $0 (free tier, 100k events)
  - PostHog: $0 (free tier, 1M events)
  - Axiom: $0 (free tier, 50GB logs)
  - Meilisearch: $0 (self-hosted)
  - Twilio: $0.01-0.05/SMS
  
  TOTAL: ~$70-120/month (vs $300+ with GHL + competitors)
```

---

## 📝 Implementation Priority

### Week 1 (Core):
- ✅ Twenty (already planned)
- ✅ n8n (already planned)
- ✅ Stripe integration (payments)
- ⚠️ Sentry (error tracking)

### Week 2-3 (Analytics):
- PostHog (product analytics)
- Axiom (structured logging)
- Resend (emails)

### Week 4+ (Enhancement):
- Meilisearch (search)
- Feature flags (PostHog)
- Vercel Analytics (performance)

---

## 🚀 Why This Stack?

1. **Cost-Efficient**: Mostly free/cheap services + open-source self-hosted
2. **Developer-Friendly**: Modern APIs, good SDKs, TypeScript support
3. **Scalable**: Works from 1 user to 1M users
4. **Data Privacy**: Self-hosted options available (PostHog, Meilisearch, n8n)
5. **No Vendor Lock-in**: Can swap Resend for SendGrid, Axiom for DataDog
6. **Production-Ready**: All tools used by YC companies, Series B+ startups

---

## 📊 Comparison: Before vs After

| Aspect | Before (GHL) | After (Recommended) |
|--------|--------------|-------------------|
| **CRM** | GHL ($300/mo) | Twenty ($0) |
| **Automation** | GHL ($300/mo) | n8n ($0) |
| **Payments** | Manual | Stripe (2.9%) |
| **Analytics** | None | PostHog ($0) |
| **Error tracking** | None | Sentry ($0) |
| **Emails** | GHL | Resend ($20) |
| **Dashboard** | Basic | Spectacular (Recharts + PostHog) |
| **Logging** | None | Axiom ($0) |
| **Feature flags** | None | PostHog ($0) |
| **SMS/WhatsApp** | Jelou | Jelou + Twilio ($0.01-0.05) |

**Total monthly cost:** $70-120 (vs $600+ GHL)  
**Dashboard quality:** 10/10 (vs 5/10 GHL)

---

## Next Steps

1. ✅ Implement Twenty + n8n (already planned)
2. Integrate Stripe for payments
3. Set up Sentry for error tracking
4. Deploy PostHog for analytics
5. Add Resend for beautiful emails
6. Configure Axiom for structured logging

Ready to proceed?

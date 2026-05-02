# CURSOR PROMPT: Local Services Phase 2 — Automation + n8n Workflows

## Context

Phase 1 (completed) delivered the API + booking form. Phase 2 connects everything via **n8n workflows** to automate:

1. **Booking Confirmation** — Email + SMS when customer books
2. **Post-Service Report** — Auto-generate after technician completes job
3. **Follow-up Sequence** — 7d, 30d, 60d emails (upsell maintenance)
4. **Invoice/Payment** — Stripe subscription + invoice PDF
5. **Slack/Discord Notifications** — Team alerts for new bookings

**Why:** Manual workflows = bottleneck. Automations scale to 50+ bookings/week without additional work.

---

## Scope

**YOU own (Cursor):**
- n8n workflow definitions (5 workflows, JSON)
- Webhook endpoints for n8n triggers
- Stripe integration (create subscription, invoice)
- SendGrid + Twilio integration (emails + SMS)
- Dashboard to monitor workflow executions
- Tests for webhook safety (validate tenant_slug, prevent replay attacks)

**Assigned elsewhere (reference these):**
- n8n infrastructure (already deployed on VPS) — see DevOps
- Stripe account setup — see Finance
- SendGrid/Twilio credentials — see Ops
- Email templates — see `.cursor/prompts/local-services-ops-admin.md` (Ops Agent)

---

## Tech Stack (Phase 2)

| Component | Tech | Why |
|-----------|------|-----|
| **Workflow Engine** | n8n (self-hosted on VPS) | Existing Opsly infrastructure |
| **Email Service** | SendGrid | Phase 1 foundation, bulk emails |
| **SMS Service** | Twilio | Already in use in org |
| **Payment Processor** | Stripe | Existing billing integration |
| **Scheduling** | n8n Cron | Built-in, no external scheduler |
| **Webhooks** | Next.js API route listeners | Lightweight, fast |
| **Monitoring** | n8n built-in + Slack alerts | Ops visibility |

---

## n8n Workflows to Create

### 1. **Booking Confirmation Workflow**

**Trigger:** Webhook from `/api/local-services/webhooks/booking-created`

**Steps:**
1. Receive webhook payload: `{ tenant_slug, booking_id, customer_email, service_name, scheduled_at }`
2. Lookup customer from booking_id (call `/api/local-services/tenants/[slug]/bookings/[id]`)
3. Send email via SendGrid:
   - To: customer_email
   - Subject: "Booking confirmed: [service_name] on [date]"
   - Template: `booking-confirmation.html`
   - Personalize with customer name, time, technician note (TBD in next week)
4. Send SMS via Twilio (if phone provided):
   - "Hi [Name], your [service] is confirmed for [date] at [time]. Reply CONFIRM"
5. Add event to Google Calendar (optional Week 2):
   - Create calendar event for technician
   - Set reminder 1 hour before

**Retry Logic:** Exponential backoff 3 retries

**Error handling:** If SendGrid fails, log to Slack: "❌ Booking email failed for [booking_id]"

---

### 2. **Post-Service Report Workflow**

**Trigger:** Webhook from `/api/local-services/webhooks/booking-completed`

**Steps:**
1. Receive webhook: `{ tenant_slug, booking_id, technician_id }`
2. Fetch booking + customer from API
3. Call Claude API (via Opsly orchestrator):
   - Prompt: "Generate a professional service report for [service] at [customer] address. Format: findings, recommendations, next steps"
   - Get: `{ description, findings, recommendations }`
4. Create service_report in DB via POST `/api/local-services/webhooks/reports/create`
5. Generate PDF from report + invoice
6. Email PDF to customer:
   - Subject: "Service complete: [service_name]"
   - Attach: `service_report_[booking_id].pdf`
   - Body: "Thanks for choosing us! See attached."
7. Store PDF in Supabase Storage (`local_services/[tenant_slug]/reports/[id].pdf`)

**Retry Logic:** 3 retries with delay

**Error handling:** If Claude fails, create blank report with note "Report generation failed"

---

### 3. **Follow-up Sequence Workflow**

**Trigger:** Cron job (daily at 9am) + database check for completed bookings

**Steps (Pseudo-n8n):**
```
Daily:
  1. Query completed_bookings WHERE completed_at >= TODAY - 7 DAYS
  2. FOR EACH booking:
     a. Check if follow-up already sent (DB flag: followup_7d_sent)
     b. If completed 7 days ago → send Day 7 email
     c. If completed 30 days ago → send Day 30 email  
     d. If completed 60 days ago → send Day 60 email
  3. Update followup_sent flags in DB
```

**Email Templates:**

**Day 7:** "How's it working? Any issues?"
- Body: "Hi [Name], your [service] was completed on [date]. How's everything running?"
- CTA: "Reply with any issues" or "Schedule maintenance"

**Day 30:** "Time for maintenance check?"
- Body: "[Service] usually benefits from maintenance every 30 days. We found X issues..."
- CTA: "Book maintenance plan ($99/mo)" — link to booking form

**Day 60:** "Still going strong?"
- Body: "Your [service] is 2 months old. Preventive maintenance now = fewer problems later."
- CTA: "Schedule preventive visit"

**Database schema additions:**
```sql
ALTER TABLE ls_bookings ADD COLUMN followup_7d_sent BOOLEAN DEFAULT false;
ALTER TABLE ls_bookings ADD COLUMN followup_30d_sent BOOLEAN DEFAULT false;
ALTER TABLE ls_bookings ADD COLUMN followup_60d_sent BOOLEAN DEFAULT false;
```

---

### 4. **Invoice + Stripe Subscription Workflow**

**Trigger:** Webhook from `/api/local-services/webhooks/quote-accepted`

**Steps:**
1. Receive webhook: `{ tenant_slug, quote_id, customer_id, total_price }`
2. Fetch customer + quote from API
3. Create Stripe Customer (if not exists):
   - Name: customer.full_name
   - Email: customer.email
   - Metadata: { tenant_slug, customer_id }
4. Create Stripe Invoice:
   - Amount: total_price (in cents)
   - Description: quote.notes
   - Due date: now + 14 days
5. Send invoice email via SendGrid:
   - Subject: "Invoice #[id]: [service_name]"
   - Attach PDF from Stripe
   - Include payment link
6. If subscription (maintenance plan):
   - Create Stripe subscription: $99/mo, billing_cycle_anchor = today
   - Email confirmation with renewal date

**Stripe Webhooks to listen for:**
- `invoice.payment_succeeded` → Update booking status, send receipt
- `invoice.payment_failed` → Retry + customer notification

**Error handling:** If Stripe fails, create backup invoice in n8n + manual follow-up

---

### 5. **Slack Alert Workflow** (Optional Week 2)

**Trigger:** Webhooks from:
- New booking created
- Booking completed
- Quote accepted
- Workflow failure

**Actions:**
1. Format message: "📅 **New booking** — [service] from [customer] on [date]"
2. Post to `#local-services-bookings` Slack channel
3. If booking > $300 → also tag `@tech-owner` (high-value alert)

---

## Webhook Listeners to Create

### 1. `/api/local-services/webhooks/booking-created`

**Triggered by:** POST `/api/local-services/tenants/[slug]/bookings` response

**Payload:**
```json
{
  "tenant_slug": "local-services",
  "booking_id": "uuid",
  "customer_id": "uuid",
  "customer_email": "customer@example.com",
  "customer_phone": "+14015551234",
  "service_name": "Gamer PC Clean",
  "scheduled_at": "2026-05-10T14:00:00Z",
  "tenant_id": "uuid"
}
```

**Implementation:**
1. Validate webhook signature (n8n sends Authorization header)
2. Validate tenant_slug matches JWT session
3. Queue job: `enqueue('booking-confirmation-workflow', payload)`
4. Return 202 Accepted (fire-and-forget)

**Safety:**
- ✅ Validate HTTP signature
- ✅ Check tenant_slug in body == path slug
- ✅ Log all webhook calls (for audit)
- ✅ Replay attack protection (idempotency key)

---

### 2. `/api/local-services/webhooks/booking-completed`

**Triggered by:** PATCH `/api/local-services/tenants/[slug]/bookings/[id]` with status='completed'

**Payload:**
```json
{
  "tenant_slug": "local-services",
  "booking_id": "uuid",
  "technician_id": "uuid",
  "completed_at": "2026-05-10T15:30:00Z"
}
```

**Implementation:** Same as booking-created

---

### 3. `/api/local-services/webhooks/reports/create`

**Triggered by:** n8n after generating report via Claude

**Payload:**
```json
{
  "tenant_slug": "local-services",
  "booking_id": "uuid",
  "description": "Removed dust, replaced thermal paste, optimized startup",
  "findings": "Fan bearing degrading, GPU temp high",
  "recommendations": "Replace fan in 2 weeks, apply fresh thermal paste",
  "duration_minutes": 120
}
```

**Implementation:**
1. Insert into `ls_service_reports` table
2. Return created report ID
3. (n8n listens for response, continues workflow)

---

## Integration Points

### SendGrid
- API key: `SENDGRID_API_KEY` (Doppler)
- Email templates:
  - `booking-confirmation.html` → Create in SendGrid dashboard
  - `post-service-report.html` → With embedded PDF placeholder
  - `followup-7d.html`, `followup-30d.html`, `followup-60d.html` → Simple HTML
- Test email: `test@equipa.local` (dev) or real customer (prod)

### Twilio
- Account SID + Auth Token: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (Doppler)
- From number: `+1401...` (SMS-enabled, provisioned)
- SMS body max 160 chars (n8n auto-splits)

### Stripe
- Secret key: `STRIPE_SECRET_KEY` (Doppler)
- Publishable key for frontend (Phase 2.5)
- Webhooks endpoint: `https://[domain]/api/local-services/webhooks/stripe`
- Event types: `invoice.payment_succeeded`, `invoice.payment_failed`

### Google Calendar (Optional Week 2)
- OAuth token stored in Doppler
- Create calendar event for technician @ scheduled_at
- n8n has built-in Google Calendar module

---

## Database Schema Updates

```sql
-- Track follow-up emails
ALTER TABLE ls_bookings ADD COLUMN followup_7d_sent BOOLEAN DEFAULT false;
ALTER TABLE ls_bookings ADD COLUMN followup_30d_sent BOOLEAN DEFAULT false;
ALTER TABLE ls_bookings ADD COLUMN followup_60d_sent BOOLEAN DEFAULT false;

-- Track Stripe invoice
ALTER TABLE ls_bookings ADD COLUMN stripe_invoice_id VARCHAR(255);
ALTER TABLE ls_bookings ADD COLUMN stripe_customer_id VARCHAR(255);

-- Service reports already exist (Phase 1)
-- ls_service_reports table ready
```

---

## Implementation Checklist

- [ ] Create 5 n8n workflow JSONs (export from n8n UI or code)
- [ ] Deploy workflows to n8n instance on VPS
- [ ] Create webhook listener routes in `/apps/api/app/api/local-services/webhooks/`
- [ ] Test each webhook locally (POST to localhost:3000/api/...)
- [ ] Integrate SendGrid test email
- [ ] Integrate Twilio test SMS
- [ ] Create Stripe test account + test invoice
- [ ] Write tests for webhook signature validation
- [ ] Document n8n dashboard + how to monitor workflows
- [ ] Update .env.local with SendGrid, Twilio, Stripe keys
- [ ] Test full flow: booking → confirmation email → report → follow-up

---

## Success Criteria

✅ Booking confirmation email arrives within 5 min of booking  
✅ Post-service report generated + emailed within 1 hour of completion  
✅ Follow-up emails sent at 7d, 30d, 60d (verified via SendGrid logs)  
✅ Invoice created in Stripe + customer receives email  
✅ Webhook signatures validated (security)  
✅ All failures logged to Slack  
✅ Tests pass: `npm test --workspace=@intcloudsysops/api`  
✅ n8n dashboard shows 0 errors across workflows  

---

## Example Tasks for Cursor

1. **"Create POST /api/local-services/webhooks/booking-created endpoint"**
   - Validate signature
   - Queue n8n workflow
   - Return 202 Accepted
   - Write test

2. **"Create n8n workflow: booking confirmation email"**
   - Export as JSON from n8n UI
   - Add to `.n8n/workflows/local-services-booking-confirmation.json`
   - Test with mock webhook

3. **"Integrate Stripe invoice generation"**
   - Create Stripe Customer in workflow
   - Generate invoice
   - Send via email
   - Test with test mode

4. **"Create daily follow-up sequence checker"**
   - n8n Cron trigger (9am daily)
   - Query bookings table for completed_at dates
   - Send appropriate email based on days elapsed
   - Update followup_sent flags

---

## Questions? References

- n8n docs: https://docs.n8n.io/
- SendGrid template docs: https://sendgrid.com/docs/
- Stripe API: https://stripe.com/docs/api
- Webhook signature validation: `/apps/api/lib/webhook-signature.ts` (reference)
- Phase 1 API: See `/apps/api/app/api/local-services/tenants/[slug]/`
- Opsly orchestrator: `/apps/orchestrator/src/` (for Claude API calls)

---

**Status:** Ready for Cursor execution Phase 2 🚀

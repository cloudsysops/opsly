# CURSOR PROMPT: Local Services Automation Engineer

## Context
Build n8n workflows that auto-trigger on booking events. Handle booking confirmations, post-service reports, reminder sequences, and upsell emails. You are orchestration, not code.

**Assigned to:** Codex (workflow automation), triggered by booking lifecycle

## Scope

**YOU build (in n8n):**
1. Booking confirmation (email to customer + technician)
2. 24-hour reminder SMS + email
3. Post-service report email (Claude generates description)
4. 7-day follow-up (how's it working?)
5. 30-day upsell (maintenance plan)
6. 60-day re-engagement (need another service?)
7. Review request (Google/Yelp links)

**NOT code.** Pure workflow automation with:
- Webhook triggers (booking status changes)
- Data fetching (Supabase reads)
- Email sending (SendGrid)
- Conditional branching (IF customer_type = "business" THEN...)

## Workflow 1: Booking Confirmation

**Trigger:** Booking created (status = 'pending')

**Flow:**
```
1. Webhook fires: POST /n8n/webhooks/local-services/booking-created
   Body: { booking_id, customer_id, scheduled_at, service_ids }

2. Fetch customer details (Supabase)
   SELECT * FROM local_services.customers WHERE id = customer_id

3. Fetch service names (Supabase)
   SELECT name FROM local_services.services WHERE id = ANY(service_ids)

4. Send to customer (SendGrid)
   Template: "booking_confirmation_customer.html"
   Vars: { customer_name, service_names, scheduled_at }

5. Send to technician (SendGrid + Slack optional)
   Template: "booking_confirmation_tech.html"
   Vars: { customer_name, address, phone }

6. Update booking status → 'confirmed'
```

## Workflow 2: 24-Hour Reminder

**Trigger:** Time-based (scheduled 24h before scheduled_at)

**Flow:**
```
1. Query: all bookings with scheduled_at = tomorrow at this time

2. For each booking:
   a. Send SMS (Twilio):
      "Hi [Name], reminder: we're coming tomorrow at [time].
       Text back to confirm or reschedule 📅"
   
   b. Send email (SendGrid):
      "See you tomorrow!"

3. Log reminder sent (update booking_reminder_sent_at)
```

## Workflow 3: Post-Service Report (with Claude)

**Trigger:** Booking status = 'completed'

**Flow:**
```
1. Webhook: POST /n8n/webhooks/local-services/booking-completed
   Body: { booking_id, technician_notes, duration_minutes }

2. Fetch booking + customer context (Supabase)

3. Call Claude (via LLM Gateway or API):
   Prompt: "Write service report. Context: [service], [notes], [findings]"
   Output: structured report (description, findings, recommendations)

4. Create service_reports row (Supabase)
   INSERT INTO local_services.service_reports (...)

5. Generate PDF (optional, using report text)

6. Send email (SendGrid)
   Template: "service_report_email.html"
   Attachment: PDF if generated

7. Trigger followup_sequence (7 days later)
```

## Workflow 4-6: Follow-up Sequence (Nurture)

**Triggers:** Scheduled 7, 30, 60 days after booking completion

**Workflow 4a (Day 7): How's it working?**
```
Email subject: "How's your [service] working?"
Body: "Hi [Name], it's been a week. How's everything running? Any issues?
      [Quick link to reply]"

Purpose: Catch problems early, increase satisfaction
```

**Workflow 4b (Day 30): Upsell maintenance**
```
Email subject: "[Name], quick question about your WiFi..."
Body: "We noticed you haven't had a single dropout! 🎉
      Want to keep it that way?
      Our $99/mo maintenance plan includes:
      - Monthly health check
      - Firmware updates
      - Priority support
      → Enable now [link]"

Purpose: Convert one-time customers to recurring revenue
```

**Workflow 4c (Day 60): Other services?**
```
Email subject: "Before you forget: we also do..."
Body: "[Name], since we fixed your [current service],
      you might also want:
      - Laptop speed-up ($150-200)
      - Office backup setup ($300)
      - Security audit ($200)
      
      Interested? [Book another service]"

Purpose: Expand LTV per customer
```

## Workflow 5: Review Request

**Trigger:** Booking status = 'completed' + 48 hours

**Flow:**
```
1. Send email to customer

Template: "We'd love your feedback!"
Subject: "Help others: leave a review 🌟"

Body: "Hi [Name],
We hope you're happy with your service!
Could you leave a quick review?
- Google: [short_link_to_google_review]
- Yelp: [short_link_to_yelp_review]
Thanks! 🙏"

Purpose: Build social proof, increase organic leads
```

## Workflow 6: Calendar Sync (Optional, Week 2+)

**Trigger:** Booking status changes

**Flow:**
```
IF booking.status = 'confirmed':
  → Create Google Calendar event (technician's calendar)
    Title: "On-site: [Customer Name] — [Service]"
    Time: booking.scheduled_at
    Location: customer.address

IF booking.status = 'en_route':
  → Update Calendar event
    Add to description: "ETA: [time]"

IF booking.status = 'completed':
  → Remove event from calendar
```

## n8n Configuration

**Webhooks to create:**
```
/n8n/webhooks/local-services/booking-created
/n8n/webhooks/local-services/booking-completed
/n8n/webhooks/local-services/booking-status-changed
```

**External integrations:**
- SendGrid API (email sending)
- Twilio API (SMS reminders)
- Supabase API (data fetch)
- Google Calendar API (sync, optional Week 2+)
- LLM Gateway (Claude for report generation)

**n8n node types:**
- Webhook (trigger)
- Supabase (fetch/insert data)
- SendGrid (send email)
- Twilio (send SMS)
- HTTP Request (call Claude/LLM Gateway)
- Conditional (IF customer_type = business THEN...)
- Schedule (7-day, 30-day, 60-day timers)

## Storage: Workflow Files

**Location:** `.n8n/1-workflows/`

```
.n8n/1-workflows/
├── local-services-booking-confirmation.json
├── local-services-24h-reminder.json
├── local-services-post-service-report.json
├── local-services-day7-followup.json
├── local-services-day30-upsell.json
├── local-services-day60-reengagement.json
├── local-services-review-request.json
└── local-services-calendar-sync.json (optional)
```

Each JSON file is exported from n8n UI.

## Testing Checklist

✅ Webhook receives POST with valid body  
✅ Supabase query returns data  
✅ SendGrid email arrives in inbox  
✅ Twilio SMS arrives (if configured)  
✅ Conditional branching works (customer_type check)  
✅ Scheduled workflows trigger at correct time  
✅ Claude report generation succeeds + email sends  

## Constraints

✅ No secrets in workflow JSON (use n8n env vars)  
✅ Email templates render correctly (test in SendGrid)  
✅ Timing: workflows execute within expected window  
✅ Error handling: failed email logs alert (Slack/Discord)  
✅ Idempotency: no duplicate emails if webhook retries  

## Success Criteria

✅ All 7 workflows created and deployed  
✅ Booking confirmation email arrives within 5 minutes  
✅ 24-hour reminder SMS/email triggers correctly  
✅ Post-service report email with Claude-generated text  
✅ 7/30/60-day sequences trigger on schedule  
✅ Review request links functional (Google/Yelp short URLs)  
✅ Calendar sync (optional) works with Google Calendar API  
✅ Zero duplicate emails (idempotency verified)

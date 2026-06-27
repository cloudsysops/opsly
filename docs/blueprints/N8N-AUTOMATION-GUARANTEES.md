---
status: active
created: 2026-06-25
purpose: "Definir automatizaciones críticas con n8n por tipo de cliente"
---

# n8n Automation Guarantees

**Objetivo:** Especificar qué automatizaciones DEBEN funcionarse con n8n para cada cliente, según su modelo de negocio.

---

## 1. PESKIDS (Education — Trial-Based Model)

### Critical Automations (MUST HAVE)

#### A. Lead Intake & Welcome Dispatch
**Trigger:** GHL webhook — Contact Created  
**Via:** n8n webhook receiver  
**Actions:**
1. Parse GHL contact payload
2. Extract: parent_name, child_name, age, parent_phone, parent_email
3. Store in Supabase: `peskids_leads`
4. Trigger welcome workflow (email + SMS)
5. Log execution

**SLA:** <2 min from GHL contact creation  
**Owner:** Dev (n8n setup) + Ops (GHL workflow)  
**Success Metric:** 100% lead ingestion, 0 duplicates (idempotency key = ghl_contact_id)

---

#### B. Trial Class Reminder (SMS + Email)
**Trigger:** 24 hours before appointment  
**Via:** GHL workflow → n8n (if email template fails)  
**Actions:**
1. Query scheduled appointments in GHL
2. Send SMS: "Hola {{parent.name}}, te recordamos tu clase de prueba mañana a las {{appointment.time}}. Lleva traje de baño y gorro."
3. Send Email: Trial confirmation + address + instructions
4. Add tag: `trial_reminded`
5. Log delivery

**SLA:** 24h ± 15 min before appointment  
**Owner:** Ops (GHL) + Marketing (copy)  
**Success Metric:** 95%+ SMS/email delivery, 0 bounce

---

#### C. Trial Attendance Tracking
**Trigger:** Appointment marked as "Completed" or "No Show" in GHL  
**Via:** n8n polling webhook (every 30 min)  
**Actions:**
1. Check appointment status change
2. If Completed:
   - Add tag: `trial_completed`
   - Update stage: "Trial Completed"
   - Trigger enrollment offer email
3. If No Show:
   - Add tag: `no_show`
   - Update stage: "Contacted" (revert)
   - Send re-engagement SMS after 1h

**SLA:** <5 min detection, <1h follow-up  
**Owner:** Dev (n8n) + Ops (GHL)  
**Success Metric:** 100% status sync, <5 min latency

---

#### D. Enrollment Confirmation & Payment Setup
**Trigger:** Contact moves to "Enrolled" stage in GHL  
**Via:** n8n webhook  
**Actions:**
1. Send enrollment confirmation email
2. Send payment setup instructions (if billing enabled)
3. Create student profile in `peskids_students`
4. Schedule first month's classes
5. Log enrollment in metrics

**SLA:** <10 min after stage change  
**Owner:** Ops + Billing  
**Success Metric:** 100% enrollment confirmation sent

---

#### E. Active Student Billing Reminder
**Trigger:** Monthly (1st day of month)  
**Via:** n8n scheduled job (cron)  
**Actions:**
1. Query active students with active subscription
2. Send: "Recordatorio: Tu próximo pago de Peskids vence el {{payment_due_date}}"
3. Log sent/failed
4. Alert if >20% payment failures

**SLA:** 1st day of month, 9 AM Colombia time  
**Owner:** Billing + Ops  
**Success Metric:** 99%+ delivery, <10% failed payments

---

#### F. Churn Detection & Retention
**Trigger:** Weekly check (Sundays, 8 AM)  
**Via:** n8n scheduled job  
**Actions:**
1. Query students with no class attendance in 30 days
2. Send: "Te echamos de menos en Peskids! Aquí están tus opciones..."
3. Offer: Class reschedule, pause subscription, cancellation
4. Track re-engagement rate
5. Alert Ops if >15% churn risk

**SLA:** Weekly, actionable within 7 days  
**Owner:** Ops + Product  
**Success Metric:** <15% monthly churn, 30%+ re-engagement

---

### Optional Automations (NICE TO HAVE)

- [ ] AI-powered lead scoring (hot/warm/cold)
- [ ] Personalized trial class recommendations
- [ ] Parent satisfaction surveys (post-trial)
- [ ] Sibling referral programs
- [ ] Seasonal promotion campaigns

---

## 2. INTCLOUDSYSOPS / ICSO (Agency — Discovery Call Model)

### Critical Automations (MUST HAVE)

#### A. Lead Intake & Welcome
**Trigger:** GHL webhook — Contact Created (source = "icso-website")  
**Via:** n8n webhook receiver  
**Actions:**
1. Parse GHL payload
2. Extract: company_name, contact_name, email, phone, service_interest
3. Store in Supabase: `intcloudsysops_leads`
4. Send welcome email (+ calendar link)
5. Log execution

**SLA:** <1 min  
**Owner:** Dev (n8n) + Marketing  
**Success Metric:** 100% ingestion, 0 duplicates

---

#### B. Discovery Call Confirmation
**Trigger:** Appointment created in "Discovery Call" calendar  
**Via:** GHL workflow → n8n backup  
**Actions:**
1. Send confirmation email with date/time/Zoom link
2. Add tag: `discovery_scheduled`
3. Update stage: "New Lead" → "Discovery Scheduled"
4. Log confirmation

**SLA:** <2 min after booking  
**Owner:** Ops + Marketing  
**Success Metric:** 95%+ email delivery

---

#### C. Discovery Call Reminder
**Trigger:** 24 hours before discovery  
**Via:** n8n (GHL SMS if available)  
**Actions:**
1. Send SMS: "Hola {{name}}, recordatorio: tu discovery call con Opsly es mañana a las {{time}}. Link: {{zoom_url}}"
2. Send email with agenda
3. Add tag: `discovery_reminded`

**SLA:** 24h ± 30 min before  
**Owner:** Ops  
**Success Metric:** 95%+ delivery

---

#### D. No-Show Recovery
**Trigger:** Appointment marked "No Show"  
**Via:** n8n webhook (GHL automation trigger)  
**Actions:**
1. Wait 1 hour
2. Send SMS: "Nos perdimos tu discovery call. ¿Podemos reagendar? Link: {{reschedule_link}}"
3. Create task for Ops: "Follow-up: {{contact.name}}"
4. Add tag: `no_show_recovery_sent`
5. Track re-engagement

**SLA:** <1h after no-show  
**Owner:** Ops  
**Success Metric:** 20-30% re-engagement rate

---

#### E. Post-Discovery Follow-up
**Trigger:** 2 hours after discovery call marked "Completed"  
**Via:** n8n webhook  
**Actions:**
1. Send: "Gracias por tu discovery call. Adjuntamos propuesta..."
2. Send proposal PDF (if available)
3. Request feedback survey
4. Update stage: "Discovery Scheduled" → "Proposal Sent"
5. Set follow-up date in GHL (3 days)

**SLA:** <2h after completion  
**Owner:** Ops + Sales  
**Success Metric:** 80%+ proposal opens

---

#### F. Nurture Campaign (if no conversion)
**Trigger:** 5 days after proposal sent, no activity  
**Via:** n8n scheduled job  
**Actions:**
1. Send: "¿Alguna pregunta sobre la propuesta?"
2. Include case studies/testimonials
3. Offer: "Hagamos un follow-up call?"
4. Add tag: `nurture_1`

**SLA:** 5 days ± 1 day  
**Owner:** Marketing  
**Success Metric:** 15-20% re-engagement

---

### Optional Automations (NICE TO HAVE)

- [ ] Lead scoring (hot/warm/cold prospects)
- [ ] Automated proposal generation (fill template with discovery notes)
- [ ] CRM sync (to external CRM if needed)
- [ ] Payment tracking (when contracts signed)
- [ ] ROI calculation (revenue per discovery call)

---

## 3. EQUIPA (Service — Booking Model)

### Critical Automations (MUST HAVE)

#### A. Service Booking Confirmation
**Trigger:** GHL appointment created (Service Calendar)  
**Via:** n8n webhook  
**Actions:**
1. Extract: service_type, service_date, service_time, location, price
2. Send confirmation SMS: "Tu servicio de limpieza está confirmado para {{date}} a las {{time}} en {{location}}. Precio: ${{price}}. ¿Alguna pregunta?"
3. Send confirmation email (receipt + instructions)
4. Add tag: `service_confirmed`
5. Create job in internal system

**SLA:** <2 min after booking  
**Owner:** Dev (n8n) + Ops  
**Success Metric:** 98%+ SMS delivery

---

#### B. Service Reminder (Day Before)
**Trigger:** 24 hours before service appointment  
**Via:** n8n scheduled job  
**Actions:**
1. Send SMS: "Recordatorio: tu servicio de limpieza es mañana a las {{time}} en {{location}}. Equipo: {{technician_name}}"
2. Send email with technician photo/rating
3. Offer: Reschedule link, cancel link
4. Add tag: `service_reminded`

**SLA:** 24h ± 1h before  
**Owner:** Ops  
**Success Metric:** 95%+ delivery, <10% cancellations

---

#### C. Service Completion & Rating
**Trigger:** Technician marks appointment "Completed" in mobile app  
**Via:** n8n webhook  
**Actions:**
1. Send: "¡Gracias por tu servicio! ¿Cómo fue tu experiencia?"
2. Include: 5-star rating prompt, photo upload option
3. Collect feedback in Supabase
4. Send receipt (for payment)
5. Add tag: `service_completed`
6. Update lead stage: "Service Complete"

**SLA:** <5 min after marking complete  
**Owner:** Ops + Support  
**Success Metric:** 60%+ rating responses

---

#### D. Repeat Booking Encouragement
**Trigger:** 14 days after service completion  
**Via:** n8n scheduled job  
**Actions:**
1. Send SMS: "¿Necesitas otro servicio de limpieza? Tenemos disponibilidad esta semana."
2. Send: Discount offer (10% off next service)
3. Include: "Book now" link
4. Add tag: `repeat_offered`
5. Track repeat booking rate

**SLA:** 14 days ± 2 days  
**Owner:** Marketing + Ops  
**Success Metric:** 20-30% repeat booking rate

---

#### E. Payment Notification (if billing)
**Trigger:** Payment due date  
**Via:** n8n scheduled job  
**Actions:**
1. Send SMS: "Tu pago de ${{amount}} vence el {{due_date}}"
2. Send email with payment link
3. Track payment status
4. Alert Ops if payment fails
5. Retry after 3 days (if failed)

**SLA:** 3 days before due date  
**Owner:** Billing  
**Success Metric:** >95% on-time payment

---

#### F. No-Show Follow-up
**Trigger:** Appointment marked "No Show"  
**Via:** n8n webhook  
**Actions:**
1. Wait 2 hours
2. Send SMS: "Nos perdimos tu servicio. ¿Hay algún problema? Contacta: {{support_phone}}"
3. Create task for Ops: "Follow-up: {{contact.name}}"
4. Offer: Reschedule + small discount
5. Add tag: `no_show_service`

**SLA:** <2h after no-show  
**Owner:** Ops  
**Success Metric:** 15-25% re-engagement

---

### Optional Automations (NICE TO HAVE)

- [ ] Technician assignment optimization (closest technician to location)
- [ ] Dynamic pricing (surge pricing during peak hours)
- [ ] Route optimization (minimize travel time between services)
- [ ] Seasonal promotions (spring cleaning, holiday specials)
- [ ] Loyalty program (free service after 10 bookings)
- [ ] Referral rewards (friend discount program)

---

## Summary: Automation Priorities

### 🔴 CRITICAL (Must Implement Before Go-Live)

| Client | Automation | Reason |
|--------|-----------|--------|
| **Peskids** | Lead intake + welcome | Revenue at risk if leads lost |
| **Peskids** | Trial reminder | <50% no-show without reminder |
| **Intcloudsysops** | Lead intake + welcome | Brand impression (first touch) |
| **Intcloudsysops** | Discovery reminder | ~30% no-show rate without reminder |
| **Equipa** | Booking confirmation | Customer confidence |
| **Equipa** | Service reminder | 40%+ no-show without reminder |

### 🟡 HIGH (Implement within 2 weeks)

| Client | Automation | Reason |
|--------|-----------|--------|
| **Peskids** | Attendance tracking | Data for conversion metrics |
| **Peskids** | Churn detection | Retention critical for recurring revenue |
| **Intcloudsysops** | No-show recovery | 20-30% recovery rate possible |
| **Equipa** | Repeat booking | Upsell opportunity |
| **Equipa** | Rating collection | Reputation management |

### 🟢 NICE TO HAVE (Future)

| Client | Automation | Reason |
|--------|-----------|--------|
| **Peskids** | Lead scoring | Optimize which leads to follow up first |
| **Intcloudsysops** | Proposal generation | Sales acceleration |
| **Equipa** | Route optimization | Efficiency (cost reduction) |

---

## n8n Configuration Template

### For Each Client

```yaml
Client: {name}
Webhooks:
  - Lead Intake: POST /api/n8n/{slug}/leads
  - Appointment Updates: POST /api/n8n/{slug}/appointments
  - Feedback: POST /api/n8n/{slug}/feedback

Triggers:
  - Scheduled jobs: Cron expressions (reminders, churn, billing)
  - GHL webhooks: Contact created, appointment changed
  - Supabase webhooks: Status changes

Integrations:
  - GHL API (read contacts, opportunities, appointments)
  - Supabase (store lead data, track metrics)
  - Email service (Sendgrid, AWS SES)
  - SMS service (Twilio)
  - Slack (alerts for failures)

Monitoring:
  - Execution logs (success/failure)
  - SLA tracking (delivery time)
  - Error rate (>5% triggers alert)
  - Retry logic (exponential backoff)

Idempotency:
  - GHL contact_id as unique key (no duplicate welcome emails)
  - Appointment_id for reminders (no double SMS)
  - Deduplication window: 30 seconds
```

---

## Implementation Roadmap

### Phase 1 (Go-Live)
✅ Critical automations only (A, B, D for each client)

### Phase 2 (Week 1-2)
🟡 High-priority automations (E, F)

### Phase 3+ (Future)
🟢 Nice-to-have + optimization

---

**Status:** 🟢 READY FOR IMPLEMENTATION  
**Created:** 2026-06-25  
**Owner:** Dev Team (n8n setup) + Ops (GHL setup)

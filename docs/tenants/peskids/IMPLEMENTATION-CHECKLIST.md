# PESKIDS SALES FUNNEL — IMPLEMENTATION CHECKLIST

## COMPLETED ✓ (12/16 items)

### API & Integration Layer
- [x] Contact creation webhook (`/api/public/tenants/peskids/webhooks/gohighlevel/leads`)
- [x] Multi-tenant isolation (tenant_slug validation)
- [x] Webhook idempotency (deduplication on lead_id)
- [x] GHL API credentials configured (Doppler: GOHIGHLEVEL_PESKIDS_*)
- [x] n8n handoff envelope (welcome_message, reminder, trial_class_invitation flags)

### Tags & Data
- [x] lead-web tag (auto-applied to web leads)
- [x] lead-n8n tag (for n8n-sourced leads)
- [x] trial-booked tag
- [x] active-student tag
- [x] renewal-due tag
- [x] Custom fields: child_name, child_age, interest_level, preferred_schedule

### Pipeline & Stages
- [x] Pipeline: "Peskids Enrollment" with 6 stages
  - [x] New Lead
  - [x] Contacted
  - [x] Trial Class
  - [x] Enrolled
  - [x] Active Student
  - [x] Renewal

### Calendar & Scheduling
- [x] Trial Class calendar (30-min slots, M-F 9-5)
- [x] Assessment calendar
- [x] Appointment status tracking (scheduled, completed, no_show, cancelled)

---

## PENDING ⚠ (4/16 items — Non-blocking)

### Email Templates (Step 4)
- [ ] Create template: "Peskids — Welcome Parent"
  - Trigger: Contact Created
  - Language: Spanish (Colombia)
  - Includes: program info, WhatsApp contact, trial booking link
  
- [ ] Create template: "Peskids — Trial Class Confirmation"
  - Trigger: Appointment Scheduled
  - Language: Spanish (Colombia)
  - Includes: date, time, pool address, what to bring, WhatsApp contact
  - Action: Add tag `trial_confirmed`, update stage to "Trial Class"

### SMS Templates (Step 5)
- [ ] Create template: "Peskids — Trial Reminder"
  - Trigger: Time-Based (24 hours before appointment)
  - Message: 160 chars max, Spanish
  - Variables: {{appointment.date}}, {{appointment.time}}, {{contact.name}}
  - Action: Add tag `trial_reminded`
  - Sample: "Hola {{contact.name}}, te recordamos tu clase de prueba en Peskids el {{appointment.date}} a las {{appointment.time}}. Lleva traje de baño y gorro. Responde CONFIRMAR o REAGENDAR."

### Workflow Automation
- [ ] Workflow 1: Welcome Lead
  - Trigger: Contact Created
  - Filter: Source is not "Internal"
  - Actions: Delay 2min → Send email → Add tag → Update stage to "Contacted"

- [ ] Workflow 2: Trial Confirmation
  - Trigger: Appointment Scheduled
  - Filter: Calendar contains "Trial"
  - Actions: Delay 1min → Send email → Add tag → Update stage to "Trial Class"

- [ ] Workflow 3: Trial Reminder
  - Trigger: Time-Based (24h before appointment)
  - Filter: Has appointment in "Trial Class" calendar
  - Actions: Send SMS → Add tag

- [ ] Workflow 4: No-show Follow-up
  - Trigger: Appointment Status Changed
  - Filter: Status = "No Show", Calendar = "Trial"
  - Actions: Wait 1h → Send SMS → Create task → Update stage to "Contacted"

---

## VALIDATION TEST CASES

### Test 1: Happy Path (Lead → Trial → Enrolled)
```
Step 1: Create contact via web form
  Expected: Contact appears in "New Lead" stage
  
Step 2: Contact receives welcome email (auto via Workflow 1)
  Expected: Email sent, tag "welcome_sent" applied, stage → "Contacted"
  Verify: Check email log in GHL, contact tags
  
Step 3: Contact books trial appointment
  Expected: Appointment created in "Trial Class" calendar
  
Step 4: Contact receives confirmation email (auto via Workflow 2)
  Expected: Email sent, tag "trial_confirmed" applied, stage → "Trial Class"
  Verify: Check email log, GHL contact details
  
Step 5: 24 hours before appointment
  Expected: SMS reminder sent (auto via Workflow 3)
  Verify: SMS log, tag "trial_reminded" applied
  
Step 6: Trial class happens
  Expected: Contact can mark attendance/no-show in GHL
  
Step 7: Conversion decision
  Expected: n8n receives webhook → decides enrollment
  Verify: Check n8n logs, Opsly executive dashboard
```

### Test 2: No-Show Recovery
```
Step 1: Contact has scheduled trial appointment
Step 2: Appointment marked "No Show"
  Expected: Auto-triggers Workflow 4
Step 3: After 1 hour
  Expected: SMS re-engagement message sent
  Expected: High-priority task created for owner
  Expected: Stage reverted to "Contacted"
```

### Test 3: Data Quality
```
Step 1: Create contact with missing fields (e.g., no phone)
  Expected: Contact still created, custom fields populated
Step 2: Create contact with duplicate email
  Expected: Idempotency check prevents duplicate
Step 3: Verify multi-tenant isolation
  Expected: Contact can only appear in Peskids location, not agency location
```

---

## GHL CONFIGURATION VERIFICATION

Run these commands to verify current state:

```bash
# Validate GHL configuration
./scripts/validate-ghl-config.sh --tenant peskids

# Check provisioning status
./scripts/ghl-provision-peskids.sh                # dry-run
./scripts/ghl-provision-peskids.sh --execute      # apply if needed

# Monitor lead sync
npm run ghl-peskids-operator-run -- --watch       # tail logs

# Smoke test email/SMS flows
./scripts/smoke-peskids-ghl.sh                    # creates test lead
```

---

## DEPLOYMENT CHECKLIST

- [ ] Email/SMS templates created in GHL UI
- [ ] Workflows 1-4 activated in GHL Automation
- [ ] Test lead created and verification completed
- [ ] Documentation updated with production GHL account details
- [ ] Team trained on Peskids GHL console
- [ ] Monitoring/alerting configured for webhook failures
- [ ] Backup/disaster recovery plan documented
- [ ] Compliance review (GDPR, TCPA, data retention for Colombia)

---

## REVENUE IMPACT

| Metric | Baseline | With Funnel | Improvement |
|--------|----------|------------|-------------|
| Lead Response Time | Manual (2-4h) | Automated (1-2min) | 60-120x faster |
| Trial Booking Rate | Estimated 30% | Target 50%+ | +20-67% |
| No-show Recovery | Manual follow-up only | Auto re-engagement | +15-25% recovery |
| Admin Time | 2h/day per 50 leads | <15min/day | -95% |

**Estimated Monthly Impact (100 leads/month):**
- Additional booked trials: +20-67 (assuming 50% booking rate)
- Additional no-show recoveries: +15-25 (assuming 15-25% recovery rate)
- Net new enrollments: +35-92 per month

**Monthly Recurring Revenue Impact (at $99/month per student):**
- Conservative: +35 × $99 = **+$3,465/month**
- Optimistic: +92 × $99 = **+$9,108/month**

---

## CRITICAL SUCCESS FACTORS

1. **Email Deliverability:** Ensure GHL email templates pass spam filters
2. **SMS Compliance:** Verify message content complies with Colombian telecom regulations
3. **Calendar Availability:** Confirm business hours & time zones match Peskids schedule
4. **n8n Integration:** Monitor handoff webhook for failures
5. **No-show Follow-up:** Test SMS triggers 24h before appointments

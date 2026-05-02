# CURSOR PROMPT: Opsly Local Services MVP — Week 1-4 Roadmap

## Context
Compressed roadmap for Opsly Local Services MVP (first 4 weeks). Use this to sequence tasks and hit $5k/mo target by Week 4.

## Timeline

### Week 1: Foundation (Database + API + Sales Email)

**Tech deliverables:**
- [ ] Supabase migration: `0046_local_services_core.sql` (5 tables + RLS)
- [ ] API routes: `/api/local-services/bookings`, `/api/local-services/quotes`
- [ ] Public booking form at `/apps/local-services/app/book`
- [ ] SendGrid integration for confirmation emails

**Operations deliverables:**
- [ ] Service catalog: Gamer PC Clean ($150), Laptop Speed-Up ($100-200), Office Support ($300)
- [ ] Sales Agent email template (first-response)
- [ ] Quote template (3-option format: A/B/C)

**Goal:** 2-3 test bookings, email flow working end-to-end

**Owner:** Claude (Cursor), Claude (Ops), Claude (Sales)

---

### Week 2: Customer Experience (Booking Portal + Confirmation)

**Tech deliverables:**
- [ ] Customer dashboard at `/apps/local-services/app/dashboard`
- [ ] Remaining API routes: `/api/local-services/services`, `/api/local-services/customers`, `/api/local-services/reports`
- [ ] Google Calendar integration (read your availability)
- [ ] Twilio webhook setup (WhatsApp optional, not blocking)

**Operations deliverables:**
- [ ] Service report template (post-visit)
- [ ] Booking confirmation workflow (email + SMS 24h before)
- [ ] First 3 real customer jobs scheduled

**Goal:** 5+ bookings/week, customer portal live, repeat bookings possible

**Owner:** Cursor (frontend), Codex (calendar + Twilio prep)

---

### Week 3: Automation & Recurring Revenue (n8n workflows)

**Tech deliverables:**
- [ ] n8n workflow: Booking confirmation → email + SMS
- [ ] n8n workflow: Post-service report generation (Claude writes description)
- [ ] n8n workflow: 7-day follow-up
- [ ] Stripe integration for $99/mo Maintenance Plan subscriptions

**Operations deliverables:**
- [ ] First maintenance plan subscriber
- [ ] Post-visit PDF report workflow tested
- [ ] Email sequences (7-day, 30-day upsell) drafted

**Goal:** 8+ bookings/week, 1-2 recurring subscribers, $5k/mo in sight

**Owner:** Codex (n8n), Claude (Stripe setup)

---

### Week 4: Polish & Scale (Admin Dashboard + Monitoring)

**Tech deliverables:**
- [ ] Admin dashboard at `/apps/admin/app/local-services`
- [ ] Revenue chart (weekly/monthly)
- [ ] Customer list + notes
- [ ] Booking status view

**Operations deliverables:**
- [ ] 10+ bookings/week running smoothly
- [ ] Customer testimonials (first 3)
- [ ] Plan Week 5 (assistant hiring)

**Goal:** $5k/mo sustainable, ready to hire assistant

**Owner:** Cursor (dashboard), You (business metrics)

---

## Critical Dependencies

| Task | Depends On | Owner |
|------|-----------|-------|
| Booking form | Migration + API | Cursor |
| Quote generation | Booking form + API | Claude (Ops) |
| Booking confirmation email | Quote API + SendGrid | Codex (n8n) |
| Customer dashboard | Booking API + Auth | Cursor |
| Maintenance plan | Stripe integration | Claude |
| Post-visit report | Booking completion + Claude | Codex (n8n) |

## Success Metrics (Week 4)

✅ **Volume:** 8-10 bookings/week  
✅ **Revenue:** $5k/mo ($3.5k from you, $1.5k margin on bookings)  
✅ **Repeat rate:** 20%+ (customers book 2nd time)  
✅ **Recurring:** 2-3 maintenance plan subscribers  
✅ **System uptime:** 99%+ (no lost bookings due to bugs)  
✅ **Customer satisfaction:** 4.5+ stars (first 5 reviews)  
✅ **Response time:** <1 hour email, <15min WhatsApp  

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Booking form too complex | Start simple: service, time, email. Add calendar Week 2 |
| Ops Agent overloaded | Pre-write 5 quote templates, reuse with context vars |
| Email delivery failures | Test SendGrid in staging, monitor bounce rate |
| RLS policy mistakes | Test tenant isolation before going live |
| Customer churn (no repeat) | Follow-up email mandatory (7-day check-in) |
| Assistant not ready by Week 5 | Start recruitment Week 3, hire by end of Week 4 |

## Daily Standups (Week 1-4)

**Quick check each morning:**
- [ ] How many new bookings since yesterday?
- [ ] Any customer issues or complaints?
- [ ] Any API errors in logs?
- [ ] Email delivery rate OK?
- [ ] What's blocking progress?

## Prompts to Reference

When working on this MVP, use these Cursor prompts for context:

| Task | Prompt |
|------|--------|
| Build API + database | `.cursor/prompts/local-services-tech-builder.md` |
| Generate quotes + reports | `.cursor/prompts/local-services-ops-admin.md` |
| Handle sales inquiries | `.cursor/prompts/local-services-sales-closer.md` |
| n8n workflows | `.cursor/prompts/local-services-automation.md` |

## Go/No-Go Criteria (End of Week 4)

**GO to Week 5 (hire assistant) if:**
- [ ] 8+ bookings/week running
- [ ] $5k/mo revenue (or on track)
- [ ] Customer repeat rate 20%+
- [ ] System stable (no major bugs)
- [ ] You have capacity to onboard assistant

**NO-GO (pivot) if:**
- [ ] <3 bookings/week (demand signal weak)
- [ ] >2 customer complaints (execution problem)
- [ ] System unreliable (>2 email failures)
- [ ] You burnt out (unsustainable solo)

---

**Next: Start Week 1 with Tech Builder prompt.**

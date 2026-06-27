---
status: draft
owner: operations
created: 2026-06-25
tenant_slug: icso
---

# ICSO — Website Enhancement (Fase 2)

**Contexto:** ICSO tiene 100% de funcionalidad básica (form → contact → calendar en GHL). Este spec cubre las mejoras para Phase 2: automatización de emails, workflows, y visibilidad de métricas.

**Estado actual:** ✅ Operacional (form → contact → discovery calendar)

**Mejoras propuestas:**
1. Email templates (welcome, confirmation, reminder)
2. GHL workflows automation
3. Metrics dashboard
4. No-show recovery workflow

---

## Alcance

### Mejoras Incluidas (Fase 2)

**1. Email Templates (3 nuevos)**
- Welcome: confirmación de recepción + próximos pasos
- Confirmation: cita de discovery call confirmada
- Reminder: recordatorio 24h antes de la cita

**2. GHL Workflows (2 nuevos)**
- Welcome workflow: se dispara al crear contact
- Reminder workflow: 24h antes de appointment

**3. Metrics Dashboard**
- Leads por semana
- Tasa de booking en calendario
- No-shows detectados
- Conversion rate (cita → contrato)

**4. Follow-up Automation (Future)**
- No-show recovery (SMS + email)
- Contract/proposal workflow
- Nurture email series (si no booking después de 3 días)

---

## Modelo de datos (sin cambios)

ICSO usa la infraestructura compartida con Agency:
- Location ID: `qD7Z9jt3owk0LMtKElow` (shared)
- Tags: `icso-website`, `discovery-scheduled`, `no-show`, `proposal-sent`
- Custom fields: company_name, service_interest

---

## Email Templates

### Template 1: Welcome Email

**Trigger:** Contact Created (source = "ICSO Website")  
**Subject:** "¡Gracias por contactarnos! Aquí te mostramos cómo es trabajar con Opsly"  
**Audience:** Nuevos leads de la web  
**Actions:**
- Send email immediately
- Add tag: `welcome_sent`

**Content outline:**
```
1. Header: Opsly branding
2. Body: 
   - Thank you for interest in Opsly
   - What we do (1-2 paragraphs)
   - Next step: book discovery call
3. CTA: "Schedule Discovery Call" (link to calendar)
4. Footer: Contact info + social links
```

**Personalization:**
- {{contact.first_name}} (fallback: "there")
- {{contact.company_name}} if provided

---

### Template 2: Confirmation Email

**Trigger:** Appointment Scheduled (calendar = "Discovery Call")  
**Subject:** "Tu cita de discovery con Opsly está confirmada — {{appointment.date}} a las {{appointment.time}}"  
**Audience:** Leads que reservaron discovery  
**Actions:**
- Send email immediately
- Add tag: `discovery_confirmed`
- Update stage: "Contacted" → "Discovery Scheduled"

**Content outline:**
```
1. Header: Opsly branding
2. Body:
   - Confirmation of discovery call
   - Date, time, duration (30 min)
   - How it works (what to expect)
   - Team member intro + photo
   - Prep checklist (have ideas ready)
3. CTA: "Reschedule if needed" (icalendar attachment)
4. Footer: Calendar link + cancellation link
```

**Personalization:**
- {{appointment.date}} formatted
- {{appointment.time}} in client timezone
- {{team_member.name}} (assigned discovery rep)

---

### Template 3: Reminder Email

**Trigger:** Time-based (24 hours before appointment)  
**Subject:** "Recordatorio: Tu discovery call con Opsly es mañana a las {{appointment.time}}"  
**Audience:** Contacts with confirmed discovery calls  
**Actions:**
- Send email 24h before
- Add tag: `discovery_reminded`

**Content outline:**
```
1. Header: Opsly branding
2. Body:
   - Quick reminder of tomorrow's call
   - Time + team member
   - What to bring/prepare
   - Zoom/video call link (if applicable)
3. CTA: "Reschedule if needed" (link to calendar)
4. Footer: Support contact if questions
```

---

## GHL Workflows

### Workflow 1: Welcome Sequence

**Name in GHL:** "ICSO — Welcome"  
**Trigger:** Contact Created  
**Trigger filters:**
- Source = "ICSO Website"
- NOT (already has tag `welcome_sent`)

**Actions:**
1. Delay: 2 minutes
2. Send email: "Welcome Email" template
3. Add tag: `welcome_sent`

**Test:** Create new contact from web form → verify email received within 5 min

---

### Workflow 2: Discovery Reminder

**Name in GHL:** "ICSO — Discovery Reminder"  
**Trigger:** Time-based (24 hours before appointment)  
**Trigger filters:**
- Calendar = "Discovery Call"
- NOT (already has tag `discovery_reminded`)

**Actions:**
1. Send email: "Reminder Email" template
2. Send SMS (optional): "Your discovery call with Opsly is tomorrow at {time}. Reply YES to confirm."
3. Add tag: `discovery_reminded`

**Test:** Schedule appointment → wait 24h OR manually trigger

---

### Workflow 3: No-show Recovery (Future)

**Name in GHL:** "ICSO — No-show Follow-up"  
**Trigger:** Appointment Status Changed (status = "No Show")  
**Trigger filters:**
- Calendar = "Discovery Call"

**Actions:**
1. Wait: 1 hour
2. Send SMS: "We missed you today. Let's reschedule: [link]"
3. Create task: "ICSO: No-show follow-up needed"
4. Add tag: `no_show_recovery_sent`

**Success metric:** 15-25% re-engagement rate

---

## Metrics Dashboard

**Location:** `/admin/icso/metrics` (new page)

**Refresh rate:** Real-time (Supabase listening)

### Dashboard Sections

#### 1. Lead Volume

```
┌─────────────────────────┐
│ This Week: 12 leads     │
│ Last week: 8 leads      │
│ Trend: ↑ 50%            │
│                         │
│ Sources:                │
│ - Web form: 9           │
│ - Direct: 3             │
└─────────────────────────┘
```

**SQL:**
```sql
SELECT COUNT(*) as lead_count, date_trunc('week', created_at)
FROM platform.icso_contacts
GROUP BY date_trunc('week', created_at)
ORDER BY date_trunc DESC
```

#### 2. Calendar Booking Rate

```
┌──────────────────────────────┐
│ Booking Rate: 58%            │
│                              │
│ This week:                   │
│ - Forms submitted: 12        │
│ - Bookings: 7                │
│ - Bounce rate: 42%           │
└──────────────────────────────┘
```

**SQL:**
```sql
SELECT 
  COUNT(c.id) as total_contacts,
  COUNT(DISTINCT CASE WHEN c.has_appointment THEN c.id END) as with_appointment,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN c.has_appointment THEN c.id END) / COUNT(c.id), 1) as booking_rate
FROM platform.icso_contacts c
WHERE c.created_at >= NOW() - INTERVAL '7 days'
```

#### 3. Scheduled Appointments

```
┌────────────────────────┐
│ This Week: 7 appts     │
│ Next 7 days: 5 appts   │
│ No-shows: 0            │
│ Completed: 3           │
│ Attended rate: 100%    │
└────────────────────────┘
```

**SQL:**
```sql
SELECT 
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as upcoming,
  COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM platform.icso_appointments
WHERE calendar_id = 'discovery_call'
```

#### 4. Conversion Funnel

```
┌──────────────────────┐
│ Lead → Discovery     │
│ 12 leads             │
│  └─ 7 booked (58%)   │
│     └─ 3 completed   │
│        └─ 1 proposal │
│           └─ 0 closed│
└──────────────────────┘
```

#### 5. Email Performance

```
┌──────────────────────────────┐
│ Welcome Email                │
│ - Sent: 12                   │
│ - Delivered: 11 (92%)        │
│ - Open rate: 72%             │
│ - CTA click: 58%             │
│                              │
│ Confirmation Email           │
│ - Sent: 7                    │
│ - Delivered: 7 (100%)        │
│ - Open rate: 85%             │
│ - CTA click: 85%             │
└──────────────────────────────┘
```

**Integration:** Via GHL reporting API or manual export

---

## Implementation Plan

### Phase 2a: Email + Workflows (Week 1)

**Tasks:**

1. **Create 3 email templates** (30 min)
   - Welcome Email
   - Confirmation Email
   - Reminder Email

2. **Create 2 GHL workflows** (45 min)
   - Welcome workflow
   - Reminder workflow

3. **E2E testing** (30 min)
   - Submit form → receive welcome email
   - Schedule appointment → receive confirmation
   - Wait 24h → receive reminder (manual trigger)

4. **Update docs** (15 min)
   - Document template IDs
   - Document workflow IDs
   - Add troubleshooting guide

**Owner:** Ops Lead + Marketing  
**Time estimate:** 2 hours  
**Dependency:** None — ready to start

### Phase 2b: Metrics Dashboard (Week 2)

**Tasks:**

1. **Create dashboard page** (1 hour)
   - React component: `/apps/admin/app/admin/icso/metrics/page.tsx`
   - Real-time data fetching (Supabase listener)
   - Responsive layout

2. **Implement API endpoint** (1 hour)
   - GET `/api/admin/icso/metrics`
   - Returns: leads, bookings, appointments, emails
   - Caching: 5 min

3. **Add to admin nav** (15 min)
   - Link in sidebar: "ICSO Metrics"
   - Dashboard view

4. **E2E testing** (1 hour)
   - Submit 10 test forms
   - Verify dashboard updates
   - Verify calculations correct

**Owner:** Dev Lead  
**Time estimate:** 3.5 hours  
**Dependency:** Phase 2a complete

### Phase 2c: No-show Recovery (Week 3)

**Tasks:**

1. **Create GHL workflow** (30 min)
   - Trigger on no-show
   - Send SMS + create task
   - Add tag

2. **Create SMS template** (15 min)
   - Short message (<160 chars)
   - Include reschedule link

3. **Testing** (30 min)
   - Manual mark as no-show
   - Verify SMS sent
   - Verify task created

**Owner:** Ops Lead  
**Time estimate:** 1.5 hours  
**Dependency:** Phase 2a complete

---

## Success Metrics

### Email Performance

- ✅ 95%+ delivery rate
- ✅ 70%+ open rate (welcome)
- ✅ 60%+ CTA click rate
- ✅ <100ms send latency

### Workflow Automation

- ✅ 100% of contacts receive welcome email
- ✅ 100% of booked appointments receive confirmation
- ✅ 95% of upcoming appointments receive reminder
- ✅ 0 workflow failures (retry on error)

### Dashboard Metrics

- ✅ Real-time updates (<2s)
- ✅ Accurate calculations (verified manually)
- ✅ Mobile responsive (works on mobile)
- ✅ <500ms page load time

---

## Testing & Validation

### E2E Test Cases

**Test 1: Complete Flow**
1. Submit web form with name, email, company
2. Verify welcome email received within 5 min
3. Click calendar link in email
4. Book appointment (e.g., tomorrow 2 PM)
5. Verify confirmation email received within 1 min
6. Verify no-show recovery SMS NOT sent yet
7. Mark appointment as no-show in GHL
8. Verify recovery SMS sent within 2 min
9. Verify task created for ops team

**Test 2: Email Deliverability**
- Send to test@example.com
- Verify headers correct (from, reply-to, etc.)
- Verify no spam filters triggered
- Check bounce rate

**Test 3: Workflow Idempotency**
- Create contact twice (same email)
- Verify welcome email sent only once
- Verify no duplicate tags

### Smoke Test

```bash
./scripts/smoke-icso-e2e.sh
# Expected output:
# ✓ Form submission successful
# ✓ Welcome email sent
# ✓ Appointment created
# ✓ Confirmation email sent
# ✓ Metrics dashboard updated
# All tests passed (5/5)
```

---

## Monitoring & Alerting

### Dashboard Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Email failure | >5% delivery failure | Page ops |
| Workflow failure | 0 executions in 1h | Check GHL UI |
| High bounce rate | >15% bounce | Review template |
| No bookings | 0 bookings in 24h | Check calendar availability |

### Logging

All events logged to `platform.metrics_log`:
- `icso.email.sent` — email template sent
- `icso.email.delivered` — email delivered
- `icso.email.bounce` — delivery failure
- `icso.workflow.executed` — workflow ran
- `icso.appointment.created` — booking confirmed
- `icso.appointment.no_show` — attendance missed

---

## Rollout Plan

### Week 1: Email + Workflows

**Timeline:**
- Mon: Create templates (30 min)
- Tue: Create workflows (45 min)
- Wed: E2E testing (1 hour)
- Thu: Documentation (30 min)
- Fri: Demo to stakeholders

**Go-live:** Friday EOD (non-breaking)

### Week 2: Metrics Dashboard

**Timeline:**
- Mon-Tue: Build dashboard (2 hours)
- Wed: Implement API (1 hour)
- Thu: E2E testing (1 hour)
- Fri: Deploy + demo

**Go-live:** Friday EOD (feature flag optional)

### Week 3: No-show Recovery

**Timeline:**
- Mon: Create workflow (30 min)
- Tue-Wed: Testing (1.5 hours)
- Thu: Monitor + adjust
- Fri: Complete + demo

**Go-live:** Friday EOD

---

## Known Limitations

❌ **Not Included:**
- Lead scoring (manual tagging in GHL)
- Conversion logic (n8n required)
- Nurture sequences (Phase 3)
- Mobile app notifications

### Workarounds:
- Use GHL tags for prioritization
- Conversion logic stays in GHL workflows
- Email sequences as step 1 (SMS in Phase 3)

---

## Future Enhancements (Phase 3+)

1. **Lead Scoring** — Auto-rank by engagement
2. **Nurture Campaign** — Auto-send email if no booking after 3 days
3. **Proposal Automation** — Send proposal via Stripe + DocuSign
4. **Contract Tracking** — Monitor signing + payment
5. **Mobile App** — Push notifications for new leads

---

## Success Criteria (End of Phase 2)

✅ **Email Automation**
- [ ] 3 email templates created + tested
- [ ] Welcome email sent to all new leads
- [ ] Confirmation email sent to booked appointments
- [ ] >95% email delivery rate

✅ **Workflows**
- [ ] 2 workflows active in GHL
- [ ] 0 workflow failures
- [ ] All automation triggers working

✅ **Metrics Dashboard**
- [ ] Dashboard live at `/admin/icso/metrics`
- [ ] Real-time updates working
- [ ] All 5 sections displaying correctly
- [ ] Calculations verified vs manual count

✅ **Documentation**
- [ ] Template IDs documented
- [ ] Workflow IDs documented
- [ ] Dashboard usage guide created
- [ ] Troubleshooting guide added

---

## Appendix: Email Template Copy (Drafts)

### Welcome Email (Spanish)

**Subject:** ¡Gracias por contactarnos! Aquí te mostramos cómo es trabajar con Opsly

Dear {{contact.first_name}},

Gracias por tu interés en Opsly. Te estamos felices de conocerte.

En Opsly, ayudamos a empresas como la tuya a automatizar sus procesos de ventas y crecimiento, para que tengas más leads, conversiones y menos trabajo manual.

¿Cómo funcionamos?
- Discovery call (30 min): Entendemos tu negocio
- Custom solution: Diseñamos tu automatización
- Implementation: Ponemos en marcha
- Success: Monitoreamos y optimizamos

El siguiente paso es simple: **agenda tu discovery call** haciendo clic aquí:

[Agendar Discovery Call]

¿Alguna pregunta? Responde este email.

¡Nos vemos pronto!

—  
Equipo Opsly

---

**Status:** 🟡 DRAFT (awaiting approval)  
**Owner:** Operations + Marketing  
**Review cycle:** Before Phase 2 launch

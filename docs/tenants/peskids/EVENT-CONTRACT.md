# Peskids Event Contract

**Purpose:** Define all events that Peskids emits to Opsly platform. Events are used for analytics, integrations, audit logs, and future automations.

**Principles:**
- Every user action → event
- Core contact PII allowed in event body (name, email, phone are essential to lead/feedback records)
- User-agent and IP address NOT included (no tracking/fingerprinting)
- Events are immutable (no editing history, only new events)
- At-least-once delivery (may retransmit, consumer must handle idempotency)
- Events logged for 90 days
- All events scoped to tenant (tenant_id always included)

---

## Event: lead.created

**Producer:** Lead capture form → API endpoint  
**Consumer:** Dashboard (real-time card update), follow-up workflow, Opsly analytics  
**Timing:** Immediately after form submit  

**Payload:**
```json
{
  "event_type": "lead.created",
  "event_id": "uuid-unique-per-event",
  "tenant_id": "peskids",
  "tenant_slug": "peskids",
  "timestamp": "2026-05-20T10:15:30Z",
  "lead_id": "uuid-lead-id",
  "name": "Maria Rodriguez",
  "email": "maria@example.com",
  "phone": "+1-555-123-4567",
  "grade_interested": "K-5",
  "referral_source": "Friend",
  "metadata": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "referrer_url": "https://peskids.app"
  }
}
```

**Schema Validation:**
- event_type: string (required, fixed: "lead.created")
- event_id: UUID (required, unique)
- tenant_id: string (required)
- timestamp: ISO8601 (required)
- lead_id: UUID (required)
- name: string (required, 2–50 chars)
- email: string (required, valid email)
- phone: string (optional, max 20 chars)
- grade_interested: enum (required: K-5, 6-8, 9-12, Other)
- referral_source: string (optional)

**Retry Behavior:** At-least-once, 3 attempts, 5s backoff

**Privacy:** No passwords, no PII beyond name/email/phone (needed for followup)

**Future Uses:**
- Lead source attribution (which channel converts best?)
- Duplicate detection (same email, different lead?)
- Bulk import (load historical leads from CSV)
- Webhook trigger (future: generate welcome email draft for manual approval)

---

## Event: lead.updated

**Producer:** Admin edits lead details in dashboard  
**Consumer:** Audit log, external CRM sync (future)  
**Timing:** When admin changes lead status, adds notes, etc.  

**Payload:**
```json
{
  "event_type": "lead.updated",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T14:00:00Z",
  "lead_id": "uuid-lead-id",
  "changes": {
    "status": { "old": "new", "new": "contacted" },
    "admin_notes": { "old": "", "new": "Interested in K–5 program" }
  },
  "updated_by": "admin-user-id"
}
```

**Retry Behavior:** At-least-once, 3 attempts

**Use Cases:** Audit trail (who changed what, when?)

---

## Event: feedback.created

**Producer:** Parent feedback form → API  
**Consumer:** Dashboard (real-time update), admin alerts (if satisfaction < 3)  
**Timing:** Immediately after form submit  

**Payload:**
```json
{
  "event_type": "feedback.created",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T16:45:00Z",
  "feedback_id": "uuid-feedback-id",
  "child_name": "Emma Martinez",
  "satisfaction": 5,
  "suggestion": "Love the new art program!",
  "contact_wanted": false,
  "metadata": {
    "form_source": "dashboard",
    "completion_time_seconds": 45
  }
}
```

**Schema:**
- satisfaction: int (1–5, required)
- child_name: string (required)
- suggestion: string (optional, max 500)
- contact_wanted: boolean (default false)

**Retry Behavior:** At-least-once, 3 attempts

**Side Effects:**
- If satisfaction < 3 → emit `feedback.alert` event for admin
- Dashboard real-time update

**Future:** Sentiment analysis, keyword extraction, trend analysis

---

## Event: feedback.alert

**Producer:** feedback.created handler (if satisfaction < 3)  
**Consumer:** Admin notification system (email, Slack, etc.)  
**Timing:** Within 1 minute of feedback.created  

**Payload:**
```json
{
  "event_type": "feedback.alert",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T16:46:00Z",
  "feedback_id": "uuid-feedback-id",
  "severity": "medium",
  "message": "Parent feedback: Emma Martinez rated experience 2/5",
  "action_url": "/dashboard/feedback/{feedback_id}"
}
```

**Retry:** At-least-once, 5 attempts (important for admins)

---

## Event: followup.created

**Producer:** Admin creates follow-up from lead/feedback detail view  
**Consumer:** Dashboard, reminder system (future)  
**Timing:** On creation  

**Payload:**
```json
{
  "event_type": "followup.created",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T10:30:00Z",
  "followup_id": "uuid-followup-id",
  "contact_id": "uuid-lead-or-student-id",
  "contact_type": "lead",
  "type": "call",
  "due_date": "2026-05-22",
  "notes": "Follow up on enrollment interest",
  "created_by": "admin-user-id"
}
```

**Schema:**
- contact_type: enum (lead, student, parent)
- type: enum (call, email, sms, in-person)
- due_date: ISO8601 date
- notes: string (optional)

**Future:** Smart reminders, suggested next follow-up date

---

## Event: followup.completed

**Producer:** Admin marks follow-up as done in dashboard  
**Consumer:** Audit log, analytics, followup workflow  
**Timing:** On completion  

**Payload:**
```json
{
  "event_type": "followup.completed",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-22T11:00:00Z",
  "followup_id": "uuid-followup-id",
  "outcome": "interested",
  "outcome_notes": "Parent wants to enroll 2 children",
  "next_followup_date": "2026-05-29",
  "completed_by": "admin-user-id"
}
```

**Schema:**
- outcome: enum (interested, not-interested, followup-needed, completed)
- outcome_notes: string (optional, max 500)
- next_followup_date: ISO8601 date (optional)

---

## Event: student.created

**Producer:** Admin adds student record (from enrollment)  
**Consumer:** Dashboard, analytics  
**Timing:** On creation  

**Payload:**
```json
{
  "event_type": "student.created",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-25T09:00:00Z",
  "student_id": "uuid-student-id",
  "name": "Emma Martinez",
  "grade": "K-5",
  "status": "active",
  "parent_name": "Maria Martinez",
  "parent_email": "maria@example.com",
  "enrollment_date": "2026-05-25"
}
```

**Future:** Sync with payment system, generate welcome email draft for manual approval

---

## Event: teacher.note.created

**Producer:** Teacher creates note about student  
**Consumer:** Audit log, analytics  
**Timing:** On creation  

**Payload:**
```json
{
  "event_type": "teacher.note.created",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T15:30:00Z",
  "note_id": "uuid-note-id",
  "student_id": "uuid-student-id",
  "teacher_id": "uuid-teacher-id",
  "observation": "Emma is doing great in math. Very engaged.",
  "note_date": "2026-05-20",
  "followup_needed": false
}
```

---

## Event: weekly_report.requested

**Producer:** Admin clicks "Generate Report" or cron job triggers  
**Consumer:** Report generation service  
**Timing:** Weekly (Monday 8 AM)  

**Payload:**
```json
{
  "event_type": "weekly_report.requested",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T08:00:00Z",
  "report_id": "uuid-report-id",
  "week_start": "2026-05-19",
  "week_end": "2026-05-25",
  "requested_by": "system-cron",
  "recipient_email": "owner@peskids.example.com"
}
```

---

## Event: weekly_report.generated

**Producer:** Report generation service (after aggregating data)  
**Consumer:** Email service, dashboard  
**Timing:** Within 5 min of weekly_report.requested  

**Payload:**
```json
{
  "event_type": "weekly_report.generated",
  "event_id": "uuid-unique",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T08:10:00Z",
  "report_id": "uuid-report-id",
  "summary": {
    "new_leads": 5,
    "new_students": 2,
    "feedback_count": 8,
    "avg_satisfaction": 4.2,
    "pending_followups": 3
  },
  "report_url": "https://peskids.app/reports/{report_id}"
}
```

---

## Event Processing

### Event Flow
```
1. User action (form submit, button click)
   ↓
2. API handler validates & stores in DB
   ↓
3. Emit event to Opsly event bus
   ↓
4. Event logged (Supabase `events` table)
   ↓
5. Consumers process (dashboard, alerts, etc.)
   ↓
6. Retry if delivery fails (exponential backoff)
```

### Delivery Guarantee
- **At-least-once:** Event may be delivered multiple times
- **Idempotency:** Consumers must handle duplicate events (check event_id)
- **Order not guaranteed:** Events may arrive out-of-order (use timestamp for ordering)

### Logging
**All events logged to:** `events` table
```sql
CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (tenant_id, event_type, created_at)
);
```

### Retention
- Events retained for 90 days
- Archive to cold storage after 90 days
- Deleted after 1 year (compliance)

---

## Event Publishing

**Endpoint:** `POST /api/events`

**Auth:** Internal (service-to-service, no user auth)

**Request:**
```json
{
  "event_type": "lead.created",
  "tenant_id": "peskids",
  "payload": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "uuid-assigned",
  "timestamp": "2026-05-20T10:15:30Z"
}
```

**Rate Limit:** 1000 events/min per tenant (burst to 5000)

---

## Consumer Integration

**How to consume Peskids events in other Opsly services:**

1. **Supabase Realtime:** Subscribe to `events` table changes
2. **Webhook:** Configure Peskids to POST events to your endpoint
3. **Batch query:** Poll `events` table (for non-real-time)
4. **Event stream:** Future: Kafka/Redis stream

**Example (Supabase Realtime):**
```javascript
const channel = supabase
  .channel('public:events')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'events',
      filter: 'tenant_id=eq.peskids'
    },
    (payload) => {
      console.log('New event:', payload.new.event_type);
      // Process event...
    }
  )
  .subscribe();
```

---

## Event Validation

**All events validated against JSON Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["event_type", "event_id", "tenant_id", "timestamp"],
  "properties": {
    "event_type": { "type": "string" },
    "event_id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "payload": { "type": "object" }
  }
}
```

**Invalid events:** Rejected with 400 error, logged for debugging

---

## Event: whatsapp.message.received (planificado — MVP+1)

**Producer:** Webhook Jelou/Meta → n8n `peskids-whatsapp-inbound`  
**Consumer:** Dashboard cola WhatsApp, posible vínculo a `lead_id`  
**Timing:** Al recibir mensaje inbound  
**Sprint 01:** No implementado — ver [WHATSAPP-CHANNEL.md](./WHATSAPP-CHANNEL.md)

**Payload (borrador):**
```json
{
  "event_type": "whatsapp.message.received",
  "event_id": "uuid",
  "tenant_id": "peskids",
  "timestamp": "2026-05-20T16:00:00Z",
  "message_id": "provider-message-id",
  "from_phone": "+57...",
  "body_preview": "first 200 chars",
  "direction": "inbound"
}
```

**Privacy:** No almacenar media binaria en evento; solo referencia.

**Prohibido en Fase 1:** disparar envío outbound automático.

---

## Event Versioning

**Current version:** 1.0

**Future:** If event schema changes (add field, rename, etc.), use versioning:
- `event_type_v2`, or
- `version` field in payload

No breaking changes without new version.

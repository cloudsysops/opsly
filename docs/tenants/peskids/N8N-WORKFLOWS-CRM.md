---
status: ready-to-implement
owner: operations
created: 2026-07-01
type: tenant-workflows
tags:
  - n8n
  - peskids
  - crm-lead-capture
---

# n8n Workflows for Peskids (CRM/Lead Capture)

**Purpose:** Lead capture, student enrollment, parent notifications  
**Platform:** n8n (open-source)  
**Container:** `n8n-peskids` on VPS (Tailscale 100.120.151.91)  
**Dashboard:** `https://peskids.op-sly.com/n8n/`

---

## Workflow 1: Lead Capture & Hot Lead Alert

**Trigger:** Form POST from landing page → `/n8n/webhooks/lead-capture`

**Steps:**
1. **Webhook (POST)** → Listen for lead form submission
2. **Validate Input** → Check required fields (name, email, phone)
3. **Supabase Insert** → Write to `peskids_leads` (status='new')
4. **Send Confirmation Email** → Template: Spanish + English
5. **Slack Alert** → Notify #peskids-leads
6. **Auto-create Follow-up** → Due: 24 hours

**n8n UI Setup:**
```
1. Webhook node (POST /lead-capture)
2. Function node → Validate required fields
3. Supabase Insert → peskids_leads
4. Email node → Send confirmation (use SendGrid or SMTP)
5. Slack notification → Post to #peskids-leads
6. HTTP node → POST to /api/followups
7. Response node → Return 200 OK + lead ID
```

**Test:**
```bash
curl -X POST http://localhost:5679/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "María García",
    "email": "maria@example.com",
    "phone": "555-1234",
    "source": "web",
    "class_modality": "domicilio",
    "neighborhood": "Envigado",
    "grade_interested": "6-8",
    "referral_source": "Instagram"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Lead received. We'll contact you within 24 hours!"
}
```

---

## Workflow 2: Student Enrollment & Welcome Email

**Trigger:** POST `/api/students` (student enrolled in class)

**Steps:**
1. **Webhook (POST)** → Listen for enrollment
2. **Supabase Insert** → Write to `peskids_students`
3. **Query Parent** → Fetch parent email from `peskids_parents`
4. **Send Welcome Email** → Template: class schedule, syllabus, contact info
5. **Slack Alert** → Notify teacher + admin
6. **Schedule Reminders** → Trigger class day reminders (1 hour before)

**n8n UI Setup:**
```
1. Webhook node (POST /webhook/student-enrollment)
2. Supabase Insert → peskids_students
3. Supabase Query → Find parent by student.parent_id
4. Email node → Send welcome email (parent language preference)
5. Slack notification → #peskids-teachers
6. Cron node → Schedule daily reminders (6 PM day before class)
7. Response node → 200 OK
```

**Email Template (Spanish):**
```
Hola [parent_name],

¡Bienvenido a Peskids! Tu hijo/a [student_name] ha sido inscrito en:

📚 Clase: [class_name]
👨‍🏫 Profesor: [teacher_name]
⏰ Horario: [class_schedule]
📍 Ubicación: [class_location]

¿Preguntas? Responde a este correo o llama a [phone]

¡Nos vemos pronto!
Equipo Peskids
```

---

## Workflow 3: Parent Feedback & Rating Alerts

**Trigger:** POST `/api/feedback` (parent/teacher submits feedback)

**Steps:**
1. **Webhook (POST)** → Listen for feedback submission
2. **Supabase Insert** → Write to `peskids_feedback`
3. **IF rating < 3** → Send high-priority Slack alert to owner
4. **Log Analytics** → Track feedback trends
5. **Weekly Digest** → Compile all feedback, email to owner (Sundays 6 PM)

**n8n UI Setup:**
```
1. Webhook node (POST /webhook/feedback)
2. Supabase Insert → peskids_feedback
3. Switch node → Check if rating < 3
   - True: Slack HIGH PRIORITY alert
   - False: Continue
4. Supabase Insert → analytics table
5. Cron node (weekly, Sundays 6 PM)
   - Supabase Query → all feedback from past week
   - Format report
   - Email to owner
```

**Low Rating Alert (Slack):**
```
🚨 LOW RATING ALERT
Student: [student_name]
Class: [class_name]
Rating: ⭐⭐ (2/5)
Comment: [feedback_text]
Posted: [time]
👉 [View in Dashboard]
```

**Weekly Digest (Email):**
```
Resumen Semanal de Feedback — Peskids

Total Feedback: 12
Promedio: ⭐⭐⭐⭐ (4.2/5)

✅ Positivos (8):
- "Profesor muy dedicado"
- "Mi hijo ama la clase"

⚠️ Bajo Rating (2):
- "Timing doesn't work for us" (Rating: 2/5)
- "Material too advanced" (Rating: 3/5)

📊 Por Clase:
Python 101: ⭐⭐⭐⭐⭐ (5.0)
Web Dev: ⭐⭐⭐⭐ (4.0)
Data Science: ⭐⭐⭐ (3.5)

[View Full Dashboard]
```

---

## Workflow 4: Jelou (WhatsApp) Message Routing

**Trigger:** Inbound WhatsApp message from Jelou

**Steps:**
1. **Webhook (POST)** → Listen for Jelou messages
2. **Extract Phone** → Get sender phone number
3. **Query Parent** → Find parent by phone in `peskids_parents`
4. **Intelligent Routing:**
   - Enrollment question → Auto-reply with class info
   - Payment question → Route to admin
   - General inquiry → Route to teacher
5. **Store Message** → Log in `peskids_messages` (approval_status='pending')
6. **Send Reply** → Via Jelou API

**n8n UI Setup:**
```
1. Webhook node (POST /webhook/jelou)
2. Function node → Extract phone + message text
3. Supabase Query → Find parent
4. AI/LLM node (optional) → Analyze message intent
5. Switch node → Route based on intent
   - If "enroll" or "clase" → Supabase query class info → send auto-reply
   - If "payment" or "pago" → Create ticket + route to admin
   - Else → Route to assigned teacher
6. Supabase Insert → peskids_messages
7. Jelou HTTP → Send reply
```

**Auto-Reply (Enrollment Question):**
```
Hola! 👋

Gracias por tu interés en Peskids. 

Nuestras clases disponibles:
📚 Python 101 - Lunes 4PM
🌐 Web Dev - Miércoles 6PM
📊 Data Science - Viernes 5PM

¿Cuál te interesa? Un agente te contactará pronto. 😊
```

---

## Workflow 5: Daily Class Reminders

**Trigger:** Cron (every day at 6 PM)

**Steps:**
1. **Cron Trigger** → Every day at 6 PM
2. **Supabase Query** → Get all classes happening tomorrow
3. **For each class:**
   - Get enrolled students
   - Get parent contact info
   - Send SMS/WhatsApp reminder
   - Get teacher contact info
   - Send teacher reminder

**n8n UI Setup:**
```
1. Cron node → Schedule "0 18 * * *" (6 PM)
2. Supabase Query → Classes tomorrow
3. Loop node → For each class:
   - Query enrolled students
   - For each student, get parent phone
   - Send WhatsApp reminder via Jelou
   - Send teacher Slack notification
4. Log execution → analytics table
```

**Parent Reminder (WhatsApp):**
```
📚 Recordatorio: Clase mañana

Tu hijo/a tiene:
🎓 Clase: [class_name]
⏰ Hora: [time]
👨‍🏫 Profesor: [teacher_name]

¿Preguntas? Contáctanos 📞
```

---

## Workflow 6: Monthly Parent Report Card

**Trigger:** Cron (last day of month, 7 PM)

**Steps:**
1. **Cron Trigger** → Last day of month at 7 PM
2. **Supabase Query** → Get all students with performance data
3. **Generate Report** → For each student:
   - Attendance rate
   - Assignments completed
   - Teacher comments
   - Rating from feedback
4. **Email Report** → Send to parent in their language

**n8n UI Setup:**
```
1. Cron node → Schedule last day of month
2. Supabase Query → students with attendance + grades
3. Function node → Generate report HTML
4. Email node → Send with PDF attachment
```

**Report Template:**
```
Reporte Mensual: [Student Name]
Mes: Junio 2026

📊 Asistencia
Clases asistidas: 4/4 (100%)
Status: ✅ Excelente

✏️ Tareas
Tareas completadas: 8/8 (100%)
Promedio: 9.2/10

💭 Comentario del Profesor
"[Student] ha mostrado mucho progreso. Participa activamente en clase."

⭐ Satisfacción Familiar: 5/5 ⭐⭐⭐⭐⭐

[Ver Detalles en Dashboard]
```

---

## Deployment Checklist

- [ ] n8n container running on VPS
- [ ] Supabase credentials configured
- [ ] Slack token configured
- [ ] Jelou API key configured (WhatsApp)
- [ ] Email service configured (SendGrid or SMTP)
- [ ] All 6 workflows created and tested
- [ ] Webhook URLs added to landing page form
- [ ] Monitoring alerts set up
- [ ] Team trained on dashboard

---

## Monitoring & Error Handling

**Execution Dashboard:**
- Login: https://peskids.op-sly.com/n8n/
- Check workflow execution logs daily
- Set up error alerts → #peskids-alerts on Slack

**Retry Logic:**
- Failed webhooks: Retry 3x with exponential backoff (2s, 4s, 8s)
- Failed emails: Retry 2x (5 min, 30 min delays)
- Slack notifications: No retry (best effort)

---

## Testing Checklist

```bash
# Test lead capture workflow
curl -X POST http://localhost:5679/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@test.com","phone":"555-1234","source":"web"}'

# Verify Supabase insert
# Verify Slack notification sent
# Verify email sent
# Verify follow-up created

# Test student enrollment
curl -X POST http://localhost:5679/webhook/student-enrollment \
  -H "Content-Type: application/json" \
  -d '{"parent_id":"xxx","student_name":"Test Kid","class_id":"yyy"}'

# etc...
```

---

## Next Steps

1. Deploy n8n-peskids container to VPS
2. Create workflow 1 (Lead Capture) — test with curl
3. Create workflow 2 (Enrollment) — test with mock data
4. Create workflow 3 (Feedback Alerts) — test with low rating
5. Create workflow 4 (Jelou Integration) — test with WhatsApp
6. Create workflow 5 (Daily Reminders) — schedule and verify
7. Create workflow 6 (Monthly Reports) — schedule for month-end
8. Go live: Update landing page to POST to n8n webhook

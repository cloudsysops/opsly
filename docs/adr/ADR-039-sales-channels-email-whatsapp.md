# ADR-039 — Sales channels: Email (Week 1-2) + WhatsApp (Week 1+)

## Estado

Aceptado (2026-05-02)

## Arquitecto

**Claude** — Decisión de canales de comunicación y arquitectura de Sales Agent

## Contexto

Opsly Local Services necesita adquirir clientes sin contact center / sales team. Sales Agent (Claude IA) debe responder leads vía múltiples canales.

**Canales disponibles:**
- **Email** — asíncrono, profesional, escalable, requiere Setup: SendGrid
- **WhatsApp** — síncrono, personal, RI market uses, requiere Setup: Twilio
- **SMS** — synchronous, no context, expensive
- **Phone** — requires call center (out of scope MVP)
- **Web chat** — synchronous, resource-heavy
- **Social DMs** — fragmented, low priority MVP

**Pregunta clave:** Cuál(es) canal(es) para MVP (Week 1-2), cuándo agregar más?

## Alternativas Consideradas

### Opción A: Email solo (semanas 1-4)
- Week 1-2: Web form → email to customer + to Sales Agent digest
- Sales Agent responds via email (1h SLA)
- Customers reply, booking confirmed

**Ventajas:**
- Simplest to implement
- Professional tone
- Async (Sales Agent no must online 24/7)

**Limitaciones:**
- Slower customer response cycle (email = delayed gratification)
- Lower conversion (customer forgets lead, moves to competitor)
- Local market (RI tech services) prefers WhatsApp over email

**Seleccionada para Week 1-2 (foundation)**

### Opción B: WhatsApp solo (Week 1+)
- Week 1: Setup Twilio WhatsApp webhooks
- Customers text: "Gaming PC overheating help"
- Sales Agent responds live (requires availability signal)

**Ventajas:**
- Faster response → higher conversion
- Matches local market behavior (RI customers text first)
- Rich media (photos of issue)
- Warm leads feel personal

**Limitaciones:**
- Requires Sales Agent "online" availability or smart routing
- Overkill if customer inquiry is async question ("prices?")
- Risk: Sales Agent overwhelmed by multiple WhatsApp threads

**Rechazo temporal:** Week 1 too early (focus on email foundation). Agrega Week 1+ after email setup works.

### Opción C: Hybrid (Email + WhatsApp from Day 1) ✅ **SELECCIONADA CON PHASING**
- **Week 1-2 (MVP):** Email primary (web form → SendGrid → Sales Agent)
- **Week 1+ (enhancement):** WhatsApp added (form option: "prefer WhatsApp response?" → Twilio webhook)
- **Week 3+:** Auto-triage (form priority + lead warmth signals routing to best channel)

**Seleccionada porque:**
- Email = foundation (reliable, async, no surprise load)
- WhatsApp = enhancement (after email pattern proven)
- Flexibility: customer chooses channel preference
- No architectural rework (both funnel through same Sales Agent logic)

## Decisión

**Phased multi-channel approach:**

### Phase 1: Email Foundation (Week 1-2)
- **Entry point:** Web form (public booking page)
- **Fields:**
  ```
  - Service type (Gamer PC / Laptop / Office)
  - Issue description
  - Contact email (required)
  - Contact phone (optional)
  - Preferred contact method: [Email / WhatsApp (if added in Week 1+)]
  ```
- **Flow:**
  ```
  Customer submits form
    ↓
  Webhook → SendGrid (trigger email to customer: "Received your request")
    ↓
  BullMQ job → Sales Agent digest (1h batch or realtime via Supabase realtime)
  Sales Agent (Claude) reads inquiry
    ↓
  Generates response email (1h SLA, personalized)
    ↓
  Sends via SendGrid to customer email
    ↓
  Customer replies with questions / confirms time
  ```

### Phase 1.5: WhatsApp Add-On (Week 1+, optional launch timing)
- **Conditional field:** "Prefer WhatsApp response?"
- **Setup:** Twilio WhatsApp Business API
- **Flow (if customer selects WhatsApp):**
  ```
  Customer form: "phone: +1-401-555-1234, channel: WhatsApp"
    ↓
  Job enqueues to WhatsApp queue (separate from email)
    ↓
  Sales Agent detects WhatsApp preferred
    ↓
  Sends first message via Twilio (short, warm tone):
  "Hey [Name]! Thanks for contacting us. Checking your issue now 🔧
   Quick question: Is your rig overheating during gaming, or always?"
    ↓
  (Conversational until appointment booked or quote sent)
  ```

### Routing Logic (Week 1+)

```typescript
// api/local-services/leads/[id]/route.ts

interface LeadChannel {
  preferred: 'email' | 'whatsapp';
  email: string;
  phone?: string; // for WhatsApp
}

async function routeLeadToSalesAgent(lead: LeadChannel) {
  if (lead.preferred === 'whatsapp' && lead.phone) {
    // Send via Twilio WhatsApp
    await twilioWhatsApp.send({
      to: lead.phone,
      template: 'lead_inquiry_acknowledgment'
    });
  } else {
    // Send via SendGrid email (default)
    await sendgrid.send({
      to: lead.email,
      template: 'lead_inquiry_acknowledgment'
    });
  }
}
```

## Consecuencias

### Positivas
- **Week 1-2:** Email alone = simple, reliable, zero interruptions
- **Week 1+:** WhatsApp option = faster conversion for warm leads
- **Psychological:** Customer chooses channel = perceived respect for preference
- **Scalability:** Both route through same Sales Agent (no duplication)

### Negativas (mitigadas)
- **WhatsApp always-on pressure:** Sales Agent must be responsive. *Mitigación:* Set availability hours in Twilio (auto-respond after-hours: "Will get back to you 9am tomorrow")
- **Conversation fragmentation:** Same lead across email + WhatsApp creates duplicate work. *Mitigación:* Use lead_id to dedup, track channel in CRM
- **Twilio cost:** WhatsApp messages cost $0.01-0.05 each. *Mitigación:* Budget ~$50/mo for 1000-5000 messages at MVP scale

## Notas Operacionales

### SendGrid Setup (Week 1)
- Template: `lead_inquiry_acknowledgment_email.html`
- Sender: `noreply@opsly-local-services.com` or `sales@yourdomain.com`
- Reply-To: Sales Agent email (or bounce to orchestrator job)

### Twilio Setup (Week 1+)
```bash
# npm install twilio
# Doppler secret: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER

export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_WHATSAPP_NUMBER=+1401... # your business WhatsApp number
```

### Availability Rules for Sales Agent

```json
{
  "sales_agent_availability": {
    "email": {
      "response_sla_hours": 1,
      "batch_interval_minutes": 15,
      "timezone": "America/New_York"
    },
    "whatsapp": {
      "active_hours": "9am-6pm",
      "auto_reply_after_hours": true,
      "auto_reply_message": "Thanks for reaching out! We'll respond first thing tomorrow morning 🌅"
    }
  }
}
```

### Monitoring

- **Email:** Track opens, click-through rate (SendGrid analytics)
- **WhatsApp:** Track message delivery, read receipts (Twilio logs)
- **Conversion:** Lead → booking rate per channel (track in CRM)

## Decisiones Relacionadas

- **ADR-037:** Multi-tenant (each tenant can configure their own channels)
- **ADR-038:** Custom quotes (delivered via channel preference)
- **ADR-040:** Technician scaling (as volume grows, Sales Agent workload monitored)

## Referencias

- Sales Agent Prompt: `.cursor/prompts/local-services-sales-closer.md`
- Lead form page: `apps/local-services/app/book/page.tsx`
- API route: `apps/api/app/api/local-services/leads/route.ts`
- n8n workflows: `.n8n/1-workflows/local-services-lead-routing.json`
- Twilio docs: https://www.twilio.com/docs/whatsapp
- SendGrid templates: https://sendgrid.com/

# Peskids n8n: AI Brief Generation Workflow

**Purpose:** Generate contextualized advisor briefing from lead form data.

**Trigger:** Webhook from `POST /api/leads` (Peskids form submission)

**Process:**
1. Receive lead data (name, age, service, modality, source, etc.)
2. Call Claude API to generate AI summary
3. Save brief to Supabase `leads.metadata`
4. Notify advisor on WhatsApp/Slack

---

## Workflow Steps

### 1. Webhook Trigger
**Endpoint:** `/webhook/peskids/lead-capture`

**Payload structure:**
```json
{
  "lead_id": "uuid",
  "full_name": "Laura Gómez",
  "email": "laura@example.com",
  "phone": "+573001234567",
  "lead_type": "family",
  "service_mode": "llanogrande",
  "class_modality": "llanogrande",
  "neighborhood": "El Retiro",
  "child_name": "Mateo",
  "birth_date": "2019-03-15",
  "grade_interested": "K-5",
  "source": "instagram",
  "campaign": "summer-2026",
  "referral_source": "Instagram",
  "metadata": {
    "intake_version": "dynamic-intake-v1",
    "child_age_years": 5,
    "city": "Medellín"
  }
}
```

### 2. Claude API Call
**Model:** claude-opus-5 or claude-sonnet-5
**Temperature:** 0.7 (balanced for summaries)
**Max tokens:** 500

**Prompt template:**
```
Eres un asistente especializado en educación y natación.
Analiza estos datos de un cliente potencial y genera un BRIEF para el asesor.

DATOS DEL CLIENTE:
- Nombre: {full_name}
- Niño: {child_name}, {child_age_years} años
- Servicio: Natación
- Modalidad: {class_modality}
- Barrio: {neighborhood}
- Ubicación: {city}
- Fuente: {referral_source}
- Email: {email}
- Teléfono: {phone}
- Metadata adicional: {metadata_json}

GENERA UN BRIEF EN ESTE FORMATO:

📋 NUEVO INTERESADO
Nombre: [name]
Niño: [name], [age] años
Servicio: Natación
Modalidad: [modality]
Barrio: [neighborhood]
Fuente: [source]

🤖 RESUMEN IA:
[2-3 líneas analyzing motivation, needs, preferences based on data]

➡️ SIGUIENTE ACCIÓN SUGERIDA:
1. [Action 1]
2. [Action 2]
3. [Action 3]

Sé específico. Evita generalidades.
```

### 3. Save Brief to Supabase
**Table:** `leads`
**Update column:** `metadata.advisor_brief` (JSON)

**Update query:**
```sql
UPDATE leads
SET metadata = jsonb_set(metadata, '{advisor_brief}', $1)
WHERE id = $2 AND tenant_slug = 'peskids'
```

### 4. Optional: Send Notification
- Post to Slack: `#peskids-leads-incoming`
- Format: Quick card with brief excerpt
- Include link to view full details on dashboard

---

## Expected Outputs

**Success response:**
```json
{
  "ok": true,
  "lead_id": "abc-123",
  "brief_generated": true,
  "advisor_brief": {
    "summary": "Madre interesada en iniciar clases durante agosto...",
    "suggested_actions": ["Llamar hoy", "Ofrecer clase de prueba", "Enviar horarios de tarde"]
  }
}
```

**Error response:**
```json
{
  "ok": false,
  "error": "Failed to generate brief",
  "lead_id": "abc-123"
}
```

---

## Configuration

**Environment variables needed:**
- `ANTHROPIC_API_KEY` (Claude API key)
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side auth)
- `PESKIDS_N8N_LEAD_WEBHOOK` (URL of this workflow)

**n8n Credentials:**
- Anthropic (API key)
- Supabase (service role key)

---

## Testing

1. **Manual trigger:** Send test webhook from Postman
2. **Validation:** Check Supabase `leads.metadata` for advisor_brief field
3. **Performance:** Claude API call should complete in <5s
4. **Error handling:** Log all failures to n8n execution history

---

## Roadmap

**Phase 1 (MVP):** Brief generation + Supabase save
**Phase 2:** Slack notification when brief ready
**Phase 3:** Dashboard displays brief for advisor review
**Phase 4:** Auto-update brief if lead data changes


---
status: active
owner: ai-platform
last_review: 2026-07-08
type: playbook
tags:
  - opsly/playbook
  - opsly/tenant
  - opsly/ai
---

# Tenant AI Playbook — Configuración AI por Tenant

> Guía de onboarding AI para nuevos tenants de Opsly. Ejecutar una vez al incorporar un tenant. Los resultados se guardan en Supabase y usan Sonnet/Haiku de ahí en adelante.

---

## Checklist de Onboarding AI

```
[ ] 1. Variables de entorno presentes en Doppler (ANTHROPIC_API_KEY, REDIS_URL)
[ ] 2. Tabla tenant_ai_config existe en Supabase (migración aplicada)
[ ] 3. Ejecutar script de generación de playbook con Fable
[ ] 4. Verificar playbook guardado en Supabase
[ ] 5. Configurar quotas según plan del tenant
[ ] 6. Activar metering en Hermes
[ ] 7. Verificar workflows n8n usan gateway (no directo a Anthropic)
[ ] 8. Smoke test: enviar mensaje de prueba y verificar clasificación
```

---

## Configuración por Tipo de Tenant

### Academia de natación / deportes (Peskids model)

```typescript
const tenantAiConfig = {
  tenant_slug: 'peskids',
  tenant_type: 'sports_academy',

  // Quotas
  fable_daily_limit: 50,
  sonnet_daily_limit: 500,
  haiku_daily_limit: 10000,
  auto_downgrade: true,

  // Routing
  inbox_model: 'sonnet',          // respuestas WhatsApp
  digest_model: 'sonnet',         // digest diario admin
  classification_model: 'haiku',  // clasificar intención
  playbook_model: 'fable',        // generar playbook (1 vez)

  // Contexto del negocio
  business_context: {
    type: 'academia_natacion',
    target_age: '3-18',
    primary_channel: 'whatsapp',
    avg_lead_value: 150000,  // COP/mes
    urgency_signal: 'precio + disponibilidad en mismo mensaje',
  },
};
```

### CRM / Agencia de ventas

```typescript
const tenantAiConfig = {
  tenant_slug: 'crm_tenant',
  tenant_type: 'crm_sales',

  fable_daily_limit: 100,    // más análisis de pipeline
  sonnet_daily_limit: 1000,
  haiku_daily_limit: 20000,

  inbox_model: 'sonnet',
  digest_model: 'fable',     // pipeline analysis necesita más capacidad
  classification_model: 'haiku',

  business_context: {
    type: 'crm_ventas',
    avg_deal_value: 5000000,
    sales_cycle_days: 30,
    primary_signal: 'budget + timeline + decision_maker',
  },
};
```

### Servicio local (plomería, electricidad, etc.)

```typescript
const tenantAiConfig = {
  tenant_slug: 'local_service',
  tenant_type: 'local_service',

  fable_daily_limit: 10,     // menor volumen de complejidad alta
  sonnet_daily_limit: 200,
  haiku_daily_limit: 5000,
  auto_downgrade: true,

  inbox_model: 'haiku',      // respuestas simples y rápidas
  digest_model: 'sonnet',
  classification_model: 'haiku',

  business_context: {
    type: 'servicio_local',
    urgency_window_hours: 4,  // requieren respuesta rápida
    primary_channel: 'whatsapp',
  },
};
```

---

## Generar Playbook Inicial con Fable

Ejecutar al onboarding del tenant. Tarda 15-30 segundos. Se hace **una sola vez** (a menos que el negocio cambie significativamente).

```typescript
import { llmCall } from '@intcloudsysops/llm-gateway';
import { supabaseAdmin } from '@intcloudsysops/supabase';

async function generateTenantPlaybook(tenantSlug: string) {
  const config = await getTenantAiConfig(tenantSlug);

  const playbook = await llmCall({
    model: 'fable',
    tenant_slug: tenantSlug,
    request_id: `onboarding-playbook-${tenantSlug}-${Date.now()}`,
    prompt: `
Eres el AI configurator de Opsly para el tenant ${config.tenant_slug}.
Contexto del negocio: ${JSON.stringify(config.business_context, null, 2)}

Genera un playbook completo en JSON con esta estructura exacta:

{
  "lead_rubric": {
    "hot": { "score_min": 70, "signals": ["..."], "response_time_hours": 1 },
    "warm": { "score_min": 40, "signals": ["..."], "response_time_hours": 4 },
    "cold": { "score_min": 0, "signals": ["..."], "response_time_hours": 24 }
  },
  "response_templates": [
    {
      "id": "price_inquiry",
      "trigger_keywords": ["precio", "costo", "cuánto"],
      "template": "...",
      "max_length": 160
    }
    // ... 14 más
  ],
  "churn_signals": {
    "high_risk": ["señal1", "señal2"],
    "medium_risk": ["señal3"],
    "action_per_risk": { "high_risk": "...", "medium_risk": "..." }
  },
  "digest_format": {
    "sections": ["hot_leads", "followups", "renewals", "anomalies"],
    "kpis": ["leads_nuevos", "tasa_respuesta", "churn_riesgo"]
  }
}

Sé específico para el tipo de negocio: ${config.business_context.type}.
    `,
  });

  const parsed = JSON.parse(playbook.text);

  await supabaseAdmin
    .from('tenant_ai_config')
    .upsert({
      tenant_slug: tenantSlug,
      playbook: parsed,
      playbook_generated_at: new Date().toISOString(),
      playbook_model: 'claude-fable-5',
    });

  console.log(`✅ Playbook generado para ${tenantSlug}`);
  return parsed;
}
```

### Script de onboarding (CLI)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  node scripts/llm-tenant-onboarding.js --tenant=nuevo_tenant --generate-playbook
```

---

## Variables de Entorno por Tenant

```bash
# Global (todos los tenants comparten)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...        # fallback
REDIS_URL=redis://...        # cache gateway

# Por tenant (en Doppler o tenant_config en Supabase)
TENANT_SLUG=peskids
TENANT_FABLE_QUOTA=50
TENANT_SONNET_QUOTA=500
TENANT_HAIKU_QUOTA=10000
```

---

## Escalar el Modelo según Crecimiento del Tenant

```
Tenant nuevo (<100 leads/mes):
  → fable: 10 calls/día
  → sonnet: 100 calls/día
  → haiku: 2000 calls/día

Tenant creciendo (100-500 leads/mes):
  → fable: 50 calls/día
  → sonnet: 500 calls/día
  → haiku: 10000 calls/día

Tenant maduro (>500 leads/mes):
  → fable: 100 calls/día (más análisis de pipeline)
  → sonnet: 2000 calls/día
  → haiku: 50000 calls/día
  → Considerar fine-tuning de Haiku con datos del tenant
```

### Señales para subir de tier

- Tasa de respuesta del admin cae <70% → digest necesita más urgencia → Fable para digest
- Pipeline de leads crece >3x → playbook necesita actualización con Fable
- El tenant empieza a pedir análisis ad-hoc → habilitar endpoint `/api/ai/analyze` con Sonnet/Fable

---

## Ejemplos de Prompts por Dominio

### Academia deportiva — clasificar lead

```typescript
const prompt = `
Playbook del tenant: ${playbook.lead_rubric}

Lead recibido:
- Canal: WhatsApp
- Mensaje: "${message.body}"
- Hora: ${new Date().toLocaleTimeString('es-CO')}
- Mensajes previos: ${previousMessages.length}

Clasifica el lead y devuelve JSON:
{
  "score": <0-100>,
  "tier": "hot|warm|cold",
  "reason": "<1 línea>",
  "suggested_response": "<texto para WhatsApp, máx 160 chars>",
  "follow_up_hours": <número>
}
`;
// Usar model: 'haiku' si el playbook ya tiene el rubric
// Usar model: 'sonnet' si necesita contexto adicional
```

### Servicio local — urgencia del servicio

```typescript
const prompt = `
Clasifica la urgencia de esta solicitud de servicio:

Mensaje: "${message.body}"

Urgencias posibles:
- CRÍTICA: fuga de agua, cortocircuito, sin luz (responder en <1h)
- ALTA: problema funcional que impide usar el espacio (responder en <4h)
- NORMAL: mantenimiento preventivo, cotización (responder en <24h)

Devuelve: { "urgency": "critical|high|normal", "reason": "..." }
`;
// Siempre model: 'haiku' — respuesta simple, alta frecuencia
```

### CRM — calificar pipeline

```typescript
const prompt = `
Analiza esta oportunidad de venta y evalúa su probabilidad de cierre.

Datos del lead:
${JSON.stringify(opportunity, null, 2)}

Interacciones recientes:
${interactions.slice(-5).map(i => `${i.date}: ${i.summary}`).join('\n')}

Evalúa según MEDDPICC:
- Metrics: ¿cuantificó el dolor?
- Economic Buyer: ¿lo identificamos?
- Decision Criteria: ¿los conocemos?
- Decision Process: ¿lo entendemos?
- Paper Process: ¿sabemos cuánto tarda?
- Identify Pain: ¿está claro?
- Champion: ¿lo tenemos?
- Competition: ¿sabemos con quién competimos?

Devuelve: { "probability": <0-100>, "stage": "...", "next_action": "...", "risk": "..." }
`;
// model: 'sonnet' o 'fable' según el tamaño del deal
```

---

## Smoke Test Post-Onboarding

```bash
# 1. Verificar playbook guardado
curl -s "$SUPABASE_URL/rest/v1/tenant_ai_config?tenant_slug=eq.nuevo_tenant" \
  -H "apikey: $SUPABASE_ANON_KEY" | jq '.playbook | keys'

# 2. Test de clasificación
curl -s "$OPSLY_API_URL/api/ai/classify" \
  -H "Content-Type: application/json" \
  -d '{"tenant_slug":"nuevo_tenant","message":"Hola quiero info de precios y horarios para mi hijo de 5 años"}' \
  | jq '.tier'
# Espera: "hot"

# 3. Test de digest
curl -s "$OPSLY_API_URL/api/cron/digest" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"tenant_slug":"nuevo_tenant","dry_run":true}' \
  | jq '.summary'
```

---

## Documentos Relacionados

- [[brain/AI-STRATEGY]] — Estrategia AI master y stack de modelos
- [[brain/skills/fable5-manual]] — Manual completo de Fable 5
- [[brain/skills/fable5-agent-instructions]] — Instrucciones para modelos ligeros y n8n
- [[ADR-047-fable5-model-strategy]] — Decisión de Fable 5 como top-tier
- [[opsly-tenant]] — Skill de onboarding de tenants

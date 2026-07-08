---
status: active
owner: ai-platform
last_review: 2026-07-08
type: strategy
tags:
  - opsly/strategy
  - opsly/ai
  - opsly/llm
---

# Estrategia AI de Opsly — 2026

> Documento maestro. Todo agente, desarrollador o automatización que tome decisiones sobre modelos, routing o integración AI debe partir de este archivo.

---

## Principios AI de Opsly (no negociables)

### 1. Single Gateway — Zero Bypass

**Todo tráfico LLM pasa por `apps/llm-gateway`.**

```
❌  import Anthropic from '@anthropic-ai/sdk'; // NUNCA directamente
✅  import { llmCall } from '@intcloudsysops/llm-gateway';
```

Razón: trazabilidad por tenant, metering de costos, fallback automático, cache Redis.

### 2. Trazabilidad Obligatoria

Cada llamada LLM requiere `tenant_slug` + `request_id`. Sin ellos, la llamada no pasa.

```typescript
await llmCall({
  prompt: '...',
  tenant_slug: 'peskids',           // obligatorio
  request_id: crypto.randomUUID(),  // obligatorio
});
```

### 3. Complejidad Determina el Modelo

No el desarrollador. El gateway asigna el modelo según `complexityLevel` (1-3) si no se especifica `model` explícito.

### 4. Fable Genera, Sonnet Ejecuta, Haiku Monitorea

El patrón de 3 niveles maximiza calidad sin escalar costos linealmente:
- **Fable** → genera conocimiento, playbooks, rubrics (una vez, por tenant/contexto)
- **Sonnet** → ejecuta en producción usando ese conocimiento
- **Haiku** → clasifica, ruta, monitorea a alta frecuencia

---

## Stack de Modelos 2026

| Alias | Modelo | Tier | Input $/M | Output $/M | Cuándo |
|-------|--------|------|-----------|------------|--------|
| `fable` | `claude-fable-5` | Top | $15 | $75 | Complejidad 3, análisis profundo, onboarding tenant |
| `opus` | `claude-opus-4-8` | Alto | $15 | $75 | Fallback de Fable, alta calidad |
| `sonnet` | `claude-sonnet-4-6` | Medio-alto | $3 | $15 | Producción general, inbox, digest |
| `haiku` | `claude-haiku-4-5-20251001` | Bajo | $0.25 | $1.25 | Clasificación, routing, alta frecuencia |
| `balanced` | deepseek-v4 → sonnet | Variable | — | — | Costo/calidad equilibrado |
| `cheap` | llama-local → groq → haiku | ~$0 | — | — | Operaciones bulk, clasificación masiva |
| `code` | codellama → gpt4o → deepseek | Variable | — | — | Generación de código puro |

### Cadenas de Fallback

```
fable    → opus → sonnet
opus     → fable → sonnet
sonnet   → gpt4o → haiku
balanced → deepseek_v4 → sonnet → haiku
haiku    → groq → deepseek → llama_local
```

---

## Matriz de Decisión — Cuándo Usar Qué

### Por tipo de tarea

| Tipo de tarea | Modelo recomendado | Frecuencia típica |
|---------------|-------------------|-------------------|
| Onboarding playbook de tenant | `fable` | 1 vez / tenant |
| Análisis de documentos >5 páginas | `fable` | Bajo volumen |
| Decisión arquitectónica / ADR | `fable` | Bajo volumen |
| Auditoría de seguridad | `fable` | Bajo volumen |
| Respuesta inbox WhatsApp (hot lead) | `sonnet` | Media frecuencia |
| Digest diario para admin | `sonnet` | 1/día / tenant |
| Generación de contenido marketing | `sonnet` | Media frecuencia |
| Clasificación de intención | `haiku` | Alta frecuencia |
| Routing de mensajes entrantes | `haiku` | Muy alta frecuencia |
| Churn detection (signal check) | Reglas puras / `haiku` | Diario |
| Generación de código (autocomplete) | `code` | Alta frecuencia |

### Por urgencia y costo

```
¿La tarea cambiaría una decisión importante?  → fable
¿La tarea requiere contexto de negocio?        → sonnet
¿Un humano lo resolvería en <30 segundos?      → haiku
¿Es clasificación pura sin contexto?           → haiku o reglas
```

---

## Patrón de 3 Niveles — Implementación

```typescript
// 1. FABLE: genera el playbook del tenant (una vez, al onboarding)
async function generateTenantPlaybook(tenant: Tenant) {
  const playbook = await llmCall({
    model: 'fable',
    tenant_slug: tenant.slug,
    request_id: crypto.randomUUID(),
    prompt: `Para ${tenant.name} (${tenant.type}), genera:
    - Rubric de clasificación de leads (20 situaciones con score HOT/WARM/COLD)
    - 15 plantillas de respuesta por escenario
    - Criterios de churn con señales exactas
    Formato: JSON estricto según schema ${PLAYBOOK_SCHEMA}`,
  });

  await supabase.from('tenant_ai_config')
    .upsert({ tenant_slug: tenant.slug, playbook, updated_at: new Date() });

  return playbook;
}

// 2. SONNET: ejecuta usando el playbook (cada interacción)
async function handleInboundMessage(msg: InboundMessage) {
  const { playbook } = await getTenantPlaybook(msg.tenant_slug);

  return llmCall({
    model: 'sonnet',
    tenant_slug: msg.tenant_slug,
    request_id: msg.id,
    prompt: `Playbook: ${playbook}\n\nMensaje: ${msg.body}\nResponde:`,
  });
}

// 3. HAIKU: clasifica a alta frecuencia (cada evento)
async function classifyIntent(event: WebhookEvent) {
  return llmCall({
    model: 'haiku',
    tenant_slug: event.tenant_slug,
    request_id: event.id,
    prompt: `Clasifica: urgent|normal|ignore\nMensaje: ${event.body}`,
  });
}
```

---

## Estrategia de Costos

### Metering

Cada llamada al gateway loguea en `hermes` metering:

```
tenant_slug | model | input_tokens | output_tokens | cost_usd | timestamp
```

Dashboard: `/admin/costs` → desglose por tenant y modelo.

### Quotas por Tenant

```typescript
// tenant_ai_config en Supabase
{
  tenant_slug: 'peskids',
  fable_daily_limit: 50,      // llamadas Fable por día
  sonnet_daily_limit: 500,
  haiku_daily_limit: 5000,
  auto_downgrade: true,       // si llega al límite, usa el siguiente tier
}
```

### Regla de Costo: Fable solo para complexity-3

```typescript
// En el gateway: si el tenant supera su quota Fable, auto-downgrade a Sonnet
const effectivePreference = await checkQuota(tenantSlug, 'fable')
  ? 'fable'
  : 'sonnet';
```

### Costo estimado por tenant (Peskids como referencia)

| Modelo | Uso estimado/mes | Costo/mes |
|--------|-----------------|-----------|
| Fable | 30 llamadas (onboarding + análisis) | ~$5 |
| Sonnet | 1,000 llamadas (inbox + digest) | ~$8 |
| Haiku | 10,000 clasificaciones | ~$1.5 |
| **Total** | — | **~$14.5/mes** |

---

## Integración para Nuevos Tenants

### Checklist mínimo

- [ ] Generar playbook inicial con Fable al onboarding
- [ ] Guardar playbook en `tenant_ai_config`
- [ ] Configurar quotas según plan del tenant
- [ ] Verificar que todos los workflows n8n usan el gateway (no Anthropic directo)
- [ ] Activar metering en Hermes para el tenant

### Variables de entorno requeridas

```bash
# En Doppler (ops-intcloudsysops / prd)
ANTHROPIC_API_KEY=sk-ant-...       # para Fable, Opus, Sonnet, Haiku
OPENAI_API_KEY=sk-...              # fallback para balanced/sonnet chain
DEEPSEEK_API_KEY=...               # para balanced/cheap chains
REDIS_URL=redis://...              # para cache del gateway
```

---

## Roadmap de Modelos

| Horizonte | Acción |
|-----------|--------|
| Q3 2026 | Evaluar `claude-fable-6` cuando esté disponible → ADR de upgrade |
| Q3 2026 | Implementar quota automática por tenant en gateway |
| Q4 2026 | Fine-tuning de Haiku con datos Peskids para clasificación de intención |
| Q4 2026 | RAG + embeddings para contexto de tenant en llamadas Sonnet (pgvector — ADR-018) |
| 2027 | Agentes multi-step con Fable como orchestrator + Haiku como executors |

---

## Documentos Relacionados

- [[ADR-010-llm-gateway]] — Decisión original del gateway
- [[ADR-047-fable5-model-strategy]] — Decisión de Fable 5 como top-tier
- [[ADR-018-pgvector-embeddings-rag]] — RAG + embeddings
- [[brain/modules/llm-gateway]] — Tabla técnica de providers y routing
- [[brain/skills/fable5-manual]] — Manual completo de Fable 5
- [[brain/skills/fable5-agent-instructions]] — Instrucciones para modelos ligeros
- [[brain/TENANT-AI-PLAYBOOK]] — Configuración AI por tenant

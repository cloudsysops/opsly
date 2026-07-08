---
status: active
owner: operations
created: 2026-07-08
tags:
  - opsly/blueprint
  - opsly/ai
  - opsly/tenant
---

# AI Tenant Setup Blueprint

**Objetivo:** Configurar el stack de IA para cualquier nuevo tenant en Opsly en menos de 30 minutos.  
**Audiencia:** Ops, dev, arquitectos.  
**Fuente canónica:** `docs/brain/skills/fable5-manual.md` · `docs/brain/skills/fable5-agent-instructions.md`

---

## Principio Central

> **Fable genera una vez. Modelos baratos ejecutan mil veces.**

El costo de configurar IA por tenant es ~$0.30 (un prompt Fable 5). El beneficio es un sistema de respuestas, clasificación y digest que funciona sin intervención humana para siempre.

---

## Stack de modelos por tenant

```
┌─────────────────────────────────────────────────────┐
│                   LLM Gateway :3010                 │
│                                                     │
│  Fable 5      → Decisiones, onboarding, ADRs        │
│  Opus 4.8     → Fallback de Fable                   │
│  Sonnet 4.6   → Respuestas de producción (default)  │
│  Haiku 4.5    → Clasificación, routing, alta freq.  │
└─────────────────────────────────────────────────────┘
```

---

## Checklist de setup (30 min)

### 1. Pre-requisitos (5 min)

- [ ] LLM Gateway corriendo: `curl https://llm.op-sly.com/health`
- [ ] Tenant slug registrado en `config/tenants/<slug>.json`
- [ ] Doppler: `ANTHROPIC_API_KEY` presente en `ops-intcloudsysops/prd`
- [ ] Supabase: tenant tiene schema migrado

### 2. Configurar flags en Doppler (5 min)

```bash
doppler secrets set \
  TENANT_LLM_ENABLED=true \
  TENANT_DEFAULT_MODEL=sonnet \
  TENANT_LLM_DAILY_BUDGET_USD=2.00 \
  --project ops-intcloudsysops --config prd
```

Reemplazar `TENANT` por el slug en mayúsculas (ej: `PESKIDS`).

### 3. Generar playbook AI (10 min)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  node scripts/llm-tenant-onboarding.js \
    --tenant=<slug> \
    --vertical=<vertical>   # swim-school | barberia | restaurante | dental | saas
```

**Output esperado:**
```
✅ lead_classification_rubric guardado para <slug>
✅ response_playbook (20 situaciones) generado
✅ digest_template configurado
✅ churn_signals calibrados para vertical <vertical>
✅ golden_rules confirmadas
```

### 4. Importar workflows de n8n (5 min)

```bash
# Importa el pack de automatizaciones con AI para el vertical
doppler run --project ops-intcloudsysops --config prd -- \
  node scripts/n8n-import-workflow-pack.js \
    --tenant=<slug> \
    --pack=ai-crm-starter   # Incluye: classify, respond, digest, churn
```

Workflows incluidos en `ai-crm-starter`:
| Workflow | Trigger | Modelo |
|----------|---------|--------|
| Classify Lead Intent | Webhook WhatsApp | Haiku |
| Generate Hot Lead Response | Score ≥ 70 | Sonnet |
| Daily Digest 8am | Cron | Sonnet |
| Churn Risk Detection | Nightly | Reglas puras (0 tokens) |

### 5. Smoke test AI (5 min)

```bash
# Test clasificación de intent
doppler run --project ops-intcloudsysops --config prd -- \
  curl -s -X POST https://llm.op-sly.com/v1/chat \
    -H "Content-Type: application/json" \
    -H "x-tenant-slug: <slug>" \
    -H "x-llm-model: haiku" \
    -d '{"messages":[{"role":"user","content":"quiero inscribir a mi hijo de 7 años"}],"request_id":"ai-smoke-001"}' \
  | jq '{model: .model, tier: .content}'
# Expected: model "claude-haiku-4-5-...", tier "hot"

# Test generación de respuesta
doppler run --project ops-intcloudsysops --config prd -- \
  curl -s -X POST https://llm.op-sly.com/v1/chat \
    -H "Content-Type: application/json" \
    -H "x-tenant-slug: <slug>" \
    -H "x-llm-model: sonnet" \
    -d '{"messages":[{"role":"user","content":"Genera una respuesta para: quiero inscribir a mi hijo de 7 años"}],"request_id":"ai-smoke-002"}' \
  | jq '.content'
```

---

## Modelo mental por tipo de tenant

### Academia / Swim School (Peskids pattern)

```yaml
lead_flow: WhatsApp → Classify (Haiku) → Score → Respond (Sonnet) → Twenty CRM
digest: Daily 8am — hot leads + churn risk + renovaciones próximas
churn_signals: >14 días sin asistencia, renovación tardía, mensaje negativo
fable_budget: onboarding only (rubric + playbook)
sonnet_budget: ~$0.50/día (respuestas hot leads + digest)
haiku_budget: ~$0.05/día (clasificación)
```

### Servicios / Barbería / Restaurante

```yaml
lead_flow: WhatsApp/Form → Classify (Haiku) → Agenda appointment → Confirm (Sonnet)
digest: Daily 7am — citas del día + leads sin responder + feedback negativo
churn_signals: >30 días sin visita, cancelación, nota negativa
fable_budget: onboarding only
sonnet_budget: ~$0.20/día
haiku_budget: ~$0.03/día
```

### SaaS / Tech (mayor volumen)

```yaml
lead_flow: Form → Trial signup → Onboarding email sequence (Sonnet) → Churn (Haiku daily)
digest: Weekly (Sonnet) — MRR, churn, expansión
churn_signals: 0 logins >7 días, feature adoption <20%, downgrade signal
fable_budget: onboarding + architecture decisions
sonnet_budget: ~$2.00/día (escala con usuarios)
haiku_budget: ~$0.30/día
```

---

## Decisiones de modelo — árbol rápido

```
¿Es una decisión arquitectónica o de alto impacto? → FABLE
¿Es interacción con cliente importante (hot lead, queja)? → SONNET
¿Es clasificación, routing, o alta frecuencia? → HAIKU
¿Es un template con variables fijas? → Sin LLM (0 costo)
```

---

## Costos de referencia (2026-07-08)

| Modelo | Input /1K tokens | Output /1K tokens | Uso típico |
|--------|-----------------|-------------------|------------|
| Fable 5 | $0.015 | $0.075 | Onboarding, ADRs |
| Opus 4.8 | $0.015 | $0.075 | Fallback Fable |
| Sonnet 4.6 | $0.003 | $0.015 | Producción standard |
| Haiku 4.5 | $0.0008 | $0.004 | Clasificación |

**Regla de oro:** Si la tarea se puede hacer con Haiku, nunca uses Sonnet. Si se puede hacer con reglas, nunca uses Haiku.

---

## Monitoreo

Todas las llamadas al LLM Gateway se registran automáticamente. Para ver el uso de un tenant:

```sql
-- Uso diario por tenant (últimos 7 días)
SELECT
  DATE(created_at) AS day,
  model,
  COUNT(*) AS calls,
  SUM(tokens_in + tokens_out) AS total_tokens,
  SUM(cost_usd) AS cost_usd
FROM llm_audit_log
WHERE tenant_slug = 'peskids'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC, cost_usd DESC;
```

**Alertas en Hermes:**
- `llm.cost_exceeded`: tenant supera `TENANT_LLM_DAILY_BUDGET_USD`
- `llm.error_rate_high`: >5% de llamadas fallidas en 1h
- `llm.latency_p99`: p99 > 8s (Gateway necesita investigación)

---

## Anti-patrones a evitar

- ❌ Usar Fable para clasificación simple (50x más caro que Haiku)
- ❌ Llamar LLM sin `tenant_slug` (pierde trazabilidad)
- ❌ Poner secretos en prompts (usa parámetros estructurados)
- ❌ Mezclar contexto de dos tenants en un mismo prompt
- ❌ Re-generar el playbook completo con cada cambio (adaptar, no regenerar)
- ❌ Usar LLM donde una regla determinista alcanza (churn con señales claras)

---

## Links relacionados

- [[fable5-manual]] — Manual completo: tips, secretos, anti-patrones
- [[fable5-agent-instructions]] — Templates n8n, código de clasificación, digest
- [[opsly-llm]] — LLM Gateway: routing, providers, ejemplos
- [[ADR-047-fable5-model-strategy]] — Decisión arquitectónica formal
- `docs/blueprints/TENANT-ONBOARDING-TEMPLATE.md` — Setup completo de nuevo tenant
- `docs/blueprints/TENANT-REPEAT-PLAYBOOK.md` — Herencia de playbook entre tenants
- `docs/brain/AI-STRATEGY.md` — Estrategia AI maestro de Opsly
- `docs/brain/TENANT-AI-PLAYBOOK.md` — Configuración AI por tipo de tenant

---

*Creado 2026-07-08 | Destilado de Fable 5 + Peskids operational patterns | v1.0.0*

---
status: aceptado
owner: ai-platform
last_review: 2026-07-08
type: adr
tags:
  - opsly/adr
  - opsly/llm
  - opsly/fable5
---

# ADR-047: Fable 5 como Modelo Top-Tier en LLM Gateway

## Estado: ACEPTADO | Fecha: 2026-07-08

## Contexto

El LLM Gateway (`apps/llm-gateway`) tenía un único tier superior: `claude-sonnet-4-6`.
Con la disponibilidad de `claude-fable-5` (y `claude-opus-4-8`), Opsly necesita:

1. Un modelo capaz de razonamiento profundo multi-paso para tareas de complejidad alta.
2. Una cadena de fallback que garantice disponibilidad sin intervención manual.
3. Una estrategia de costos que no escale linealmente con el volumen de tenants.

El ADR-010 estableció el LLM Gateway como proxy único. Este ADR extiende esa decisión con la estrategia de modelos multi-tier.

## Decisión

### Stack de modelos (2026-07-08)

| Tier | ProviderId | Modelo | Routing alias |
|------|-----------|--------|---------------|
| Top | `claude_fable` | `claude-fable-5` | `fable` |
| Alto | `claude_opus` | `claude-opus-4-8` | `opus` |
| Medio-alto | `claude_sonnet` | `claude-sonnet-4-6` | `sonnet` |
| Bajo | `claude_haiku` | `claude-haiku-4-5-20251001` | `haiku` |

### Routing por complejidad (auto-detection)

```
complexityLevel: 3  →  fable   (razonamiento profundo, análisis multi-doc, decisiones críticas)
complexityLevel: 2  →  balanced (tareas de producción con contexto moderado)
complexityLevel: 1  →  cheap   (clasificación, routing, respuestas cortas)
```

### Cadena de fallback para `fable`

```
claude_fable → claude_opus → claude_sonnet
```

Si `claude_fable` falla o está rate-limited, el gateway cae automáticamente a Opus, luego a Sonnet. Cero intervención manual.

### Criterios de selección por caso de uso

| Caso de uso | Modelo | Justificación |
|-------------|--------|---------------|
| Onboarding playbook de tenant (1 vez) | fable | Genera rubrics reutilizables de alta calidad |
| Análisis de contrato / documento largo | fable | Mantiene contexto de múltiples documentos |
| Auditoría de seguridad de código | fable | Razonamiento adversarial (constructor + atacante) |
| Decisión de arquitectura / ADR | fable | Evaluación multi-criterio con consecuencias |
| Respuesta a hot lead (inbox WhatsApp) | sonnet | Calidad suficiente, latencia importa |
| Digest diario admin | sonnet | Balance calidad/costo en alta frecuencia |
| Clasificación de intención de mensaje | haiku | Alta frecuencia, baja complejidad |
| Routing / detección de prioridad | haiku | Sub-100ms requerido |

## Consecuencias

**Positivas:**
- Tareas de complejidad 3 ahora resuelven con el mejor modelo disponible.
- La cadena `fable → opus → sonnet` garantiza >99.9% disponibilidad efectiva.
- El conocimiento generado por Fable puede destilarse para Sonnet/Haiku → eficiencia de costos a largo plazo.
- Otros modelos (Cursor, Codex, n8n) descubren Fable a través de `docs/brain/skills/fable5-manual.md`.

**Negativas / Riesgos:**

| Riesgo | Mitigación |
|--------|-----------|
| Costo 5x vs Sonnet | Uso solo en complexity-3; quota por tenant via Hermes |
| Rate limits de Anthropic | Fallback chain automático; `healthKey: 'anthropic'` compartido |
| Modelo puede ser deprecado | Fallback a Opus; cadena no depende de Fable para operar |
| Tenants pequeños abusan Fable para tareas simples | Quota configurable en `tenant_config.llm_fable_daily_limit` |

## Alternativas Descartadas

**A. Solo Sonnet como tier superior**
Sonnet pierde coherencia en documentos >10 páginas y razonamiento multi-paso complejo. No adecuado para tareas de arquitectura o análisis profundo.

**B. Integrar OpenAI GPT-4o como top tier**
GPT-4o tiene calidad comparable pero añade dependencia de proveedor adicional. El ADR-010 estableció Anthropic como provider primario. Se mantiene como fallback `balanced` chain vía `gpt4o`.

**C. Routing manual por tipo de tarea (no por complejidad)**
Demasiada fricción para el desarrollador. El auto-routing por `complexityLevel` es más simple y automático; se puede sobrescribir con `model: 'fable'` explícito cuando se necesita.

## Implementación

```typescript
// apps/llm-gateway/src/providers.ts
claude_fable: {
  model: 'claude-fable-5',
  kind: 'anthropic',
  cost_per_1k_input: 0.015,
  cost_per_1k_output: 0.075,
  healthKey: 'anthropic',
},

// Routing alias
if (preference === 'fable') {
  return [e('claude_fable'), e('claude_opus'), e('claude_sonnet')];
}

// Auto-routing
if (complexityLevel === 3) return 'fable';
```

## Docs relacionados

- [[ADR-010-llm-gateway]] — Decisión original del LLM Gateway
- [[brain/skills/fable5-manual]] — Manual de uso y secretos de Fable 5
- [[brain/skills/fable5-agent-instructions]] — Instrucciones para Sonnet/Haiku/n8n
- [[brain/AI-STRATEGY]] — Estrategia AI master de Opsly
- [[brain/modules/llm-gateway]] — Tabla completa de providers y routing

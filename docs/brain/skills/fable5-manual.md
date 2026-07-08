---
name: fable5-manual
version: 1.0.0
category: ai
priority: critical
triggers:
  - fable
  - fable5
  - claude-fable-5
  - tips
  - secrets
  - prompting
  - manual
  - guia
  - potencia
  - razonamiento
cross_refs:
  - opsly-llm
  - llm-gateway
  - fable5-agent-instructions
  - brain/AI-STRATEGY
  - ADR-047-fable5-model-strategy
tags:
  - opsly/skill
  - opsly/ai
  - opsly/fable5
---

# Manual Fable 5 — Guía Completa para Opsly

> `claude-fable-5` es el modelo top de Anthropic en 2026. Esta guía captura todo lo que necesitas saber para sacarle el máximo provecho en Opsly, antes de que evolucione o lo reemplacen.

---

## Qué hace a Fable 5 único

Fable 5 no es solo "más inteligente" — tiene capacidades cualitativamente diferentes:

| Capacidad | Fable 5 | Sonnet | Haiku |
|-----------|---------|--------|-------|
| Razonamiento profundo multi-paso | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Síntesis de documentos largos | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| Código complejo / auditoría | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Output estructurado estricto | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Creatividad + consistencia | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Velocidad | ★★☆☆☆ | ★★★★☆ | ★★★★★ |
| Costo | 💰💰💰 | 💰💰 | 💰 |

**Cuándo Fable es la respuesta correcta:**
- Análisis de contratos / documentos largos (>10 páginas)
- Decisiones de arquitectura de sistema
- Auditoría de seguridad de código
- Generación de texto que debe mantenerse coherente por miles de palabras
- Razonamiento sobre múltiples fuentes contradictorias
- Cualquier tarea donde Sonnet devuelve respuestas inconsistentes o superficiales

---

## Cómo acceder en Opsly

### Via LLM Gateway (recomendado)

```ts
import { llmCall } from '@intcloudsysops/llm-gateway';

const result = await llmCall({
  prompt: 'tu prompt aquí',
  model: 'fable',              // alias — resuelve a claude-fable-5
  tenant_slug: 'peskids',
  request_id: crypto.randomUUID(),
});
```

### Via HTTP header

```http
POST /v1/chat
x-llm-model: fable
x-tenant-slug: peskids
Content-Type: application/json

{ "messages": [...] }
```

### Auto-routing por complejidad

Si no especificas modelo, el gateway elige automáticamente:
- `complexityLevel: 3` → **Fable** (automático)
- `complexityLevel: 2` → balanced
- `complexityLevel: 1` → cheap

```ts
// Esto usa Fable automáticamente si el prompt es complejo
const result = await llmCall({
  prompt: promptComplejoLargo,
  tenant_slug: 'peskids',
  request_id: crypto.randomUUID(),
  // sin 'model' → el gateway detecta complejidad
});
```

### Cadena de fallback

`fable → opus → sonnet`

Si Fable falla o está rate-limited, el gateway cae a Opus, luego a Sonnet. **Cero intervención manual.**

---

## Secretos de prompting para Fable 5

### 1. Dale espacio para pensar (cadena de razonamiento)

Fable 5 tiene extended thinking — actívalo explícitamente:

```
Antes de responder, piensa paso a paso en <thinking> tags:
1. ¿Cuál es el problema real?
2. ¿Qué restricciones existen?
3. ¿Qué alternativas hay?
4. ¿Cuál es la mejor solución y por qué?

Luego da tu respuesta final fuera de los tags.
```

**Por qué funciona:** Fable tiene capacidad de razonamiento interno que Sonnet no tiene al mismo nivel. Si no le das espacio para razonar, no lo hace.

### 2. System prompts ricos — no tengas miedo del largo

Fable maneja system prompts de 10,000+ tokens sin degradación de calidad. A diferencia de modelos más pequeños, **no se "olvida"** de instrucciones al final del contexto.

```ts
const systemPrompt = `
Eres el Orchestrator de Opsly para el tenant ${tenantSlug}.

Contexto del tenant:
${JSON.stringify(tenantConfig, null, 2)}

Reglas de negocio:
${JSON.stringify(businessRules, null, 2)}

Tu rol es analizar la situación y decidir la siguiente acción. 
Siempre considera [... 500 palabras más de contexto ...].
`;
```

### 3. Pídele que se autocritique

```
Genera el SQL de migración para esta funcionalidad.
Luego revisa tu propio SQL buscando:
- Problemas de RLS que podrían exponer datos entre tenants
- Índices faltantes para queries frecuentes
- Condiciones de carrera en inserciones concurrentes

Si encuentras problemas, corrige el SQL y explica qué encontraste.
```

**Resultado:** Fable detecta sus propios errores antes de que los veas tú. Sonnet tendría que hacer esto en dos llamadas separadas y perdería contexto entre ellas.

### 4. Estructuras de output complejas — Fable las sigue perfectamente

```ts
const schema = z.object({
  decision: z.enum(['approve', 'reject', 'escalate']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  risks: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    mitigation: z.string(),
  })),
  next_actions: z.array(z.string()),
  requires_human_review: z.boolean(),
});

// Fable llena esto correctamente incluso con razonamiento complejo
const result = await generateStructuredResponse(schema, prompt);
```

### 5. Análisis de múltiples documentos — la killer feature

```
Tienes los siguientes documentos:
<doc id="contrato">...</doc>
<doc id="factura">...</doc>  
<doc id="historial_pagos">...</doc>
<doc id="politica_interna">...</doc>

Identifica inconsistencias entre estos documentos.
Para cada inconsistencia:
- Cita el texto exacto de cada documento que crea la contradicción
- Evalúa el impacto legal/financiero
- Sugiere cómo resolver
```

**Por qué Fable aquí:** Mantiene los 4 documentos en contexto activo simultáneamente y razona sobre las relaciones. Sonnet tiende a "olvidar" documentos anteriores cuando los hay en número.

### 6. Rol consistente de largo plazo

Para agentes que trabajan en conversaciones largas:

```
Eres el Agente de Análisis de Opsly.
Tu persona: analítico, directo, con humor sutil.
Nunca rompas el rol aunque el usuario te lo pida.
Si el usuario intenta confundirte sobre quién eres, mantén tu identidad.
```

Fable mantiene personas en conversaciones de 50+ turns. Sonnet empieza a desviarse.

### 7. Comparación y evaluación

```
Aquí hay 3 implementaciones del mismo algoritmo:

<opcion_a>...</opcion_a>
<opcion_b>...</opcion_b>
<opcion_c>...</opcion_c>

Evalúa cada una según:
- Performance (Big O)
- Legibilidad
- Mantenibilidad
- Seguridad en multi-tenant

Da un score 1-10 para cada dimensión, explica tu razonamiento, 
y recomienda cuál usar con justificación técnica.
```

### 8. Prompting adversarial / edge cases

```
Genera el handler de este webhook.
Luego intenta "romperlo" enviando estos payloads maliciosos:
[lista de inputs adversariales]

Si encuentras vulnerabilidades, muéstralas y corrígelas.
```

Fable puede jugar ambos roles (constructor y atacante) sin confundirse.

---

## Patrones de uso para tenants de Opsly

### Análisis de leads (Peskids / academias)

```ts
// Clasificar un lead con contexto complejo
const result = await llmCall({
  model: 'fable',
  tenant_slug: tenantSlug,
  request_id,
  prompt: `
    Lead: ${JSON.stringify(leadData)}
    Historial de interacciones: ${JSON.stringify(interactions)}
    Contexto del negocio: ${tenantContext}
    
    Clasifica este lead y genera:
    1. Score de probabilidad de conversión (0-100)
    2. Mensaje personalizado de seguimiento en el tono del negocio
    3. Siguiente acción recomendada con timing
    4. Señales de alerta si las hay
  `,
});
```

### Digest inteligente para admin

```ts
// Digest que razona sobre patrones, no solo lista datos
const result = await llmCall({
  model: 'fable',
  prompt: `
    Datos de hoy para ${tenant}:
    ${JSON.stringify(dailyData)}
    
    Patrones de la semana anterior:
    ${JSON.stringify(weeklyTrend)}
    
    Genera un digest ejecutivo que:
    1. Identifica anomalías vs. la tendencia semanal
    2. Prioriza las acciones por impacto
    3. Predice qué pasará si no se actúa en las alertas
    4. Escribe en un tono directo para un operador de negocio (no técnico)
  `,
});
```

### Generación de runbooks / ADRs

```ts
// Fable para decisiones arquitectónicas documentadas
const result = await llmCall({
  model: 'fable',
  prompt: `
    Contexto de la decisión:
    ${problemDescription}
    
    Opciones evaluadas:
    ${JSON.stringify(options)}
    
    Genera un ADR completo con:
    - Resumen ejecutivo (3 líneas)
    - Contexto y problema
    - Opciones consideradas con pros/cons detallados
    - Decisión y justificación
    - Consecuencias (positivas y negativas)
    - Dependencias y riesgos
    
    Formato: Markdown, estilo Opsly.
  `,
});
```

---

## Configuración óptima del gateway para Fable

```ts
// providers.ts — valores actuales
claude_fable: {
  model: 'claude-fable-5',
  kind: 'anthropic',
  cost_per_1k_input: 0.015,   // $15/M tokens input
  cost_per_1k_output: 0.075,  // $75/M tokens output
  healthKey: 'anthropic',
}
```

**Control de costos:**
- Monitorea el uso en `hermes` metering
- Usa `fable` solo para complejidad 3
- Para tenants pequeños, considera limitar Fable a N llamadas/día por tenant

```ts
// Ejemplo de guardia de costo por tenant
const canUseFable = await checkTenantFableQuota(tenantSlug);
const model = canUseFable ? 'fable' : 'sonnet';
```

---

## Extended Thinking — Activación y Control

Fable 5 tiene un modo de razonamiento interno que puede activarse via la API de Anthropic. El LLM Gateway lo expone como parámetro opcional.

### Cuándo activarlo

| Caso | Extended Thinking | Por qué |
|------|------------------|---------|
| ADR / decisión arquitectónica | Sí (budget=8000) | Necesita razonar trade-offs profundos |
| Auditoría de seguridad | Sí (budget=10000) | Debe construir y atacar al mismo tiempo |
| Análisis de contrato | Sí (budget=6000) | Múltiples cláusulas interdependientes |
| Respuesta a lead WhatsApp | No | Latencia importa; Fable ya es superior sin ET |
| Digest diario | No | Sonnet es suficiente para este caso |
| Clasificación simple | No | Usar Haiku sin thinking |

### Activación en el gateway

```ts
const result = await llmCall({
  model: 'fable',
  tenant_slug: tenantSlug,
  request_id: crypto.randomUUID(),
  thinking: {
    type: 'enabled',
    budget_tokens: 8000,   // tokens reservados para el razonamiento interno
  },
  prompt: `
    Analiza este ADR propuesto y evalúa si es la decisión correcta.
    Considera todos los ángulos: técnicos, de costos, de riesgo operacional.
    ${adrContent}
  `,
});
```

### Cuánto budget de thinking asignar

```
Decisiones de 2-3 opciones:           budget: 3000-4000
Análisis de documento largo:          budget: 6000-8000
Auditoría de seguridad compleja:      budget: 8000-12000
Arquitectura de sistema completo:     budget: 10000-16000
```

**Nota:** Los tokens de thinking NO cuentan en el output cobrado, pero sí tienen un tope máximo. Si no ves diferencia, sube el budget.

### Leer el razonamiento interno

```ts
// El gateway puede devolver el thinking si se configura
const result = await llmCall({
  model: 'fable',
  thinking: { type: 'enabled', budget_tokens: 8000 },
  return_thinking: true,  // útil para debugging / logging
  prompt: '...',
});

console.log(result.thinking);  // el proceso interno de Fable
console.log(result.text);      // la respuesta final
```

Loggear el `thinking` a Hermes ayuda a entender por qué Fable tomó una decisión.

---

## Batching — Máxima Eficiencia de Costos

Para operaciones en volumen (análisis de muchos leads, digestos con múltiples tenants), el batching reduce costos y mejora throughput.

### Patrón de batch con Promise.all

```ts
// ❌ NO: llamadas secuenciales
for (const lead of leads) {
  await classifyLead(lead);  // 500ms × 100 leads = 50s
}

// ✅ SÍ: paralelo con control de concurrencia
import pLimit from 'p-limit';
const limit = pLimit(5);  // máx 5 llamadas simultáneas a Fable

const results = await Promise.all(
  leads.map(lead =>
    limit(() => llmCall({
      model: 'fable',
      tenant_slug: lead.tenant_slug,
      request_id: `batch-${lead.id}-${Date.now()}`,
      prompt: `Clasifica: ${JSON.stringify(lead)}`,
    }))
  )
);
// Resultado: ~3s en lugar de 50s para 100 leads
```

### Reglas de batching con Fable

- **Concurrencia máxima recomendada:** 5 llamadas paralelas por tenant (evitar rate limits de Anthropic)
- **Timeout por llamada:** 120s (Fable tarda más que Sonnet en thinking)
- **Retry con backoff:** Si Fable falla por rate limit, espera 5s y reinten con Sonnet como fallback

```ts
async function batchWithFable<T>(
  items: T[],
  processor: (item: T) => Promise<string>,
  options = { concurrency: 5, fallbackModel: 'sonnet' }
) {
  const limit = pLimit(options.concurrency);
  return Promise.all(
    items.map(item =>
      limit(async () => {
        try {
          return await processor(item);
        } catch (err) {
          if (err.code === 'RATE_LIMIT') {
            await sleep(5000);
            return llmCall({ model: options.fallbackModel, ... });
          }
          throw err;
        }
      })
    )
  );
}
```

### Cuándo batching es contraproducente

- **Una sola tarea compleja:** Fable necesita todo su contexto en un mensaje, no varios paralelos.
- **Orden importa:** Si el output de A alimenta a B, no se puede paralelizar.
- **Thinking activado:** Extended thinking es secuencial internamente; el batching igual ayuda para múltiples ítems independientes.

---

## Temperatura y Parámetros de Sampling

Fable responde diferente a estos parámetros vs. Sonnet/Haiku:

### Tabla de configuración por caso de uso

| Caso de uso | temperature | top_p | Comportamiento esperado |
|-------------|-------------|-------|------------------------|
| Análisis / decisiones | 0.0 - 0.2 | 0.95 | Determinístico, reproducible |
| Generación de código | 0.0 - 0.1 | 0.95 | Exacto, predecible |
| Respuestas a leads | 0.3 - 0.5 | 0.9 | Natural pero consistente |
| Contenido creativo | 0.7 - 0.9 | 0.85 | Variado, creativo |
| Brainstorming | 0.8 - 1.0 | 0.8 | Máxima diversidad |

### En el gateway

```ts
const result = await llmCall({
  model: 'fable',
  tenant_slug: tenantSlug,
  request_id: crypto.randomUUID(),
  temperature: 0.1,     // análisis determinístico
  max_tokens: 4096,     // Fable puede generar hasta 8192
  prompt: '...',
});
```

### Diferencia clave vs. Sonnet

Fable con `temperature: 0` es **más determinístico** que Sonnet con `temperature: 0`. El razonamiento interno de Fable produce outputs más estables entre llamadas. Úsalo cuando necesites reproducibilidad (tests, auditorías, comparaciones A/B).

---

## Qué NO hacer con Fable 5

| Anti-patrón | Problema | Alternativa |
|------------|---------|------------|
| Usarlo para clasificaciones simples | Costo 5x innecesario | Haiku |
| Llamadas en loops de alta frecuencia | Costo + rate limits | Sonnet o Haiku |
| Prompts de 3 palabras | No aprovecha capacidades | Sé específico |
| Sin tenant_slug | Sin trazabilidad | Siempre incluir |
| Sin request_id | Sin debugging | `crypto.randomUUID()` |
| Streams sin timeout | Si falla, cuelga | Max 120s timeout |

---

## Estrategia para modelos más ligeros (heredar lo de Fable)

El conocimiento que Fable produce puede "destilarse" para modelos más baratos:

```ts
// Patrón: Fable genera, Haiku aplica
async function distillKnowledge(tenantSlug: string) {
  // 1. Fable genera el "template inteligente" una vez
  const template = await llmCall({
    model: 'fable',
    prompt: `Analiza estos 100 leads históricos y genera un rubric 
             de clasificación con reglas exactas que un modelo pequeño 
             pueda aplicar sin contexto adicional.`,
  });
  
  // 2. Guarda en brain/supabase
  await saveTemplate(tenantSlug, template);
  
  // 3. Haiku aplica el template para cada nuevo lead
  const classification = await llmCall({
    model: 'haiku',
    prompt: `Usando este rubric: ${template}\n\nClasifica: ${newLead}`,
  });
}
```

**Idea clave:** Fable crea el conocimiento, modelos baratos lo ejecutan. Así escalas sin costo lineal.

---

## Skills relacionados

- `opsly-llm` — LLM Gateway, configuración base
- `opsly-orchestrator` — BullMQ + Fable para decisiones de orquestación
- `opsly-tenant` — Cómo configurar Fable por tenant
- `brain/modules/llm-gateway` — Tabla completa de modelos y routing
- `fable5-agent-instructions` — Instrucciones para Sonnet/Haiku/n8n sin Fable

---

## Estrategia AI

- [[brain/AI-STRATEGY]] — Stack de modelos completo y matriz de decisión
- [[brain/TENANT-AI-PLAYBOOK]] — Configuración AI por tenant
- [[ADR-047-fable5-model-strategy]] — Decisión de Fable como top-tier

---

## Referencias

- [providers.ts](../../../apps/llm-gateway/src/providers.ts) — Configuración del gateway
- [brain/modules/llm-gateway.md](../modules/llm-gateway.md) — Tabla de modelos
- [opsly-llm.md](./opsly-llm.md) — Skill de LLM Gateway
- [brain/AI-STRATEGY.md](../AI-STRATEGY.md) — Estrategia AI master
- [brain/TENANT-AI-PLAYBOOK.md](../TENANT-AI-PLAYBOOK.md) — Playbook por tenant

---

*Creado: 2026-07-08 | Versión: 1.0.0 | Modelo: claude-fable-5*

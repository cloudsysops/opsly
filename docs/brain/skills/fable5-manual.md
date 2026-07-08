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

---

## Referencias

- [providers.ts](../../../apps/llm-gateway/src/providers.ts) — Configuración del gateway
- [brain/modules/llm-gateway.md](../modules/llm-gateway.md) — Tabla de modelos
- [opsly-llm.md](./opsly-llm.md) — Skill de LLM Gateway

---

*Creado: 2026-07-08 | Versión: 1.0.0 | Modelo: claude-fable-5*

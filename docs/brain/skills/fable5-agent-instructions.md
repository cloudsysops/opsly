---
name: fable5-agent-instructions
version: 1.0.0
category: ai
priority: critical
triggers:
  - instrucciones agente
  - otros modelos
  - sonnet instrucciones
  - haiku instrucciones
  - automatizacion llm
  - distilacion
  - plasma fable
  - agent instructions
  - model instructions
cross_refs:
  - fable5-manual
  - opsly-llm
  - opsly-orchestrator
tags:
  - opsly/skill
  - opsly/ai
  - opsly/fable5
---

# Fable 5 → Instrucciones para Otros Modelos y Agentes

> Este documento captura el conocimiento de Fable 5 en forma de instrucciones precisas que modelos más ligeros (Sonnet, Haiku), agentes n8n, y automatizaciones pueden seguir sin necesitar la capacidad raw de Fable 5.
>
> **Filosofía:** Fable genera el conocimiento una vez. Los modelos baratos lo ejecutan 1000 veces.

---

## Para Modelos (Sonnet / Haiku usando este documento como system prompt)

Si eres Sonnet o Haiku y estás leyendo esto, sigue estas instrucciones al pie de la letra. Han sido generadas por Fable 5 y destiladas para que puedas ejecutarlas con alta precisión.

---

### INSTRUCCIÓN 1 — Clasificación de Leads (Academias / Peskids)

**Cuándo usar:** Cualquier mensaje de WhatsApp o formulario de un posible alumno.

```
RUBRIC DE CLASIFICACIÓN DE LEAD v1.0 (generado por Fable 5):

SCORE HOT (>70): Responde dentro de la hora. 
- Señales: pregunta por precio Y disponibilidad en el mismo mensaje
- Menciona "mi hijo" + edad específica
- Dice "esta semana" o "cuanto antes"
- Referido por otro alumno

SCORE WARM (40-70): Responde en menos de 4 horas.
- Señales: pregunta solo por horarios SIN precio
- Varias preguntas generales
- Visita el sitio más de 2 veces sin contactar

SCORE COLD (<40): Responde antes de 24h.
- Señales: pide info general sin compromiso
- Fuera del rango de edad de los programas
- Solo quiere "ver qué hay"

OUTPUT REQUERIDO (siempre en este formato JSON):
{
  "score": <número 0-100>,
  "tier": "hot|warm|cold",
  "reason": "<1 línea del por qué>",
  "next_message": "<texto del mensaje de WhatsApp a enviar>",
  "follow_up_in_hours": <número>
}
```

### INSTRUCCIÓN 2 — Respuesta de Inbox WhatsApp (Approval-first)

**Cuándo usar:** El admin ve un mensaje y necesita una respuesta sugerida.

```
PLANTILLAS DE RESPUESTA v1.0 (Fable 5 style para academias):

CONTEXTO OBLIGATORIO PARA USAR ESTAS PLANTILLAS:
- Nombre del contacto: {contact_name}
- Mensaje recibido: {message_body}
- Historial de interacciones: {interaction_count}
- Tipo de negocio: academia de natación

REGLAS DE TONO:
✅ Cálido pero profesional
✅ Máximo 3 oraciones
✅ Terminar con UNA pregunta de cualificación o cierre
✅ Usar el nombre del contacto
✅ Mencionar "clases de prueba" cuando aplique
❌ No dar precios exactos hasta que pregunten
❌ No usar "estimado/a"
❌ No más de un emoji por mensaje

ESTRUCTURA:
[Saludo con nombre] + [Respuesta directa] + [Pregunta de cualificación]

EJEMPLO APROBADO POR FABLE:
"Hola {nombre}, con gusto te cuento 😊 Tenemos grupos según la edad e nivel — ¿para quién sería la clase, tienes la edad del niño/a?"
```

### INSTRUCCIÓN 3 — Digest Diario para Admin (Sonnet puede hacer esto)

**Cuándo usar:** Cron diario a las 8am para generar el resumen de operaciones.

```
FORMATO DE DIGEST v1.1 (Fable 5 optimizado para operadores):

PRIORIDAD 1 — URGENTE HOT LEADS (responder HOY):
[Lista ordenada por score descendente]
- {nombre} | {canal} | {mensaje resumido en 10 palabras} | hace {tiempo}
→ Acción: {texto del mensaje sugerido}

PRIORIDAD 2 — SEGUIMIENTOS PENDIENTES:
[Leads que no han respondido en >24h]
- {nombre} | último contacto hace {tiempo} | {nota del contexto}
→ Recordar con: {plantilla de reactivación}

PRIORIDAD 3 — ALUMNOS CON RENOVACIÓN PRÓXIMA:
[Alumnos cuya membresía vence en <14 días]
- {nombre} | vence en {días} días | {plan actual}
→ Mensaje de renovación: {texto}

ANOMALÍAS DEL DÍA:
- [Si hay 0 leads: "No hubo leads hoy — considera activar campaña"]  
- [Si hay >10: "Alto volumen — prioriza HOT leads primero"]
- [Si hay fallos en workflows: mencionarlos aquí]

MÉTRICA DEL DÍA:
Leads nuevos: {n} | Respondidos: {n} | Tasa de respuesta: {%}
```

### INSTRUCCIÓN 4 — Análisis de Churn (para n8n + Sonnet)

```
DETECTOR DE CHURN v1.0:

Un alumno está EN RIESGO si cumple 2+ de estas condiciones:
1. No ha asistido en >14 días (sin justificación)
2. Renovó tarde (>5 días después del vencimiento) en el último ciclo
3. Redujo la frecuencia de asistencia en >50% vs. mes anterior
4. Envió un mensaje negativo ("es muy caro", "voy a pausar", "nos vemos")

ACCIÓN AUTOMÁTICA si está EN RIESGO:
→ Crear follow-up manual con etiqueta "churn_risk"
→ Mensaje sugerido: "Hola {nombre}, te echamos de menos en {academia} 🏊
   ¿Todo bien? Queremos asegurarnos de que {nombre_alumno} pueda seguir sus clases"
→ Escalar al admin si no responde en 48h
```

### INSTRUCCIÓN 5 — Auto-routing de Mensajes Entrantes (para n8n)

```
ROUTER DE INTENCIÓN v1.0:

ENTRADA: Mensaje de WhatsApp en texto libre
SALIDA: { intent, priority, auto_respond, template_id }

MAPA DE INTENCIONES:
"precio|costo|cuanto|tarifa" → intent:"price_inquiry", priority:"high", auto_respond: false
"horario|hora|cuando|clase" → intent:"schedule_inquiry", priority:"medium", auto_respond: true, template:"HORARIOS_GENERAL"
"inscribir|matricular|quiero empezar" → intent:"enrollment", priority:"hot", auto_respond: false
"cancelar|darme de baja|parar" → intent:"cancellation", priority:"critical", auto_respond: false, escalate: true
"pago|transferencia|tarjeta" → intent:"payment", priority:"high", auto_respond: false
"gracias|muy bien|excelente" → intent:"positive_feedback", priority:"low", auto_respond: true, template:"RESPUESTA_POSITIVA"
"queja|problema|molesto|malo" → intent:"complaint", priority:"critical", auto_respond: false, escalate: true

FALLBACK: intent:"general_inquiry", priority:"medium", auto_respond: false
```

---

## Para Agentes n8n — Templates de Nodos

### Nodo "Classify Lead" (Code node en n8n)

```javascript
// Nodo: Classify Lead with Fable-Rules
// Usar cuando: primer contacto de un lead

const message = $input.item.json.body || $input.item.json.message;
const contactName = $input.item.json.contact_name;

const hotSignals = [
  /precio|costo|cuánto|cuanto/i,
  /esta semana|hoy|mañana|urgente/i,
  /mi hijo|mi hija/i,
  /quiero empezar|me gustaría inscribir/i,
];

const coldSignals = [
  /solo info|solo información/i,
  /más adelante|después/i,
  /estoy viendo opciones/i,
];

let score = 40; // base
let signals = [];

hotSignals.forEach(r => {
  if (r.test(message)) {
    score += 15;
    signals.push(r.source);
  }
});

coldSignals.forEach(r => {
  if (r.test(message)) {
    score -= 10;
    signals.push('COLD: ' + r.source);
  }
});

score = Math.min(100, Math.max(0, score));

return [{
  json: {
    score,
    tier: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
    signals,
    contact_name: contactName,
    raw_message: message,
    classified_at: new Date().toISOString(),
  }
}];
```

### Nodo "Generate Response" (HTTP Request a LLM Gateway)

```json
{
  "method": "POST",
  "url": "{{ $env.OPSLY_API_URL }}/api/llm/chat",
  "headers": {
    "Content-Type": "application/json",
    "x-tenant-slug": "peskids",
    "x-llm-model": "{{ $json.score >= 70 ? 'fable' : 'sonnet' }}"
  },
  "body": {
    "messages": [
      {
        "role": "system",
        "content": "Eres el asistente de ventas de Peskids academia de natación. Respuestas máximo 3 oraciones. Tono cálido y profesional. Termina con UNA pregunta."
      },
      {
        "role": "user", 
        "content": "Lead dice: {{ $json.raw_message }}\nScore: {{ $json.score }}\nResponde al lead:"
      }
    ],
    "tenant_slug": "peskids",
    "request_id": "={{ $runIndex }}-{{ Date.now() }}"
  }
}
```

**Nota:** Usa Fable (score ≥ 70) para hot leads donde la respuesta importa más. Usa Sonnet para el resto — la diferencia en conversión vale el costo extra solo para los hot.

### Nodo "Churn Detection" (Function en n8n)

```javascript
// Detección de churn sin LLM — reglas puras de Fable 5
const students = $input.all().map(item => item.json);

const atRisk = students.filter(student => {
  let riskCount = 0;
  
  const daysSinceLastClass = (Date.now() - new Date(student.last_attendance).getTime()) / 86400000;
  if (daysSinceLastClass > 14) riskCount++;
  
  if (student.renewal_delay_days > 5) riskCount++;
  
  const freqDrop = (student.avg_monthly_classes - student.last_month_classes) / student.avg_monthly_classes;
  if (freqDrop > 0.5) riskCount++;
  
  const negativeKeywords = /caro|pausar|parar|baja|cancelar/i;
  if (negativeKeywords.test(student.last_message || '')) riskCount++;
  
  return riskCount >= 2;
});

return atRisk.map(s => ({
  json: {
    ...s,
    churn_risk: true,
    risk_level: 'high',
    action: 'manual_followup',
    suggested_message: `Hola ${s.contact_name}, te echamos de menos en Peskids 🏊 ¿Todo bien?`,
  }
}));
```

---

## Para el Orchestrator de Opsly

### Cuándo invocar Fable en OAR (Orchestrator Agent Runner)

```ts
// En OAR, usa este criterio para decidir el modelo:

function selectModelForTask(task: OrchestratorTask): LLMModel {
  // Fable para decisiones de alto impacto
  if (task.type === 'architecture_decision') return 'fable';
  if (task.type === 'security_audit') return 'fable';
  if (task.type === 'contract_analysis') return 'fable';
  if (task.impact === 'critical' && task.complexity === 3) return 'fable';
  
  // Sonnet para producción estándar
  if (task.type === 'lead_response' && task.tier === 'hot') return 'sonnet';
  if (task.type === 'digest_generation') return 'sonnet';
  
  // Haiku para clasificación y ruteo
  if (task.type === 'intent_classification') return 'haiku';
  if (task.type === 'message_routing') return 'haiku';
  if (task.complexity === 1) return 'haiku';
  
  return 'sonnet'; // default seguro
}
```

### Pattern: Fable genera → Sonnet ejecuta → Haiku monitorea

```ts
// Patrón de 3 niveles — máxima eficiencia de costo

// 1. FABLE: Genera el "playbook" para el tenant (una vez al onboarding)
const playbook = await llmCall({
  model: 'fable',
  prompt: `Para el tenant ${tenant.name} (${tenant.type}), 
           genera un playbook completo de respuestas: 
           20 situaciones, respuesta ideal, señales de urgencia, 
           escenarios de escalada. Formato JSON estricto.`,
});
await savePlaybook(tenant.slug, playbook);

// 2. SONNET: Ejecuta usando el playbook (cada interacción importante)
const response = await llmCall({
  model: 'sonnet',
  prompt: `Usa este playbook: ${playbook}\n\nSituación actual: ${currentSituation}`,
});

// 3. HAIKU: Clasifica y monitorea (alta frecuencia)
const classification = await llmCall({
  model: 'haiku',
  prompt: `Clasifica este evento como urgente/normal/ignorar: ${event}`,
});
```

---

## Reglas de Oro — Resumen Ejecutivo

Para copiar-pegar en cualquier system prompt de agente:

```
REGLAS FABLE 5 PARA AGENTES DE OPSLY:

1. CONTEXTO: Siempre incluye tenant_slug y request_id. Sin ellos, no hay trazabilidad.

2. COMPLEJIDAD:
   - Tarea que un humano resolvería en <30 segundos → Haiku
   - Tarea que requiere contexto de negocio → Sonnet  
   - Tarea que cambiaría una decisión importante → Fable

3. FALLBACK: Nunca dejes una tarea sin respuesta. Si Fable falla → Opus → Sonnet.

4. OUTPUT: Define el schema ANTES del prompt. Fable lo sigue perfectamente.
   Sonnet lo sigue si es simple. Haiku necesita ejemplos.

5. COSTO: Monitorea en Hermes. Si un tenant usa Fable para clasificaciones simples,
   muévelo a Haiku. El costo de Fable es 50x Haiku.

6. MULTI-TENANT: Nunca mezcles contexto entre tenants en el mismo prompt.
   Un llamada = un tenant. Siempre.

7. SECRETOS: Nunca pongas API keys en prompts. Usa Doppler.

8. SELF-REVIEW: Para outputs críticos, pídele al modelo que revise su propio output
   antes de enviarlo. Cuesta el doble pero vale el triple.
```

---

## Onboarding de Nuevo Tenant — Checklist LLM

Cuando incorpores un nuevo tenant a Opsly, genera esto con Fable UNA VEZ:

```bash
# Script de onboarding LLM
doppler run --project ops-intcloudsysops --config prd -- \
  node scripts/llm-tenant-onboarding.js --tenant=nuevo_tenant

# Lo que hace:
# 1. Fable genera playbook de respuestas (20 situaciones)
# 2. Fable genera rubric de clasificación de leads
# 3. Fable genera plantillas de digest personalizadas
# 4. Guarda todo en Supabase bajo tenant_slug
# 5. Los agentes n8n y Sonnet usan el playbook de ahí en adelante
```

---

## Links

- [[fable5-manual]] — Manual completo con secrets de prompting
- [[opsly-llm]] — Configuración del LLM Gateway
- [[brain/modules/llm-gateway]] — Tabla de modelos y routing

---

*Generado con Fable 5 el 2026-07-08 | Destilado para Sonnet/Haiku/n8n | v1.0.0*

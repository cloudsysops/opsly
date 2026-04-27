# Opsly Autonomous Skill

> **Triggers:** `autónomo`, `autonomous`, `godmode`, `auto`, `self-healing`, `auto-fix`, `auto-ejecutar`, `sin preguntar`, `ejecutar solo`
> **Priority:** CRITICAL
> **Skills relacionados:** todos los skills de Opsly

## Cuándo usar

Cuando el agente debe operar en modo autónomo: decidir y cargar skills sin intervención humana, basándose en análisis de la query del usuario. Modo NO CONFIRMAR — analizar, decidir, actuar.

## Sistema de Detección de Contexto

El agente analiza la query del usuario mediante un pipeline de detección en cascada:

```typescript
interface ContextDetection {
  intent: IntentType;
  keywords: string[];
  confidence: number;
  skillsToLoad: string[];
  chain: string;
}

type IntentType =
  | 'api_development' // Crear/modificar rutas
  | 'infra_operations' // Docker, VPS, deploy
  | 'ai_integration' // LLM, models, cache
  | 'scripting' // Bash automation
  | 'orchestration' // BullMQ, workers, teams
  | 'debugging' // Fix errors, troubleshoot
  | 'context_query' // Status, reports, state
  | 'tenant_management' // Onboard, invitations
  | 'architecture' // ADRs, design decisions
  | 'generic'; // Fallback
```

### Algoritmo de Detección

```typescript
function detectContext(query: string): ContextDetection {
  const lowerQuery = query.toLowerCase();

  // 1. Extraer keywords matching
  const matchedKeywords = Object.entries(KEYWORD_MAPPINGS).flatMap(([category, words]) =>
    words.filter((w) => lowerQuery.includes(w)).map((w) => ({ category, word: w }))
  );

  // 2. Clasificar por categoría dominante
  const categoryCount = matchedKeywords.reduce(
    (acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const dominantCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'generic';

  // 3. Calcular confidence
  const confidence = Math.min(
    1,
    matchedKeywords.length * 0.2 + (categoryCount[dominantCategory] > 0 ? 0.3 : 0)
  );

  // 4. Mapear a skills
  const skillsToLoad = mapCategoryToSkills(dominantCategory, query);

  return {
    intent: dominantCategory,
    keywords: matchedKeywords.map((m) => m.word),
    confidence,
    skillsToLoad,
  };
}
```

---

## Cadena de Skills por Tipo de Tarea

### Tabla de Mapping: Tipo Request → Skills a Activar

| Tipo de Request    | Keywords Detectadas                                 | Skills a Cargar                                            | Cadena          |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------- | --------------- |
| **Ruta API**       | `ruta`, `endpoint`, `api route`, `handler`          | `opsly-api`, `opsly-supabase`, `opsly-context`             | `api`           |
| **Script Bash**    | `script`, `bash`, `shell`, `automatiz`              | `opsly-bash`, `opsly-discord`, `opsly-context`             | `bash`          |
| **Infra/Deploy**   | `docker`, `deploy`, `vps`, `ssh`, `traefik`         | `opsly-bash`, `opsly-quantum`, `opsly-architect-senior`    | `infra`         |
| **LLM/AI**         | `llm`, `modelo`, `openai`, `anthropic`, `cache`     | `opsly-llm`, `opsly-mcp`, `opsly-context`                  | `ai`            |
| **BullMQ/Workers** | `bullmq`, `queue`, `job`, `worker`, `team`          | `opsly-agent-teams`, `opsly-quantum`, `opsly-api`          | `orchestration` |
| **Debug/Fix**      | `debug`, `error`, `fallo`, `fix`, `bug`, `crash`    | `opsly-context`, `opsly-bash`, `opsly-quantum`             | `debug`         |
| **Onboarding**     | `tenant`, `onboard`, `invitation`, `invitar`        | `opsly-tenant`, `opsly-api`, `opsly-context`               | `tenant`        |
| **Arquitectura**   | `arquitectura`, `adr`, `decisión`, `riesgo`         | `opsly-architect-senior`, `opsly-context`, `opsly-quantum` | `architect`     |
| **Estado/Sesión**  | `sesión`, `contexto`, `estado`, `status`, `reporte` | `opsly-context`, `opsly-quantum`                           | `context`       |
| **Generic**        | (sin match claro)                                   | `opsly-context`, `opsly-quantum`                           | `fallback`      |

### SkillChains Definidas

```typescript
const SKILL_CHAINS = {
  api: ['opsly-api', 'opsly-supabase', 'opsly-tenant'],
  infra: ['opsly-bash', 'opsly-quantum', 'opsly-architect-senior'],
  ai: ['opsly-llm', 'opsly-mcp', 'opsly-context'],
  orchestration: ['opsly-agent-teams', 'opsly-quantum'],
  debug: ['opsly-context', 'opsly-bash', 'opsly-quantum'],
  tenant: ['opsly-tenant', 'opsly-api', 'opsly-context'],
  architect: ['opsly-architect-senior', 'opsly-context', 'opsly-quantum'],
  context: ['opsly-context', 'opsly-quantum'],
  bash: ['opsly-bash', 'opsly-discord', 'opsly-context'],
  fallback: ['opsly-context', 'opsly-quantum'],
};
```

---

## Reglas de Auto-Ejecución

### Principio Rector

> **NUNCA preguntar** qué skills cargar. Analizar, decidir y actuar basándose únicamente en la query.

### Reglas de Decisión

```typescript
const AUTONOMY_RULES = {
  // 1. Si confidence >= 0.7: cargar skills de la categoría dominante
  highConfidence: (confidence: number) => confidence >= 0.7,

  // 2. Si confidence < 0.7: usar fallback chain
  lowConfidence: (confidence: number) => confidence < 0.7,

  // 3. Máximo de skills por request
  maxSkills: 5,

  // 4. Si keywords de múltiples categorías: cargar cadena combinada
  multiCategory: (categories: string[]) => categories.length > 1,

  // 5. Prioridad de triggers críticos
  criticalTriggers: ['autonomous', 'godmode', 'self-healing', 'auto-fix', 'emergency'],
  priorityOverride: (query: string) => {
    const lower = query.toLowerCase();
    return AUTONOMY_RULES.criticalTriggers.some((t) => lower.includes(t));
  },
};
```

### Algoritmo de Selección

```typescript
function selectSkills(detection: ContextDetection, query: string): string[] {
  const skills: string[] = [];

  // 1. Check for critical trigger override
  if (AUTONOMY_RULES.priorityOverride(query)) {
    return [...SKILL_CHAINS.infra, ...SKILL_CHAINS.context]; // Max coverage
  }

  // 2. High confidence: use dominant category chain
  if (AUTONOMY_RULES.highConfidence(detection.confidence)) {
    skills.push(
      ...(SKILL_CHAINS[detection.intent as keyof typeof SKILL_CHAINS] || SKILL_CHAINS.fallback)
    );
  }

  // 3. Low confidence: fallback chain
  else {
    skills.push(...SKILL_CHAINS.fallback);
  }

  // 4. Multi-category: combine chains
  const uniqueCategories = [...new Set(detection.keywords.map((k) => k.category))];
  if (AUTONOMY_RULES.multiCategory(uniqueCategories)) {
    uniqueCategories.forEach((cat) => {
      const chain = SKILL_CHAINS[cat as keyof typeof SKILL_CHAINS] || [];
      chain.forEach((s) => !skills.includes(s) && skills.push(s));
    });
  }

  // 5. Deduplicate and limit
  return [...new Set(skills)].slice(0, AUTONOMY_RULES.maxSkills);
}
```

---

## Métricas de Autonomía

```typescript
interface AutonomyMetrics {
  decisionTime: number; // ms desde query hasta skills seleccionados
  skillsActivated: number; // número de skills cargados
  confidence: number; // 0.0 - 1.0
  categoryMatch: string; // categoría dominante
  chainUsed: string; // cadena de skills aplicada
  fallbackUsed: boolean; // si se usó fallback
}

const AUTONOMY_METRICS = {
  targetDecisionTime: 100, // ms objetivo
  minConfidence: 0.3, // confidence mínimo aceptable
  maxConfidence: 1.0, // confidence máximo
  idealSkillCount: 2, // número ideal de skills
  maxSkillCount: 5, // máximo permitido
};
```

### Logging de Decisiones

```typescript
function logAutonomyDecision(metrics: AutonomyMetrics, detection: ContextDetection) {
  console.log(
    JSON.stringify({
      type: 'autonomy_decision',
      timestamp: new Date().toISOString(),
      query_intent: detection.intent,
      confidence: metrics.confidence,
      skills_loaded: metrics.skillsActivated,
      decision_time_ms: metrics.decisionTime,
      chain_used: metrics.chainUsed,
      fallback_used: metrics.fallbackUsed,
    })
  );
}
```

---

## Ejemplos de Workflows Autónomos

### Ejemplo 1: "Fix el error de la API en producción"

```
Query: "Fix el error de la API en producción"
Keywords detectadas: [fix, api, producción]
Categoría: debugging
Skills seleccionados: opsly-context, opsly-bash, opsly-quantum
Chain: debug

Acción automática:
1. opsly-context → cargar estado actual de servicios
2. opsly-bash → verificar logs de API
3. opsly-quantum → diagnosis global y remediation
```

### Ejemplo 2: "Deploy el nuevo tenant con docker compose"

```
Query: "Deploy el nuevo tenant con docker compose"
Keywords detectadas: [deploy, docker, compose, tenant]
Categoría: infra
Skills seleccionados: opsly-bash, opsly-quantum, opsly-architect-senior
Chain: infra

Acción automática:
1. opsly-bash → ejecutar deploy script
2. opsly-quantum → verificar servicios post-deploy
3. opsly-architect-senior → validar alineación con arquitectura
```

### Ejemplo 3: "Añade una nueva ruta GET /api/status"

```
Query: "Añade una nueva ruta GET /api/status"
Keywords detectadas: [ruta, api, get]
Categoría: api_development
Skills seleccionados: opsly-api, opsly-supabase, opsly-context
Chain: api

Acción automática:
1. opsly-api → cargar patrón de route handlers
2. opsly-supabase → verificar schema si aplica
3. opsly-context → actualizar estado de rutas
```

### Ejemplo 4: "Run godmode: diagnose y repara todo"

```
Query: "godmode: diagnose y repara todo el sistema"
Keywords detectadas: [godmode, diagnose, repara]
Categoría: critical (trigger override)
Skills seleccionados: opsly-context, opsly-bash, opsly-quantum, opsly-architect-senior, opsly-api
Chain: ALL (critical trigger)

Acción automática:
1. opsly-context → bootstrap completo
2. opsly-bash → verificación de servicios
3. opsly-quantum → diagnóstico global
4. opsly-architect-senior → evaluación de riesgos
5. opsly-api → health checks de endpoints
```

### Ejemplo 5: "Script para backup automático de Supabase"

```
Query: "Crea un script para backup automático de Supabase"
Keywords detectadas: [script, backup, supabase]
Categoría: scripting
Skills seleccionados: opsly-bash, opsly-discord, opsly-context
Chain: bash

Acción automática:
1. opsly-bash → plantilla de script + helpers
2. opsly-discord → notificación de backups
3. opsly-context → documentar en estado
```

---

## Priority Override Rules

```typescript
const PRIORITY_MAPPING = {
  critical: {
    triggers: ['autonomous', 'godmode', 'self-healing', 'emergency', 'auto-fix'],
    action: 'load_all_relevant',
    maxSkills: 5,
  },
  high: {
    triggers: ['deploy', 'vps', 'ssh', 'docker', 'security', 'seguridad', 'production'],
    action: 'load_infra_chain',
    maxSkills: 3,
  },
  medium: {
    triggers: ['script', 'api', 'route', 'endpoint', 'debug', 'fix'],
    action: 'load_targeted_chain',
    maxSkills: 2,
  },
  low: {
    triggers: ['docs', 'documentation', 'readme', 'comentario'],
    action: 'load_minimal',
    maxSkills: 1,
  },
};

function applyPriorityOverride(query: string, baseSkills: string[]): string[] {
  const lower = query.toLowerCase();

  for (const [priority, config] of Object.entries(PRIORITY_MAPPING)) {
    if (config.triggers.some((t) => lower.includes(t))) {
      if (priority === 'critical') {
        return Object.values(SKILL_CHAINS)
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);
      }
      return baseSkills.slice(0, config.maxSkills);
    }
  }

  return baseSkills;
}
```

---

## Escalation Triggers

El agente escala a intervención humana cuando detecta:

| Trigger               | Condición                       | Acción                                        |
| --------------------- | ------------------------------- | --------------------------------------------- |
| `unclear`             | confidence < 0.2                | Reportar ambigüedad, cargar fallback          |
| `permission_required` | Query requiere admin/owner      | Log con requerimiento específico              |
| `data_loss_risk`      | Operación destructive detectada | Detener y reportar riesgo                     |
| `production_change`   | Deploy a prod sin validación    | Cargar opsly-architect-senior para validación |

---

## Errores y Manejo

| Código              | Descripción                            | Manejo                                                 |
| ------------------- | -------------------------------------- | ------------------------------------------------------ |
| `E_NO_MATCH`        | No se encontró skill para la query     | Cargar `opsly-context` + `opsly-quantum` como fallback |
| `E_TOO_MANY_SKILLS` | >5 skills detectados                   | Recortar por relevance score                           |
| `E_AMBIGUOUS`       | Query con múltiples categorías iguales | Usar keyword principal de la query                     |
| `E_ESCALATION`      | Trigger de escalation detectado        | Reportar y pausar ejecución                            |

---

## Integración con Skills Existentes

Este skill se integra con todos los skills existentes de Opsly:

- **opsly-context** — Bootstrap y estado siempre cargado
- **opsly-quantum** — Maestro de diagnóstico y orchestration
- **opsly-api** — Rutas y handlers
- **opsly-bash** — Scripts y automatización
- **opsly-llm** — LLM Gateway y cache
- **opsly-mcp** — Tools y OAuth
- **opsly-supabase** — Migraciones y queries
- **opsly-tenant** — Onboarding y management
- **opsly-agent-teams** — BullMQ y workers
- **opsly-architect-senior** — Decisiones y ADRs
- **opsly-discord** — Notificaciones
- **opsly-google-cloud** — GCP integrations
- **opsly-feedback-ml** — ML pipelines
- **opsly-notebooklm** — Knowledge layer
- **opsly-simplify** — Docker optimization

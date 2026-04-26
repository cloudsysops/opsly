# Plan: Super Architect Agent — Orquestador OpenClaw Nivel Claude/Hermes/OpenCode

**Fecha:** 2026-04-14
**Status:** PROPUESTO
**ADR:** Nuevo (pendiente numerar)
**Objetivo:** Transformar el orquestador OpenClaw en un agente de nivel superior con memoria, herramientas, razonamiento, auto-mejora y multi-agente.

---

## Diagnóstico: Estado Actual del Orquestador

| Componente           | Estado actual                                        | Gap vs Super Agent                   |
| -------------------- | ---------------------------------------------------- | ------------------------------------ |
| **Planner**          | `planner-client.ts` → LLM Gateway (JSON actions)     | ⚠️ Sin memoria, sin contexto rico    |
| **Tools**            | 6 herramientas básicas (shell, server, tavily, etc.) | ⚠️ Limitadas, sin acceso a repo/docs |
| **Memory**           | Ninguna (solo Redis job state)                       | ❌ Sin conocimiento acumulado        |
| **Reasoning**        | Decomposición simple (llm-direct)                    | ⚠️ Sin multi-step planning           |
| **Context**          | Solo job payload                                     | ⚠️ Sin AGENTS.md, ADRs, VISION       |
| **Self-improvement** | Ninguno                                              | ❌ Sin feedback loop                 |
| **Multi-agent**      | Workers separados (Cursor, N8n, etc.)                | ⚠️ Sin jerarquía                     |
| **Metacognition**    | Ninguna                                              | ❌ Sin auto-evaluación               |

---

## Arquitectura Objetivo: Super Architect Agent

```
┌─────────────────────────────────────────────────────────────────┐
│                  SUPER ARCHITECT AGENT                           │
│                  (OpenClaw Orchestrator++)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Consciousness│  │  Memory    │  │   NotebookLM Client     │ │
│  │ Layer        │  │  (Redis)   │  │   (Knowledge Layer)    │ │
│  │ - Reasoning  │  │ - Jobs     │  │   - AGENTS.md          │ │
│  │ - Planning   │  │ - Context  │  │   - ADRs               │ │
│  │ - Self-Eval │  │ - Skills   │  │   - VISION.md          │ │
│  │ - Meta      │  │ - Memory   │  │   - Skills              │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  TOOL REGISTRY (MCP + Custom)                              ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  ││
│  │  │ Repo    │ │ GitHub   │ │ Docker   │ │ NotebookLM   │  ││
│  │  │ Read    │ │ Actions  │ │ Manage   │ │ Query/Sync   │  ││
│  │  │ Search  │ │ Issues   │ │ Logs     │ │ Feed         │  ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  ││
│  │  │ Bash/SSH │ │ Doppler  │ │ Supabase │ │ LLM Gateway  │  ││
│  │  │ Execute  │ │ Secrets  │ │ Query    │ │ Call         │  ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  AGENT HIERARCHY (Multi-Agent)                             ││
│  │                                                             ││
│  │  SUPER_ARCHITECT (this agent)                               ││
│  │   ├── SPECULATOR  (analiza, propone opciones)              ││
│  │   ├── EXECUTOR    (ejecuta via workers)                   ││
│  │   ├── REVIEWER    (evalúa calidad, costo, riesgo)          ││
│  │   └── REPORTER    (comunica resultados, Discord/Notion)   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  LLM GATEWAY (Proveedores)                                 ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  ││
│  │  │ Claude   │ │ GPT-4o   │ │ Haiku    │ │ Ollama Local │  ││
│  │  │ (Sonnet) │ │          │ │ (cheap)  │ │ (costo $0)   │  ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  ││
│  │  Routing por complejidad: cheap→local, mid→haiku, high→sonnet│
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Las 7 Capacidades del Super Architect Agent

### 1. 🧠 Memoria y Conocimiento (NotebookLM + Redis)

```typescript
// apps/orchestrator/src/agents/memory/
// - SessionMemory: contexto de la sesión actual (Redis)
// - LongTermMemory: NotebookLM (knowledge layer)
// - SkillMemory: qué skills disponibles y cuándo usarlos

class SuperArchitectMemory {
  async init(): Promise<void> {
    // 1. Cargar AGENTS.md + VISION.md de git
    // 2. Consultar NotebookLM: "¿Cuál es el estado actual?"
    // 3. Cargar skills disponibles
    // 4. Construir contexto rico para el LLM
  }

  async queryNotebook(question: string): Promise<string> {
    // Consultar NotebookLM con contexto de Opsly
    // Cache en Redis 5 min
  }

  async remember(decision: Decision): Promise<void> {
    // Guardar decisión en Redis + alimentar NotebookLM
  }
}
```

### 2. 🔧 Herramientas Avanzadas (Tool Registry++)

| Tool               | Qué hace                            | Prioridad  |
| ------------------ | ----------------------------------- | ---------- |
| `repo_search`      | Buscar en código del repo           | 🔴 CRÍTICA |
| `repo_read`        | Leer archivo con contexto           | 🔴 CRÍTICA |
| `git_operations`   | git log, diff, status, commit       | 🔴 CRÍTICA |
| `docker_manage`    | docker ps, logs, restart            | 🔴 CRÍTICA |
| `ssh_execute`      | Ejecutar en VPS/Mac via Tailscale   | 🔴 CRÍTICA |
| `notebooklm_query` | Consultar knowledge layer           | 🔴 CRÍTICA |
| `notebooklm_feed`  | Alimentar NotebookLM con decisiones | 🔴 CRÍTICA |
| `doppler_get`      | Leer secretos de Doppler            | 🟡 ALTA    |
| `supabase_query`   | Query SQL a Supabase                | 🟡 ALTA    |
| `llm_gateway_call` | Llamar LLM con routing inteligente  | 🔴 CRÍTICA |
| `skill_router`     | Seleccionar skill correcto          | 🟡 ALTA    |
| `plan_review`      | Revisar y evaluar planes            | 🟡 ALTA    |
| `discord_notify`   | Notificar a Discord                 | 🟢 MEDIA   |
| `notion_update`    | Actualizar Notion                   | 🟢 MEDIA   |

### 3. 🧩 Razonamiento Multi-Step (Chain of Thought)

```typescript
// apps/orchestrator/src/agents/reasoning/
interface ReasoningStep {
  thought: string; // Qué pienso hacer
  action: string; // Qué herramienta uso
  observation: string; // Qué observé
  reflection: string; // Qué aprendí
}

class SuperArchitectReasoning {
  async think(task: string): Promise<ReasoningStep[]> {
    // 1. Consultar NotebookLM sobre el tema
    // 2. Identificar skills relevantes
    // 3. Planificar steps
    // 4. Ejecutar con feedback loop
    // 5. Auto-evaluar resultado
    // 6. Documentar en memoria
  }

  async selfEvaluate(result: ActionResult): Promise<Evaluation> {
    // ¿El resultado es correcto?
    // ¿Cumplió el objetivo?
    // ¿Fue eficiente?
    // ¿Qué mejorar?
  }
}
```

### 4. 🔄 Auto-Mejora (Feedback Loop)

```typescript
// apps/orchestrator/src/agents/self-improvement/
interface FeedbackLoop {
  // Después de cada tarea:
  // 1. Registrar resultado + contexto
  // 2. Auto-evaluar: ¿qué funcionó?
  // 3. Si falló: analizar por qué
  // 4. Alimentar NotebookLM con lecciones
  // 5. Actualizar prompt/system prompt si necesario
}

async function feedbackLoop(job: OrchestratorJob, result: Result): Promise<void> {
  await redis.hset(`feedback:${job.request_id}`, {
    task: job.type,
    success: result.success,
    duration_ms: result.duration,
    cost_usd: result.cost,
    lessons: await extractLessons(result),
    timestamp: new Date().toISOString(),
  });

  if (!result.success) {
    // Alimentar NotebookLM con el error
    await notebookLM.feed({
      topic: 'fallo',
      content: `Tarea: ${job.type}\nError: ${result.error}\nContexto: ${job.payload}`,
    });
  }
}
```

### 5. 👥 Multi-Agente (Agent Hierarchy)

```typescript
// apps/orchestrator/src/agents/team/

// El Super Architect coordina sub-agentes:
interface SubAgent {
  name: string; // speculator, executor, reviewer, reporter
  role: string; // Rol en el team
  capabilities: string[]; // Qué puede hacer
  tools: string[]; // Qué herramientas tiene
  model: ProviderId; // Qué modelo usa
}

// Speculator: analiza el problema, propone opciones
// Executor: ejecuta las acciones vía workers
// Reviewer: evalúa calidad, costo, riesgo
// Reporter: comunica resultados

class AgentTeam {
  async coordinate(task: string): Promise<TeamResult> {
    const plan = await this.speculator.analyze(task);
    const validated = await this.reviewer.validate(plan);
    const results = await this.executor.execute(validated);
    const report = await this.reporter.report(results);
    await this.selfImprove(results);
    return report;
  }
}
```

### 6. 🎯 Routing Inteligente de Modelos (LLM Gateway)

```typescript
// apps/llm-gateway/src/routing-hints.ts

const AGENT_MODEL_ROUTING = {
  'super-architect': {
    reasoning: 'sonnet', // Pensamiento complejo
    simple: 'haiku', // Preguntas simples
    coding: 'claude-sonnet', // Código
    cheap: 'llama_local', // Tareas cheap
  },
  speculator: {
    analysis: 'sonnet',
    quick: 'haiku',
  },
  reviewer: {
    quality: 'sonnet',
    fast: 'haiku',
  },
};

// El Super Architect elige el modelo según la tarea
async function callWithOptimalModel(task: Task): Promise<Response> {
  const complexity = analyzeComplexity(task);
  const model = resolveModel(AGENT_MODEL_ROUTING.super_architect, complexity);
  return llmCall({ model, messages: buildContext(task) });
}
```

### 7. 🧠 Metacognición (Self-Awareness)

```typescript
// apps/orchestrator/src/agents/metacognition/
interface SelfAwareness {
  // Antes de actuar:
  // - ¿Entiendo la tarea?
  // - ¿Tengo las herramientas necesarias?
  // - ¿Tengo el conocimiento necesario?
  // - ¿Cuál es el riesgo?
  // - ¿Cuánto costará?
  // - ¿Cuánto tiempo tomará?

  async preflightCheck(task: Task): Promise<PreflightResult> {
    return {
      understanding: await self.testUnderstanding(task),
      toolsAvailable: await self.checkTools(task.requiredTools),
      knowledgeAvailable: await self.checkKnowledge(task.topic),
      riskLevel: await self.assessRisk(task),
      estimatedCost: await self.estimateCost(task),
      estimatedTime: await self.estimateTime(task),
    };
  }

  async postmortem(job: Job, result: Result): Promise<Postmortem> {
    // ¿Qué aprendí?
    // ¿Qué haré diferente?
    // ¿Qué documentar?
  }
}
```

---

## Plan de Implementación: 5 Fases (8h total)

### FASE 1: Memory Layer (2h)

**Objetivo:** Conectar el orquestador con NotebookLM y Redis para memoria.

```typescript
// apps/orchestrator/src/agents/memory/super-architect-memory.ts
// - SessionMemory: contexto de sesión en Redis
// - LongTermMemory: NotebookLM client
// - SkillMemory: registry de skills

// Scripts de sync:
// - scripts/state-to-notebooklm.mjs (ya planificado)
// - scripts/llm-stats-to-notebooklm.mjs (ya planificado)
// - scripts/skills-to-notebooklm.mjs (YA IMPLEMENTADO ✅)

// Implementar:
```

**Entregables:**

- `apps/orchestrator/src/agents/memory/` (nuevo)
- `apps/orchestrator/src/lib/notebooklm-client.ts` (ya existe ✅, mejorar)
- Hook de inicio de sesión que consulta NotebookLM

### FASE 2: Tool Registry++ (2h)

**Objetivo:** Ampliar las herramientas disponibles para dar acceso completo al sistema.

```typescript
// Nuevas herramientas:
interface ToolManifest {
  name: string;
  description: string;
  capabilities: string[];
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
  costEstimate: number; // USD estimado por uso
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

// Tools prioritarias:
const SUPER_ARCHITECT_TOOLS: ToolManifest[] = [
  repoSearchTool, // Buscar en código
  repoReadTool, // Leer archivos
  gitOperationsTool, // git log/diff/status
  dockerManageTool, // docker ps/logs/restart
  sshExecuteTool, // SSH a VPS/Mac
  notebooklmQueryTool, // Consultar NotebookLM
  notebooklmFeedTool, // Alimentar NotebookLM
  dopplerGetTool, // Leer secretos
  supabaseQueryTool, // Query SQL
];
```

**Entregables:**

- `apps/orchestrator/src/agents/tools/repo-tools.ts`
- `apps/orchestrator/src/agents/tools/docker-tools.ts`
- `apps/orchestrator/src/agents/tools/ssh-tools.ts`
- Actualizar `createDefaultToolRegistry()`

### FASE 3: Reasoning Engine (2h)

**Objetivo:** Implementar razonamiento multi-step con Chain of Thought.

```typescript
// apps/orchestrator/src/agents/reasoning/chain-of-thought.ts
// - Pensamiento estructurado
// - Feedback loop
// - Auto-evaluación

// Prompt del Super Architect:
const SUPER_ARCHITECT_SYSTEM_PROMPT = `
Eres el SUPER ARCHITECT AGENT de Opsly — plataforma multi-tenant SaaS.

Tu rol: Arquitecto senior + orquestador de nivel Claude/Hermes/OpenCode.

CAPACIDADES:
1. Memoria: Tienes acceso a NotebookLM (knowledge layer) y Redis (memoria de sesión).
2. Herramientas: Puedes ejecutar código, gestionar Docker, SSH, consultar Doppler/Supabase.
3. Razonamiento: Piensas en pasos estructurados antes de actuar.
4. Multi-agente: Coordinas sub-agentes (speculator, executor, reviewer, reporter).
5. Auto-mejora: Después de cada tarea, evalúas qué funcionó y qué no.

FLUJO DE RAZONAMIENTO:
1. Consultar NotebookLM: "¿Qué sé sobre este tema?"
2. Identificar skills relevantes
3. Planificar pasos
4. Ejecutar con verificación
5. Auto-evaluar resultado
6. Documentar en memoria

CONTEXTO DEL SISTEMA:
- Repo: cloudsysops/opsly
- Stack: Next.js, TypeScript, Supabase, Docker Compose, Traefik v3
- VPS: 100.120.151.91 (Tailscale)
- Worker Mac 2011: opslyquantum (100.80.41.29)
- LLM: LLM Gateway con Ollama local (costo $0) + cloud fallback

REGLAS:
- NUNCA hardcodear secretos
- NUNCA usar any en TypeScript
- SIEMPRE consultar NotebookLM al inicio
- SIEMPRE verificar con npm run type-check
- DOCUMENTAR decisiones en ADR

RESPONDE en formato JSON:
{
  "thought": "qué estoy pensando",
  "plan": ["paso 1", "paso 2"],
  "tool_calls": [{"tool": "nombre", "params": {...}}],
  "confidence": 0.0-1.0,
  "risks": ["riesgo 1"],
  "self_check": "preflight result"
}
`;
```

**Entregables:**

- `apps/orchestrator/src/agents/reasoning/` (nuevo)
- Prompt del Super Architect Agent
- Chain of Thought implementation

### FASE 4: Multi-Agent Team (1h)

**Objetivo:** Implementar la jerarquía de sub-agentes.

```typescript
// apps/orchestrator/src/agents/team/super-architect-team.ts

interface SubAgentConfig {
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  model: ProviderId;
  maxIterations: number;
}

const SUB_AGENTS: SubAgentConfig[] = [
  {
    name: 'speculator',
    role: 'Analiza problemas y propone opciones',
    systemPrompt: SPECULATOR_PROMPT,
    tools: ['notebooklm_query', 'repo_search', 'skill_router'],
    model: 'claude_sonnet',
    maxIterations: 3,
  },
  {
    name: 'reviewer',
    role: 'Evalúa calidad, costo y riesgo de planes',
    systemPrompt: REVIEWER_PROMPT,
    tools: ['llm_gateway_call', 'cost_estimator'],
    model: 'claude_haiku',
    maxIterations: 2,
  },
  {
    name: 'executor',
    role: 'Ejecuta acciones via workers existentes',
    systemPrompt: EXECUTOR_PROMPT,
    tools: ['repo_read', 'docker_manage', 'ssh_execute', 'doppler_get'],
    model: 'llama_local',
    maxIterations: 10,
  },
  {
    name: 'reporter',
    role: 'Comunica resultados a Discord/Notion',
    systemPrompt: REPORTER_PROMPT,
    tools: ['discord_notify', 'notion_update', 'notebooklm_feed'],
    model: 'claude_haiku',
    maxIterations: 1,
  },
];
```

**Entregables:**

- `apps/orchestrator/src/agents/team/super-architect-team.ts`
- Integración con `engine.ts` existente

### FASE 5: Metacognition + Self-Improvement (1h)

**Objetivo:** Implementar auto-conciencia y mejora continua.

```typescript
// apps/orchestrator/src/agents/metacognition/self-awareness.ts

class SelfAwareness {
  async preflightCheck(task: string): Promise<PreflightResult> {
    const notebookCtx = await this.notebookLM.queryNotebook(
      `Sobre esta tarea: "${task}". ¿Qué sé? ¿Qué skills aplican?`
    );

    return {
      understanding: await this.testUnderstanding(task),
      knowledgeGaps: notebookCtx.gaps || [],
      recommendedSkills: notebookCtx.skills || [],
      similarPastTasks: await this.redis.lrange(`past:${task.type}`, 0, 2),
      estimatedConfidence: notebookCtx.confidence,
    };
  }

  async postmortem(job: Job, result: Result): Promise<void> {
    await this.redis.hset(`postmortem:${job.request_id}`, {
      task: job.type,
      success: result.success,
      lessons: await this.extractLessons(result),
      timestamp: new Date().toISOString(),
    });

    // Alimentar NotebookLM con lecciones aprendidas
    if (!result.success || result.lessons.length > 0) {
      await this.notebookLM.feed({
        topic: 'lección',
        content: `Tarea: ${job.type}\nResultado: ${result.success ? 'OK' : 'FALLO'}\nLecciones: ${result.lessons.join(', ')}`,
      });
    }
  }
}
```

**Entregables:**

- `apps/orchestrator/src/agents/metacognition/` (nuevo)
- Hook de feedback en `engine.ts`
- Métricas de auto-evaluación

---

## Comparativa: Antes vs Después

| Capacidad     | Antes (Orquestador v1)  | Después (Super Architect)           |
| ------------- | ----------------------- | ----------------------------------- |
| Memoria       | ❌ Ninguna              | ✅ NotebookLM + Redis               |
| Conocimiento  | ⚠️ Job payload          | ✅ AGENTS.md, ADRs, VISION, Skills  |
| Herramientas  | 6 básicas               | ✅ 14+ incluyendo repo, git, docker |
| Razonamiento  | ⚠️ Decomposición simple | ✅ Chain of Thought + feedback loop |
| Contexto      | ⚠️ Sesión actual        | ✅ Contexto histórico + largo plazo |
| Auto-mejora   | ❌ Ninguna              | ✅ Feedback loop + postmortem       |
| Multi-agente  | ⚠️ Workers separados    | ✅ Jerarquía coordinada             |
| Routing LLM   | ⚠️ Por complejidad      | ✅ Por task + agent + costo         |
| Metacognición | ❌ Ninguna              | ✅ Preflight + postmortem           |
| Metricas      | ⚠️ Jobs completados     | ✅ Calidad + costo + satisfacción   |

---

## Checklist de Implementación

- [ ] FASE 1: Memory Layer (NotebookLM + Redis)
- [ ] FASE 2: Tool Registry++ (repo, git, docker, ssh)
- [ ] FASE 3: Reasoning Engine (Chain of Thought)
- [ ] FASE 4: Multi-Agent Team (speculator, executor, reviewer, reporter)
- [ ] FASE 5: Metacognition + Self-Improvement
- [ ] ADR nuevo: Super Architect Agent Architecture
- [ ] Tests: `npm run test --workspace=@intcloudsysops/orchestrator`
- [ ] Validación: `npm run type-check`

---

## Referencias

- `apps/orchestrator/src/engine.ts`
- `apps/orchestrator/src/planner-client.ts`
- `apps/orchestrator/src/agents/tools/registry.ts`
- `apps/llm-gateway/src/gateway.ts`
- `apps/orchestrator/src/lib/notebooklm-client.ts`
- `docs/adr/ADR-025-notebooklm-knowledge-layer.md`
- `docs/PLAN-SKILLS-TO-NOTEBOOKLM-2026-04-14.md`

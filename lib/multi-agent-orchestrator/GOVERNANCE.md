# 🏛️ Governance — Multi-Agent Orchestrator

**Cómo se integra y usa en Opsly/ICSO**

---

## 📌 Ubicación en Opsly

```
lib/multi-agent-orchestrator/
├── core/
│   ├── orchestrator.ts          ← Core principal
│   └── agent-registry.ts        ← (próximamente)
├── agents/
│   ├── claude-remote.ts         ← (próximamente)
│   ├── cursor-local.ts          ← (próximamente)
│   ├── codex.ts                 ← (cuando tengas suscripción)
│   └── opencode.ts              ← (próximamente)
├── optimization/
│   └── token-optimizer.ts       ← Optimización
├── dispatch/
│   └── dispatcher.ts            ← Task dispatcher
└── types/
    └── index.ts                 ← TypeScript types
```

---

## 🔌 Integración en Opsly Moon

### 1. Nuevo módulo en `apps/admin` (Mission Control)

```typescript
// apps/admin/lib/multi-agent/client.ts
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';
import { TokenOptimizer } from '@intcloudsysops/multi-agent-orchestrator';

export const orchestrator = new MultiAgentOrchestrator({
  maxConcurrentTasks: 10,
  enableTokenOptimization: true,
  logLevel: 'info',
});

export const tokenOptimizer = new TokenOptimizer({
  monthlyBudgetUSD: 100,
  optimizationLevel: 'balanced',
});

// Registra agentes
orchestrator.registerAgent('claude_remote', claudeRemoteAgent);
orchestrator.registerAgent('cursor_local', cursorLocalAgent);
// Más agentes cuando estén disponibles
```

### 2. Panel en Opsly Moon Dashboard

```typescript
// apps/admin/app/multi-agent/page.tsx
export default function MultiAgentPanel() {
  const status = orchestrator.getStatus();
  const metrics = tokenOptimizer.getUsageSummary();
  const recommendations = tokenOptimizer.getOptimizationRecommendations();

  return (
    <div className="space-y-6">
      {/* Ejecutar nueva tarea */}
      <ExecuteTaskForm onSubmit={handleExecuteTask} />

      {/* Status de agentes */}
      <AgentStatusGrid agents={status.agents} />

      {/* Métricas de tokens */}
      <TokenMetricsPanel metrics={metrics} />

      {/* Cola de tareas */}
      <TaskQueuePanel
        executing={status.executingTasks}
        queued={status.queuedTasks}
      />

      {/* Recomendaciones */}
      <RecommendationsPanel recommendations={recommendations} />

      {/* Histórico */}
      <ExecutionHistory />
    </div>
  );
}
```

### 3. API Routes para integración

```typescript
// apps/admin/app/api/multi-agent/dispatch/route.ts
export async function POST(req: Request) {
  const { taskIds, source, preferredAgents } = await req.json();

  const response = await dispatcher.dispatchFromAPI({
    source,
    taskIds,
    preferredAgents,
  });

  return Response.json(response);
}

// apps/admin/app/api/multi-agent/status/route.ts
export async function GET() {
  return Response.json({
    status: orchestrator.getStatus(),
    metrics: tokenOptimizer.getUsageSummary(),
    recommendations: tokenOptimizer.getOptimizationRecommendations(),
  });
}

// apps/admin/app/api/multi-agent/dispatch-chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json();

  const response = await dispatcher.dispatchFromChat(message);

  return Response.json(response);
}
```

---

## 📊 Metricas en Opsly Moon

Nuevo widget en el dashboard que muestra:

```
┌─────────────────────────────────────────────┐
│ 🤖 MULTI-AGENT ORCHESTRATOR                 │
├─────────────────────────────────────────────┤
│                                              │
│ Agentes activos: 2/4                        │
│ Tareas ejecutando: 3                        │
│ Tareas en queue: 5                          │
│                                              │
│ Tokens usados este mes: 45,000 / 100,000    │
│ Costo: $4.50 / $30.00                       │
│ Proyección: $13.50 / $30.00                 │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ Agent     │ Tareas │ Costo │ Eficiencia │   │
│ ├───────────┼────────┼────────┼────────────┤   │
│ │ Claude    │   8    │ $1.20  │     85%    │   │
│ │ Cursor    │  12    │ $0.00  │     90%    │   │
│ │ Codex     │   0    │ $0.00  │      -     │   │
│ │ OpenCode  │   3    │ $0.00  │     70%    │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ 💡 Recomendaciones:                         │
│    ✅ Usa más Cursor (gratis, local)        │
│    ⚠️  Budget en 45% del límite             │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 🔄 Flujos de integración

### Flujo 1: Desde Chat (aquí)

```
Tú: "Ejecuta PESKIDS-1.1 a PESKIDS-1.4"
  ↓
ChatDispatcher.dispatchFromChat()
  ├─ Parsea: 4 tasks
  ├─ Calcula estimaciones
  └─ Envía a orchestrator
  ↓
MultiAgentOrchestrator
  ├─ Selecciona agentes óptimos
  ├─ Encolona tareas
  └─ Ejecuta (paralelo)
  ↓
Results → Opsly Moon panel en tiempo real
```

### Flujo 2: Desde CLI (git pull en tu Mac)

```
Tu Mac: git pull
  ↓
.git/hooks/post-checkout
  └─ Detecta .cursor-auto-work.json
  └─ Dispara CLI dispatcher
  ↓
CLIDispatcher.dispatchFromCLI()
  ├─ Lee config
  ├─ Envía a orchestrator
  └─ Cursor local es mejor opción
  ↓
Cursor ejecuta localmente
  ├─ npm install
  ├─ Edita archivos
  ├─ type-check ✅
  └─ git push
  ↓
Próxima tarea → Agente remoto (si es necesario)
```

### Flujo 3: Desde Dashboard Opsly Moon

```
Dashboard → Botón "Execute Task"
  ↓
Modal: Selecciona tarea + preferencias
  ↓
APIDispatcher.dispatchFromAPI()
  ├─ Valida permisos
  ├─ Encolona
  └─ Retorna dispatchId
  ↓
Panel monitorea en tiempo real
  ├─ Ve progreso
  ├─ Ve tokens usados
  └─ Ve ETA
  ↓
Notificación cuando termine
```

---

## 📈 Métricas en Supabase

Nueva tabla para rastrear ejecuciones:

```sql
CREATE TABLE multi_agent_executions (
  id UUID PRIMARY KEY,
  dispatch_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT, -- 'executing', 'completed', 'failed'
  tokens_used INTEGER,
  cost_usd DECIMAL,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_slug TEXT
);

CREATE INDEX idx_multi_agent_dispatch ON multi_agent_executions(dispatch_id);
CREATE INDEX idx_multi_agent_agent ON multi_agent_executions(agent_id);
CREATE INDEX idx_multi_agent_tenant ON multi_agent_executions(tenant_slug);
```

---

## 🔐 Seguridad

### Rate limiting
```
Por agente:
- Claude Remote: 3 tareas concurrentes
- Cursor Local: 1 tarea concurrente
- Codex: 5 tareas concurrentes
- OpenCode: 2 tareas concurrentes
```

### Validación
```
Cada tarea debe:
- Tener ID único
- Especificar archivos a editar
- Pasar validación de schema
- Ser revisada antes de ejecutar
```

### Auditoría
```
Se registra:
- Quién disparó la tarea (usuario)
- Desde dónde (chat, CLI, API)
- Qué agente ejecutó
- Todos los cambios (git log)
- Tokens consumidos
```

---

## 🚀 Deployment

### Package NPM

```bash
# Publicar en npm como módulo interno
npm publish --workspace=@intcloudsysops/multi-agent-orchestrator

# O importar localmente desde Opsly
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';
```

### Environment variables

```bash
# En .env.local (Opsly)
ORCHESTRATOR_ENABLED=true
ORCHESTRATOR_MAX_CONCURRENT=10
ORCHESTRATOR_TOKEN_LIMIT=100000
ORCHESTRATOR_LOG_LEVEL=info

# Credentials por agente
CLAUDE_REMOTE_TOKEN=sk-...
CODEX_TOKEN=gh_...
```

### Feature flag

```typescript
// Use feature flag para gradual rollout
if (FEATURES.isEnabled('multi_agent_orchestrator')) {
  registerMultiAgentPanel();
  setupWebhooks();
}
```

---

## 📝 Documentación para usuarios

### Opsly Moon Help Center
```
¿Cómo usar Multi-Agent Orchestrator?
  → Guía visual en dashboard
  → Ejemplos de comandos
  → FAQ y troubleshooting
  → Estimador de costos
```

### CLI Documentation
```bash
$ orchestrator --help
$ orchestrator dispatch PESKIDS-1.1
$ orchestrator status
$ orchestrator metrics --agent claude_remote
```

---

## 🧪 Testing

```typescript
// test/multi-agent-orchestrator.test.ts
describe('MultiAgentOrchestrator', () => {
  it('should select optimal agent based on cost', () => {
    // Test token optimizer
  });

  it('should dispatch from chat message', () => {
    // Test chat dispatcher
  });

  it('should handle agent failures with fallback', () => {
    // Test retry logic
  });

  it('should track tokens accurately', () => {
    // Test token tracking
  });
});
```

---

## 🤝 Contribuciones

Para agregar nuevo agente:

1. Implementa interfaz `Agent`
2. Crea archivo en `agents/`
3. Registra en config
4. Agrega tests
5. Documenta en README

Ejemplo:
```typescript
// agents/my-agent.ts
export class MyAgent implements Agent {
  id = 'my_agent';
  type: AgentType = 'custom';
  costPerTask = 0.05;

  isAvailable() { /* ... */ }
  async execute(task: Task) { /* ... */ }
}
```

---

## 📞 Support

- Chat: Pregunta en Opsly chat (integrado)
- Docs: `lib/multi-agent-orchestrator/README.md`
- Issues: GitHub issues con label `multi-agent`
- Roadmap: `lib/multi-agent-orchestrator/ROADMAP.md` (próximamente)

---

**Última actualización:** 2026-08-07  
**Versión:** 1.0 (MVP)  
**Mantenedor:** Santiago Boteros  
**Licencia:** Opsly Internal

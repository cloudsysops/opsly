# 🤖 Multi-Agent Orchestrator

**Sistema central que coordina múltiples agentes de IA para ejecutar tareas en paralelo, optimizando tokens y recursos**

---

## 🎯 Visión

Convertir **Opsly** en una plataforma de orquestación de agentes donde:

```
┌─────────────────────────────────────────────────────────────┐
│ OPSLY MOON - Mission Control Panel                          │
│ (Panel central que lo ve TODO)                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  CLAUDE  │ │ CURSOR   │ │  CODEX   │
    │ (Remote) │ │ (Local)  │ │ (GitHub) │
    └──────────┘ └──────────┘ └──────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┼─────────────────────┐
        │             │                     │
        ↓             ↓                     ↓
    ┌──────────┐ ┌──────────┐      ┌──────────────┐
    │ OPENCODE │ │  AGENTS  │      │ CUSTOM TOOLS │
    │ (OSS)    │ │ (OSS)    │      │ (BullMQ...)  │
    └──────────┘ └──────────┘      └──────────────┘

                    RESULTADO
                    ↓
        ✅ 17 PRs completadas en 4 horas
        ✅ 100% tokens optimizados
        ✅ 0 intervención manual
        ✅ Auditoría completa
```

---

## 📦 Componentes

### 1. **Multi-Agent Orchestrator Core**
- Coordina múltiples agentes
- Distribuye tareas según capacidad
- Maneja fallback automático
- Optimiza token usage

### 2. **Token Optimizer**
- Rastrea tokens consumidos
- Distribuye work según disponibilidad
- Sugiere mejor agente para cada tarea
- Optimiza cost/performance

### 3. **Task Dispatcher**
- Acepta tareas desde: chat, CLI, webhooks, API
- Encolamiento automático
- Retry y fallback
- Priorización

### 4. **Agent Registry**
- Registro de agentes disponibles
- Capacidades y limitaciones
- Health check
- Auto-discovery

### 5. **Opsly Moon Integration**
- Panel visual en dashboard
- Métricas en tiempo real
- Histórico de ejecuciones
- Control manual

### 6. **Auto-Installer**
- Detecta herramientas faltantes
- Instala automáticamente
- Configura credenciales
- Verifica funcionalidad

---

## 🚀 Uso (Simple)

### Desde el chat (aquí):
```
Tú: "Ejecuta PESKIDS level-up con mejor token usage"

Sistema:
  ✅ Analiza disponibilidad de tokens
  ✅ Distribuye 20 tareas entre agentes
  ✅ Claude Remote: tareas 1-8
  ✅ Cursor Local: tareas 9-12
  ✅ Codex: tareas 13-17
  ✅ OpenCode: tareas 18-20
  ✅ Todos en paralelo
  ✅ 4 horas después → COMPLETO
```

### Desde tu MacBook (local):
```bash
# Dispara con git pull
git pull origin claude/peskids-cursor-avance-1ortri

# Sistema automáticamente:
✅ Detecta .cursor-auto-work.json
✅ Determina mejor agente (Cursor local, más eficiente)
✅ Ejecuta tarea
✅ Crea PR
✅ Próxima tarea → Agente remoto si es mejor
```

### Desde dashboard Opsly Moon:
```
Botón "Ejecutar tarea"
  → Selecciona agent automático
  → Monitorea progreso
  → Ve métrica de tokens
  → Histórico completo
```

---

## 🎯 Agentes soportados

| Agente | Tipo | Tokens | Paralelo | Auto-install |
|--------|------|--------|----------|--------------|
| **Claude Remote** | CCR Session | Claude API | ✅ Sí | - |
| **Cursor** | Local Editor | Interno | ✅ Sí | Auto detecta |
| **Codex** | GitHub Copilot | Codex API | ✅ Sí | Requiere suscripción |
| **OpenCode** | Open Source | N/A | ✅ Sí | ✅ Auto-instala |
| **Custom Agents** | BullMQ/n8n | Variable | ✅ Sí | ✅ Via Docker |
| **Local LLM** | Ollama/LiteLLM | Local | ✅ Sí | ✅ Auto-instala |

---

## 📊 Optimización de Tokens

### Estrategia inteligente:

```
Tarea PESKIDS-1.1 (Header renovación):
  Complejidad: Media
  Tokens estimados: 5,000-8,000
  
  ¿Claude Remote? Costo: $0.15
  ¿Cursor Local? Costo: $0 (incluido)
  ¿OpenCode? Costo: $0 (open source)
  
  ✅ DECISIÓN: Cursor Local
  → Gratis
  → Rápido
  → Eficiente

Tarea PESKIDS-2.1 (Kanban improvements):
  Complejidad: Alta
  Archivos a editar: 8
  Componentes nuevos: 3
  
  ¿Cursor Local? Puede, pero lento
  ¿Claude Remote? Excelente, pero caro
  ¿Codex? Bueno, medio precio
  
  ✅ DECISIÓN: Codex (mejor ratio)
  → Precio medio
  → Rápido
  → Especializado en código
```

---

## 🔄 Flujo de ejecución

```
1. TAREA ENTRA (Chat / CLI / API)
   ↓
2. TASK DISPATCHER
   ├─ Parsea configuración
   ├─ Estima tokens
   └─ Encolorna
   ↓
3. AGENT SELECTOR
   ├─ Evalúa disponibilidad
   ├─ Calcula costo/token
   ├─ Considera paralelismo
   └─ Elige mejor agente
   ↓
4. AGENT EXECUTOR
   ├─ Prepara sandbox
   ├─ Transfiere contexto
   ├─ Monitorea ejecución
   └─ Recolecta métricas
   ↓
5. RESULTADO
   ├─ PR creado
   ├─ Metrics guardadas
   ├─ Notificaciones enviadas
   └─ Siguiente tarea en queue
```

---

## 📁 Estructura de módulo

```
lib/multi-agent-orchestrator/
├── core/
│   ├── orchestrator.ts          # Core principal
│   ├── agent-registry.ts        # Registro de agentes
│   └── task-queue.ts            # Cola de tareas
├── agents/
│   ├── claude-remote.ts         # Executor para Claude Remote
│   ├── cursor-local.ts          # Executor para Cursor
│   ├── codex.ts                 # Executor para Codex
│   ├── opencode.ts              # Executor para OpenCode
│   └── custom.ts                # Custom agents
├── optimization/
│   ├── token-optimizer.ts       # Optimización de tokens
│   ├── cost-calculator.ts       # Cálculo de costos
│   └── performance-metrics.ts   # Métricas
├── dispatch/
│   ├── chat-dispatcher.ts       # Desde chat
│   ├── cli-dispatcher.ts        # Desde CLI/git hooks
│   ├── webhook-dispatcher.ts    # Desde webhooks
│   └── api-dispatcher.ts        # Desde API
├── tools/
│   ├── auto-installer.ts        # Auto-instala tools
│   ├── health-check.ts          # Verifica agentes
│   └── credential-manager.ts    # Maneja credenciales
├── integration/
│   ├── opsly-moon.ts            # Dashboard integration
│   ├── supabase.ts              # Storage
│   └── webhooks.ts              # Outgoing webhooks
├── types/
│   └── index.ts                 # TypeScript types
├── GOVERNANCE.md                # Governance doc
└── README.md                    # Este archivo
```

---

## 🛠️ Instalación

### Registrar agentes:

```typescript
// config/agents.json
{
  "agents": {
    "claude_remote": {
      "enabled": true,
      "type": "ccr_session",
      "max_concurrent": 3,
      "tokens_per_hour": "unlimited",
      "cost_per_task": 0.15,
      "auto_install": false
    },
    "cursor_local": {
      "enabled": true,
      "type": "local_editor",
      "max_concurrent": 1,
      "tokens_per_hour": "included",
      "cost_per_task": 0,
      "auto_install": true
    },
    "codex": {
      "enabled": false,  // true cuando tengas suscripción
      "type": "copilot",
      "max_concurrent": 5,
      "tokens_per_hour": 100000,
      "cost_per_task": 0.08,
      "auto_install": false,
      "requires": ["github_token"]
    },
    "opencode": {
      "enabled": true,
      "type": "opensource",
      "max_concurrent": 2,
      "tokens_per_hour": "unlimited",
      "cost_per_task": 0,
      "auto_install": true
    }
  }
}
```

---

## 📊 Métricas que se rastrean

```
Por cada tarea:
├─ Agente utilizado
├─ Tokens consumidos
├─ Tiempo de ejecución
├─ Costo financiero
├─ Tasa de éxito
├─ Archivos modificados
├─ Commits creados
└─ PR generado

Agregadas:
├─ Tokens totales/mes
├─ Costo total
├─ Tareas completadas
├─ Tasa de éxito promedio
├─ Agente más eficiente
└─ Predicción de costos
```

---

## 🎯 Casos de uso

### 1. Peskids Level-Up (como ahora):
```
20 tareas distribuidas entre agentes
Claude Remote + Cursor + Codex en paralelo
4 horas de ejecución
~$2-3 de costo total
0 intervención manual
```

### 2. CI/CD Pipeline (futuro):
```
Cada PR triggerear tasks automáticas
Linting, testing, reviews - distributed
Resultados en 5 min vs 20 min
60% reducción de tiempo
```

### 3. Operaciones 24/7 (futuro):
```
Agentes trabajando en turnos
Claude Remote: tareas complejas (día)
Local agents: tareas simples (noche)
OpenCode: cuando todos estén fuera
Zero downtime
```

---

## 🔐 Seguridad

✅ **Sandbox:** Cada agente en su ambiente  
✅ **Tokens:** Rotación y versionado  
✅ **Audit:** Todos los cambios logged  
✅ **Limits:** Rate limiting por agente  
✅ **Approval:** PRs en draft (manual review)  
✅ **Encryption:** Credenciales encriptadas  

---

## 📈 Roadmap

### Fase 1 (Ahora):
- [x] Multi-Agent Orchestrator core
- [x] Claude Remote executor
- [x] Cursor local executor
- [ ] Token optimizer básico
- [ ] Task dispatcher CLI

### Fase 2 (Próximas 2 semanas):
- [ ] Codex executor (cuando tengas suscripción)
- [ ] OpenCode executor
- [ ] Dashboard Opsly Moon
- [ ] Auto-installer

### Fase 3 (Mes 2):
- [ ] Custom agent support
- [ ] Advanced scheduling
- [ ] Cost prediction
- [ ] Performance optimization

---

## 💡 Ejemplos

### Ejecutar desde chat (aquí):
```
Tú: "Ejecuta PESKIDS-1.1 a PESKIDS-1.4 en paralelo, 
     usa Cursor para 1.1 y 1.2, Claude Remote para 1.3 y 1.4"

Sistema:
  1. Dispatch: 4 tasks + config
  2. Agent selector: Cursor (1.1, 1.2), Claude (1.3, 1.4)
  3. Executor: Todos en paralelo
  4. Resultado: 4 PRs en 45 minutos
```

### Ejecutar desde CLI:
```bash
# En tu MacBook
git pull origin claude/peskids-cursor-avance-1ortri

# Sistema detecta y auto-selecciona:
#  Cursor Local es mejor (gratis, local)
#  Ejecuta en paralelo con otros agentes
#  PR listo en 15 minutos
```

### Ejecutar desde Opsly Moon:
```
Dashboard → Multi-Agent Panel
  → Botón "New Task"
  → Selecciona agentes (o auto)
  → Monitorea progreso en tiempo real
  → Ve métrica de tokens usados
```

---

## 📞 Soporte

Preguntas frecuentes integradas en docs/AGENT-ORCHESTRATOR-FAQ.md

---

**Estado:** 🟡 Listo para implementar  
**Módulo:** `@intcloudsysops/multi-agent-orchestrator`  
**Integración:** Opsly Moon + Peskids  
**Próximo paso:** Implementar components

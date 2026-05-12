# Super Orchestrator v2

> Sistema de orquestación multi-agente inteligente que controla Cursor, Claude, OpenCode, Ollama y más.

## Visión General

El Super Orchestrator v2 es un sistema de orquestación avanzado que:

- **Controla múltiples agentes**: Cursor, Claude, OpenCode, Copilot, Ollama (qwen2.5:7b, codellama:7b)
- **Selecciona proveedor automáticamente**: Basado en costo, calidad y latencia
- **Auto-evoluciona**: Analiza métricas y genera ideas de mejora
- **Ejecuta en paralelo**: BullMQ workers + Git automation + n8n integration

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ORCHESTRATOR v2                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Control    │  │   Execution  │  │   Auto-Evolution     │  │
│  │   Plane      │  │   Layer       │  │   Engine             │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │ Prompt       │→ │ BullMQ       │→ │ Performance Tracker  │  │
│  │ Controller   │  │ Workers      │  │ Idea Generator       │  │
│  │              │  │              │  │ Cost Optimizer       │  │
│  │ Provider     │  │ Local        │  │ Auto Evolution       │  │
│  │ Selector     │  │ Agents       │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        AGENTS & PROVIDERS                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Cursor  │ │ Claude  │ │OpenCode │ │ Ollama  │ │  n8n    │   │
│  │  :5001  │ │  :5002  │ │  :5004  │ │ :11434  │ │ webhooks│   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Python Scripts (`scripts/super_orchestrator/`)

| Módulo                   | Descripción                                                |
| ------------------------ | ---------------------------------------------------------- |
| `provider_selector.py`   | Auto-selecciona mejor proveedor por costo/calidad/latencia |
| `prompt_controller.py`   | Parsea prompts, extrae intención, ejecuta acciones         |
| `performance_tracker.py` | Rastrea métricas por proveedor y tarea                     |
| `auto_evolution.py`      | Analiza métricas y genera ideas de mejora                  |
| `agent_pool_manager.py`  | Administra pool de agentes disponibles                     |
| `health_monitor.py`      | Health checks para Ollama, Redis, API, etc.                |
| `cost_optimizer.py`      | Control de presupuesto y sugerencias de ahorro             |
| `idea_generator.py`      | Genera ideas de mejora basadas en contexto                 |
| `git_automation.py`      | Auto-commit, push, branch operations                       |
| `n8n_trigger.py`         | Dispara workflows de n8n                                   |

### 2. Configuración (`config/`)

- `super-orchestrator-config.json` - Configuración principal
- `provider-registry.json` - Catálogo de proveedores (8+ providers)

### 3. Integración TypeScript (`apps/orchestrator/`)

- `super-orchestrator-bridge.ts` - Bridge Python → TypeScript

## Modelos Recomendados

| Modelo         | Uso                           | Latencia |
| -------------- | ----------------------------- | -------- |
| `qwen2.5:7b`   | Reasoning, planning, analysis | ~2000ms  |
| `codellama:7b` | Code generation, review       | ~1800ms  |

## Uso

### Python CLI

```bash
# Selector de proveedor
python scripts/super_orchestrator/provider_selector.py --select --prompt "genera código"

# Dashboard de rendimiento
python scripts/super_orchestrator/performance_tracker.py --dashboard

# Health check
python scripts/super_orchestrator/health_monitor.py --check

# Auto-evolución
python scripts/super_orchestrator/auto_evolution.py --analyze
python scripts/super_orchestrator/auto_evolution.py --report
```

### TypeScript (Node.js)

```typescript
import { superOrchestrator } from './super-orchestrator-bridge.js';

// Seleccionar provider
const { provider, reasoning } = await superOrchestrator.selectProvider('revisar código');

// Registrar performance
await superOrchestrator.recordPerformance('ollama-qwen', 'code_review', 1500, true, 0.0);

// Dashboard unificado
console.log(await superOrchestrator.getUnifiedDashboard());
```

### CLI TypeScript

```bash
# Dashboard completo
node apps/orchestrator/dist/super-orchestrator-bridge.js dashboard

# Health check
node apps/orchestrator/dist/super-orchestrator-bridge.js health

# Estado de proveedores
node apps/orchestrator/dist/super-orchestrator-bridge.js providers

# Pool de agentes
node apps/orchestrator/dist/super-orchestrator-bridge.js pool

# Reporte de evolución
node apps/orchestrator/dist/super-orchestrator-bridge.js evolution
```

## Providers Disponibles

1. **ollama-qwen** - Ollama qwen2.5:7b (razonamiento)
2. **ollama-codellama** - Ollama codellama:7b (código)
3. **anthropic** - Claude API (razonamiento avanzado)
4. **deepseek** - DeepSeek API (costo-efectivo)
5. **cursor-local** - Cursor IDE local (:5001)
6. **claude-local** - Claude CLI local (:5002)
7. **opencode-local** - OpenCode local (:5004)
8. **copilot-local** - Copilot local (:5003)

## Métricas

Las métricas se almacenan en `~/.opsly/performance_metrics.json`:

```json
{
  "providers": {
    "ollama-qwen": {
      "total_requests": 150,
      "successful": 145,
      "failed": 5,
      "avg_latency_ms": 1850,
      "total_cost": 0.0
    }
  },
  "tasks": {
    "code_generation": {
      "ollama-codellama": { "count": 80, "success_rate": 0.95 }
    }
  }
}
```

## Auto-Evolución

El sistema analiza métricas y genera ideas de mejora:

1. ** tipo "model"** - Cambiar modelo con bajo éxito
2. ** tipo "threshold"** - Ajustar timeout por latencia alta
3. ** tipo "routing"** - Evitar proveedor para tarea específica

Ideas pendientes se almacenan en `~/.opsly/evolution_ideas.json`.

## Integración con Orchestrator Existente

El bridge conecta los scripts Python con el orchestrator BullMQ existente:

- Reutiliza workers en `apps/orchestrator/src/workers/`
- Conecta con LLM Gateway en `apps/llm-gateway/`
- Usa Ollama en Mac 2011 (100.80.41.29:11434)

## Estado del Proyecto

| Componente          | Estado        |
| ------------------- | ------------- |
| Configuración       | ✅ Completado |
| Provider Selector   | ✅ Completado |
| Prompt Controller   | ✅ Completado |
| Performance Tracker | ✅ Completado |
| Health Monitor      | ✅ Completado |
| Cost Optimizer      | ✅ Completado |
| Idea Generator      | ✅ Completado |
| Git Automation      | ✅ Completado |
| N8n Trigger         | ✅ Completado |
| Auto Evolution      | ✅ Completado |
| Agent Pool Manager  | ✅ Completado |
| TypeScript Bridge   | ✅ Completado |
| Documentación       | ✅ Completado |

## Próximos Pasos

1. Integrar con BullMQ jobs existentes
2. Añadir más providers al registry
3. Implementar auto-scaling de agents
4. Crear dashboard web
5. Integrar con监控系统

---

_Documento generado: 2026-05-06_
_Repo: github.com/cloudsysops/opsly_

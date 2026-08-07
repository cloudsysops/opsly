# 🔄 Estrategia de Integración — No Duplicación

**Principio:** Evolucionar lo existente, NO crear sistemas nuevos

> **Estado:** Estrategia aprobada y ejecutada. Ver
> [`reports/2026-08-07-orchestrator-visibility.md`](./reports/2026-08-07-orchestrator-visibility.md)
> para el detalle de qué se integró, qué se rechazó y los checks de
> verificación aplicados.

---

## Situación Actual

### Sistemas Existentes (Ya Producción)

| Sistema | Ubicación | Función | Uso |
|---------|-----------|---------|-----|
| **orchestrator-integration** | `lib/runtime/` | Conecta Local-First con BullMQ | Selecciona workers, fallback, retry |
| **external-agent-registry** | `lib/external-agent-registry/` | Registro de agentes externos | Routing, caching, management |
| **git-branch-orchestrator** | `lib/git-branch-orchestrator/` | Orquestación de ramas | Branch management, worker assignment |

### Nuevo Trabajo (Multi-Agent-Orchestrator)

```
lib/multi-agent-orchestrator/
├── core/orchestrator.ts          ← Nuevo (innecesario)
├── agents/                        ← Nuevo (duplica registry)
├── optimization/token-optimizer.ts
└── ...
```

**Problema:** Duplica funcionalidad de `external-agent-registry` y `orchestrator-integration`

---

## Estrategia de Evolución Segura

### Fase 1: Integrar (No Crear Nuevo)

**Opción A: Mejorar `external-agent-registry`**

```typescript
// Antes: Solo registro
external-agent-registry/
├── registry.ts (mapeo de agentes)
└── routing.ts (routing simple)

// Después: Registry inteligente
external-agent-registry/
├── registry.ts (mapeo + token optimization)
├── routing.ts (routing + cost-aware selection)
├── token-optimizer.ts (NUEVO: budgets, scoring)
└── capabilities/          (NUEVO: agent capabilities discovery)
```

**Ventajas:**
- ✅ Reutiliza infraestructura existente
- ✅ No duplica agents registry
- ✅ Una fuente única de verdad
- ✅ Ya está en producción, no risky

### Fase 2: Mejorar `orchestrator-integration`

```typescript
// Antes: Selection basic
orchestrator-integration.ts
└── selectWorker() - selecciona por budget

// Después: Selection inteligente
orchestrator-integration.ts
├── selectWorker() - mejora con token optimization
├── selectOptimalAgent() - NUEVO: cost/speed/reliability scoring
└── recordMetrics() - NUEVO: tracking de ejecución
```

**Ventajas:**
- ✅ Mejora existente sin duplicar
- ✅ Integra token-optimizer
- ✅ Mantiene interface compatible

### Fase 3: Agregar Auto-Revisión (NEW)

```typescript
lib/evolution-engine/
├── index.ts (engine de auto-revisión)
├── types.ts (tipos)
└── ...
```

Este ES nuevo, pero es **meta-sistema** que permite evolución segura.

---

## Plan de Acción: Reutilizar, No Recrear

### ❌ NO hacer esto:

```typescript
// ❌ Criar nuevo multi-agent-orchestrator
lib/multi-agent-orchestrator/
├── agents/claude-remote.ts
├── agents/cursor-local.ts
├── agents/codex.ts
└── agents/opencode.ts
```

### ✅ Hacer esto en su lugar:

**1. Registrar agentes en `external-agent-registry`**

```json
// lib/external-agent-registry/external-agents.json
{
  "agents": [
    {
      "id": "claude-remote",
      "type": "remote",
      "cost": 0.50,
      "speed": 15,
      "reliability": 0.95
    },
    {
      "id": "cursor-local",
      "type": "local",
      "cost": 0,
      "speed": 12,
      "reliability": 0.85
    }
  ]
}
```

**2. Mejorar token-optimization en `orchestrator-integration`**

```typescript
// lib/runtime/orchestrator-integration.ts
import { TokenOptimizer } from './token-optimizer';

const tokenOptimizer = new TokenOptimizer({
  monthlyBudget: 100,
  strategy: 'cost-first'
});

// Usar en selectWorker()
const worker = await selectOptimalWorker(task, tokenOptimizer);
```

**3. Dashboard en `apps/admin` (esto SÍ es nuevo)**

```
apps/admin/components/orchestrator-panel/
├── AgentStatus.tsx (NUEVO: muestra agentes)
├── TokenMetrics.tsx (NUEVO: muestra uso)
└── TaskDispatch.tsx (NUEVO: dispatch UI)
```

**4. API routes en `apps/admin/app/api/`**

```
apps/admin/app/api/orchestrator/
├── status/route.ts (NUEVO: pero pequeño)
├── dispatch/route.ts (NUEVO: pero pequeño)
└── metrics/route.ts (NUEVO: pero pequeño)
```

---

## Verificación: Evitar Duplicación

### El Evolution Engine verifica:

```typescript
const proposals = await engine.analyzeForEvolution(
  'lib/multi-agent-orchestrator',
  [
    'external-agent-registry',
    'orchestrator-integration',
    'git-branch-orchestrator'
  ]
);

// Retorna:
// ✅ "Integrar agents con external-agent-registry" - APPROVED
// ✅ "Mejorar selection en orchestrator-integration" - APPROVED
// ❌ "Crear nuevo multi-agent-orchestrator" - REJECTED (duplica)
```

---

## Cambios Propuestos vs Actuales

### Propuesto (Sin Duplicación):

```
lib/
├── external-agent-registry/ (MEJORADO)
│   ├── agents config (NEW: añade cost/speed)
│   └── token-optimizer (NEW: integrado)
├── runtime/orchestrator-integration (MEJORADO)
│   └── optimal selection (NEW: inteligente)
├── evolution-engine/ (NEW: meta-system)
│   └── auto-review (NEW: verifica cambios)
└── ... (resto sin cambios)

apps/admin/
├── components/orchestrator-panel/ (NEW: UI)
└── app/api/orchestrator/ (NEW: endpoints)
```

### Actual (CON Duplicación):

```
lib/
├── external-agent-registry/
├── orchestrator-integration/
├── multi-agent-orchestrator/ (❌ DUPLICA)
│   ├── agents/ (❌ DUPLICA registry)
│   ├── core/ (❌ DUPLICA orchestrator-integration)
│   └── optimization/
└── ...
```

---

## Próximos Pasos (Para Tú Revisar)

1. **¿Aprobás integrar con external-agent-registry en lugar de crear nuevo?**
   - Si SÍ → Procedo con refactor
   - Si NO → Explica por qué necesitamos sistema separado

2. **¿Quién revisa propuestas del Evolution Engine?**
   - Solo vos (RI review)
   - O también auto-approval para changes pequeños

3. **¿Qué cambios querés tracking especial?**
   - Solo breaking changes
   - Todas las changes
   - Solo en production

4. **¿Frecuencia de evolución?**
   - Diaria (cron)
   - Manual (on-demand)
   - Basada en eventos

---

## Beneficios de Este Enfoque

✅ **No duplicación** - Una fuente de verdad  
✅ **Más seguro** - Reutiliza código testeado  
✅ **Auto-verificable** - El engine verifica cada cambio  
✅ **Independiente pero auditable** - Tú decidís qué aprobás  
✅ **Evolución gradual** - Mejoras incrementales, no rewrites  

---

**¿Procedo con esta estrategia de integración?**

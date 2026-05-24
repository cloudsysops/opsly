---
status: draft
owner: operations
last_review: 2026-05-24
type: runbook
tags:
  - opsly/runbook
---

# Mapa de políticas de autonomía por tipo de job

**Implementación:** `apps/orchestrator/src/autonomy/policy.ts`  
**Aplicación en cola:** `apps/orchestrator/src/queue-opts.ts` (reintentos / backoff)  
**Aprobación explícita (riesgo alto):** header `x-autonomy-approved: true` en rutas internas que enriquecen el job (`apps/orchestrator/src/health-server.ts`).

## Niveles de riesgo

| Nivel | Aprobación | Intentos | Backoff base | Auto-rollback |
|-------|------------|----------|--------------|---------------|
| **low** | No | 3 | 2 s | Sí |
| **medium** | No | 2 | 5 s | Sí |
| **high** | Sí (`x-autonomy-approved`) | 1 | 10 s | No |

**Override:** si el job trae `autonomy_risk` explícito (o metadata parseable), se usa ese nivel en lugar del mapeo por tipo.

## Mapeo por `JobType`

### Riesgo bajo (`low`)

| Job type | Notas |
|----------|--------|
| `notify` | Notificaciones |
| `drive` | Sync Drive |
| `health` | Health checks |

### Riesgo medio (`medium`)

| Job type | Notas |
|----------|--------|
| `cursor` | Agente IDE remoto |
| `local_cursor` | Agente local Cursor |
| `local_claude` | Agente local Claude |
| `local_copilot` | Agente local Copilot |
| `local_opencode` | Agente local OpenCode |
| `n8n` | Webhooks automatizados |
| `research` | Investigación vía gateway |
| `ollama` | Inferencia local vía gateway |
| `defense_audit` | Auditoría defensiva |
| `cloudsysops_sales_message` | Mensaje ventas CloudSysOps |
| `cloudsysops_ops_complete` | Cierre ops CloudSysOps |
| `test_validation` | Validación npm en repo |

### Riesgo alto (`high`) — default para tipos no listados arriba

Incluye entre otros:

| Job type | Motivo típico |
|----------|----------------|
| `backup` | Mutación infra / datos |
| `evolution` | Evolución automatizada de código/config |
| `sandbox_execution` | Ejecución en sandbox |
| `jcode_execution` | Ejecución JCode |
| `hive_objective` | Objetivos multi-agente Hive |
| `intent_dispatch` | Dispatch de intents OAR |
| `agent_farm` | Granja de agentes |
| `terminal_task` | Terminal remoto |
| `super_orchestrator` | Orquestador multi-agente amplio |

## Trazabilidad

Los logs de worker pueden incluir `autonomy_risk` (ver `apps/orchestrator/src/observability/worker-log.ts`). Mantener siempre `tenant_slug` y `request_id` en jobs autónomos.

## Cambios futuros

Cualquier nuevo `JobType` en `apps/orchestrator/src/types.ts` debe:

1. Añadirse explícitamente a **low** o **medium** en `policy.ts`, **o**
2. Quedar en el default **high** por seguridad hasta revisión humana.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]

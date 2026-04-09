# ADR-014: NotebookLM Agent (EXPERIMENTAL)

**Status:** EXPERIMENTAL  
**Date:** 2026-04-09  
**Decision Maker:** Architecture Team  
**Affected Systems:** Apps/agents/notebooklm, MCP, Orchestrator  

---

## Context

NotebookLM es una herramienta de Google que permite crear notebooks interactivos con IA a partir de documentos.  
La librería `notebooklm-py` (no oficial) proporciona acceso vía API/browser automation.

**Caso de uso:** LocalRank (tenant startup) necesita convertir reportes PDF → podcast + slides + infographic automáticamente para compartir insights con stakeholders.

---

## Problem

1. **Documentos estáticos (PDF)** no son suficientes para comunicar insights complejos.
2. **Podcasts + slides** requieren producción manual (tiempo, costo).
3. NotebookLM (Google) puede generar estos artefactos automáticamente en base a contenido.
4. La API no oficial (`notebooklm-py`) es **inestable** y requiere browser automation (Playwright).

---

## Decision

✅ **Implementar NotebookLM Agent como EXPERIMENTAL:**

- **Feature flag:** `NOTEBOOKLM_ENABLED` (solo en Doppler prd, solo para Business+)
- **Scope MCP:** `agents:write` (requiere token admin)
- **Límite:** Business y Enterprise plans solo (Startup puede usar pero con warnings)
- **Ubicación:** `apps/agents/notebooklm/` (workspace con Python + TypeScript wrapper)
- **Workflow principal:** PDF reporte → notebook → podcast + slides + infographic

---

## Consequences

### ✅ Pros

1. **Automatización de contenido:** sin producción manual
2. **Reutilización:** CLI + MCP tool + Orchestrator job
3. **Escalable:** cada tenant puede generar su propio contenido
4. **Feedback rápido:** MockClient para tests (sin Google auth requerido)

### ⚠️ Riesgos

| Risk | Mitigation |
|------|-----------|
| API no oficial (Google puede romper) | Feature flag + tests con MockClient; fallback graceful |
| Browser automation (Playwright) requiere recursos | Limite a Business+; queue con BullMQ (priority baja) |
| Google auth complexity | OAuth scope `notebooklm.readwrite`; storage local (.notebooklm_storage) |
| Latencia (10-30 min por reporte) | Jobs async; notificación Discord con status |
| Contenido de baja calidad si docs malos | Validation: doc size, format, language detection |

### 📊 Metricas & Monitoreo

- `notebooklm_jobs_enqueued` (BullMQ counter)
- `notebooklm_generation_time_seconds` (histogram)
- `notebooklm_success_rate` (% completadas)
- Logs en Supabase: `platform.agent_executions` con `agent_type = 'notebooklm'`

---

## Implementation

### 1. Feature Flag

```bash
# Doppler prd
doppler secrets set NOTEBOOKLM_ENABLED true
doppler secrets set NOTEBOOKLM_STORAGE_PATH /opt/opsly/.notebooklm_storage
```

### 2. Python Client (`apps/agents/notebooklm/src/client.py`)

Ver `client.py` para API:
- `create_notebook(name, description)`
- `add_source(notebook_id, source_type='url'|'text'|'file')`
- `generate_audio(notebook_id, style, speakers)`
- `generate_slide_deck(notebook_id)`
- `chat.ask(question)`
- `wait_for_completion(notebook_id, task_id, timeout)`

### 3. TypeScript Wrapper (`apps/agents/notebooklm/src/index.ts`)

```typescript
import { spawnSync } from 'child_process';

export async function notebookLMCommand(cmd: object): Promise<any> {
  const result = spawnSync('python3', [
    './src/client.py',
    JSON.stringify(cmd),
  ], { encoding: 'utf-8' });
  
  if (result.error) throw result.error;
  return JSON.parse(result.stdout);
}
```

### 4. MCP Tool Registration

**File:** `apps/mcp/src/server.ts`

```typescript
server.tool('notebooklm', {
  scope: 'agents:write',
  handler: async (args: Record<string, any>) => {
    const { notebookLMCommand } = await import('@intcloudsysops/notebooklm-agent');
    return notebookLMCommand(args);
  }
});
```

### 5. Orchestrator Job

**File:** `apps/orchestrator/src/workers/notebooklm-worker.ts`

```typescript
export async function processNotebookLMJob(job: Job<NotebookLMJobData>) {
  if (!process.env.NOTEBOOKLM_ENABLED) {
    throw new Error('NotebookLM disabled');
  }
  const cmd = job.data.command;
  const result = await notebookLMCommand(cmd);
  await logUsage({
    tenant_id: job.data.tenant_id,
    agent_type: 'notebooklm',
    action: cmd.action,
    duration_ms: job.progress()?.elapsed || 0,
  });
  return result;
}
```

---

## Rollout Plan

### Phase 1: Soft Launch (Business only)
- Feature flag en `prd` (admin puede habilitar)
- Tests + MockClient verde
- LocalRank (startup) piloto con warnings

### Phase 2: General Availability
- Documentación completa en LOCALRANK-TESTER-GUIDE.md
- Runbooks para troubleshooting
- Discord alerts para fallos

### Phase 3: Optimization
- Caching de artifacts en S3/Supabase
- Smart scheduling (evitar picos)
- Cost tracking por tenant

---

## Testing

### Unit Tests
```bash
npm run test --workspace=@intcloudsysops/orchestrator
# Should include notebooklm-worker.test.ts
```

### E2E (Manual)
```bash
NOTEBOOKLM_ENABLED=true \
  ./scripts/test-notebooklm.sh \
  --pdf /tmp/report.pdf \
  --tenant localrank \
  --dry-run
```

---

## Fallback & Rollback

- **Disabled:** Set `NOTEBOOKLM_ENABLED=false` en Doppler
- **Graceful:** Jobs fallback a "notebook creation skipped"
- **Revert:** Git checkout antes del commit que añadió este ADR

---

## References

- [notebooklm-py Docs](https://github.com/teng-lin/notebooklm-py)
- [ADR-009 MCP Architecture](./ADR-009-openclaw-mcp-architecture.md)
- [ADR-011 Orchestrator](./ADR-011-orchestrator-batchprocessing.md)
- LocalRank Tester Guide: `docs/LOCALRANK-TESTER-GUIDE.md`

- Paquete workspace: `@intcloudsysops/notebooklm-agent`.
- Scope MCP nuevo: `agents:write` (OAuth `claude-ai` y metadata well-known).
- Coste marginal: uso de la cuenta Google del tenant/instancia.

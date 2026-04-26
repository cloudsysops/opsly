# Plan: NotebookLM como Knowledge Layer Universal — 2026-04-14

**ADR:** `docs/adr/ADR-025-notebooklm-knowledge-layer.md`
**Objetivo:** Que todos los agentes IA inicien con contexto completo consultando NotebookLM.

---

## Objetivo

1. **Feed automático** — AGENTS.md, system_state.json, ADRs, decisiones → NotebookLM tras cada commit.
2. **Consulta obligatoria** — Cada agente pregunta a NotebookLM al iniciar.
3. **Routing inteligente** — LLM Gateway consulta NotebookLM para contexto cuando detecta keywords operativas.
4. **Fallback seguro** — Si NotebookLM falla, agente lee AGENTS.md directamente.

---

## FASE 1: Configurar NotebookLM (30 min)

### 1.1 Variables en Doppler prd

```bash
# NotebookLM principal (crear notebook en notebooklm.google.com)
doppler secrets set NOTEBOOKLM_NOTEBOOK_ID=<tu-notebook-id> \
  --project ops-intcloudsysops --config prd

doppler secrets set NOTEBOOKLM_SYNC_ON_COMMIT=true \
  --project ops-intcloudsysops --config prd
```

### 1.2 Crear notebook de conocimiento

1. Ir a https://notebooklm.google.com
2. Crear notebook: **"Opsly — Conocimiento Universal"**
3. Copiar Notebook ID de la URL
4. Guardar en Doppler

---

## FASE 2: Scripts de sync (1h)

### 2.1 Script: `scripts/state-to-notebooklm.mjs`

```javascript
// Convierte system_state.json a markdown legible y sube a NotebookLM
import { readFileSync } from 'node:fs';
import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

const state = JSON.parse(readFileSync('context/system_state.json', 'utf8'));
const markdown = `# System State — ${new Date().toISOString().split('T')[0]}

## Fase actual
- Fase: ${state.fase}
- VPS: ${state.vps.status}
- Doppler: ${state.doppler.status}

## Decisiones recientes
${state.decisions?.map((d) => `- ${d}`).join('\n') || 'Sin decisiones registradas'}

## Bloqueantes
${state.bloqueantes?.map((b) => `- ${b}`).join('\n') || 'Sin bloqueantes'}

## Próximo paso
${state.next_action}
`;

await executeNotebookLM({
  action: 'add_source',
  tenant_slug: 'platform',
  notebook_id: process.env.NOTEBOOKLM_NOTEBOOK_ID,
  source_type: 'text',
  title: 'system_state.md',
  text: markdown,
});
```

### 2.2 Script: `scripts/llm-stats-to-notebooklm.mjs`

```javascript
// Sube resumen de costos/routing LLM de los últimos 7 días
import { readFileSync } from 'node:fs';
import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

const usage = JSON.parse(readFileSync('context/llm-usage-7d.json', 'utf8') || '{}');
const markdown = `# LLM Usage — Últimos 7 días

## Costos por provider
${Object.entries(usage.cost_by_provider || {})
  .map(([p, c]) => `- ${p}: $${c}`)
  .join('\n')}

## Routing stats
- Requests total: ${usage.total_requests}
- Cache hit rate: ${(usage.cache_hit_rate * 100).toFixed(1)}%
- Ollama local: ${usage.llama_local_calls} ($${usage.llama_local_cost})

## Top tenants
${(usage.top_tenants || []).map((t) => `- ${t.slug}: $${t.cost}`).join('\n')}
`;

await executeNotebookLM({
  action: 'add_source',
  tenant_slug: 'platform',
  notebook_id: process.env.NOTEBOOKLM_NOTEBOOK_ID,
  source_type: 'text',
  title: 'llm-usage-7d.md',
  text: markdown,
});
```

### 2.3 Actualizar hook post-commit

```bash
# .githooks/post-commit — añadir tras sync contexto existente
if [ -n "$NOTEBOOKLM_SYNC_ON_COMMIT" ] && [ "$NOTEBOOKLM_SYNC_ON_COMMIT" = "true" ]; then
  npm run notebooklm:sync 2>/dev/null || true
fi
```

---

## FASE 3: Prompts de startup (30 min)

### 3.1 Prompt universal para todos los agentes

```
=== CONTEXTO OPSLY (consultar NotebookLM) ===
Tu rol: Arquitecto senior de Opsly (multi-tenant SaaS).
Repo: cloudsysops/opsly
URL raw: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md

Al iniciar:
1. Consultar NotebookLM: "Estado operativo actual de Opsly — qué se decidió, qué bloquea, qué prioritario"
2. Leer AGENTS.md (sección 🔄 Estado actual)
3. Verificar si hay ADR relevante en docs/adr/

NUNCA:
- Hardcodear secretos
- Usar any en TypeScript
- SSH sin Tailscale (100.120.151.91)
- Llamadas LLM fuera de llm-gateway

Stack: Next.js 15 · TS · Supabase · Stripe · Docker Compose · Traefik v3 · Redis/BullMQ · Doppler
```

### 3.2 Actualizar skills

```bash
# skills/user/opsly-context/SKILL.md — añadir:
notebooklm_query_on_startup: "Estado operativo actual de Opsly"
notebooklm_fallback: AGENTS.md → VISION.md → docs/adr/
```

---

## FASE 4: Routing LLM Gateway (30 min)

### 4.1 Enhancement en `apps/llm-gateway/src/routing-hints.ts`

```typescript
import { getNotebookLMContext } from './notebooklm-routing.js';

export function buildPromptContext(routingHint: RoutingHint): string {
  const base = `Routing: ${routingHint.preference} | Model: ${routingHint.model}`;

  const nlContext = getNotebookLMContext(routingHint.query);
  if (nlContext) {
    return `${base}\n\n[NotebookLM] ${nlContext}`;
  }

  return base;
}
```

### 4.2 Nueva función `apps/llm-gateway/src/notebooklm-routing.ts`

```typescript
import { NotebookLMClient } from '../../orchestrator/src/lib/notebooklm-client.js';

const nlClient = new NotebookLMClient();

export function getNotebookLMContext(query: string): string | undefined {
  const keywords = [
    'bloqueante',
    'bloqueado',
    'bloqueo',
    'prioridad',
    'prioritario',
    'estado actual',
    'qué hacer',
    'next',
    'siguiente paso',
    'bloqueos',
    'blocked',
    'qué priorizar',
    'decisión',
    'decidir',
  ];

  if (keywords.some((k) => query.toLowerCase().includes(k))) {
    // Síncrono: devuelve hint para enriquecer prompt
    // No bloquea routing — fallback es contexto vacío
    return '[NotebookLM: consultar estado operativo para contexto]';
  }

  return undefined;
}
```

---

## FASE 5: Validación (15 min)

```bash
# 1. Type-check
npm run type-check

# 2. Tests
npm run test --workspace=@intcloudsysops/llm-gateway
npm run test --workspace=@intcloudsysops/orchestrator

# 3. Sync manual
NOTEBOOKLM_NOTEBOOK_ID=<id> npm run notebooklm:sync

# 4. Test query
node scripts/query-notebooklm.mjs "¿Cuál es el estado actual de Opsly?"
```

---

## Rollback

```bash
# Desactivar sync automático
doppler secrets set NOTEBOOKLM_SYNC_ON_COMMIT=false \
  --project ops-intcloudsysops --config prd

# Desactivar completamente
doppler secrets set NOTEBOOKLM_ENABLED=false \
  --project ops-intcloudsysops --config prd
```

---

## Tiempo total estimado: 3h

- FASE 1 (config): 30 min
- FASE 2 (scripts): 1h
- FASE 3 (prompts): 30 min
- FASE 4 (routing): 30 min
- FASE 5 (validación): 15 min
- Buffer: 15 min

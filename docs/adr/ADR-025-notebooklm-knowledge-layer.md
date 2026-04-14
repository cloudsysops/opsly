# ADR-025: NotebookLM como Knowledge Layer Universal para Agentes IA

**Status:** PROPUESTO
**Date:** 2026-04-14
**Decision Maker:** Architecture Team
**Affected Systems:** OpenClaw, Orchestrator, Context Builder, todos los agentes IA

---

## Contexto

El sistema Opsly opera con múltiples agentes IA (Claude, Cursor, Copilot, OpenCode, Hermes) que necesitan contexto compartido para ser eficientes e inteligentes. Actualmente:

- **AGENTS.md** funciona como estado operativo pero requiere lectura manual.
- **VISION.md** es el norte pero no se actualiza automáticamente.
- **ADRs** documentan decisiones pero no se consultan activamente.
- **NotebookLM** existe como herramienta EXPERIMENTAL (ADR-014) para generar podcasts/slides.

**Problema:** Cada agente inicia "ciego" — no sabe qué decidieron los anteriores, qué está bloqueado, qué optimizece están en curso.

---

## Decisión

**Establecer NotebookLM como knowledge layer universal:**

1. **NotebookLM = hub de conocimiento central** — Todo documento del proyecto se sincroniza.
2. **Feed automático post-commit** — AGENTS.md, system_state.json, ADRs, decisiones → NotebookLM.
3. **Consulta obligatoria al inicio** — Cada agente consulta NotebookLM antes de actuar.
4. **Knowledge pipeline** — Feeding de outputs de agentes, métricas de salud, logs estructurados.
5. **Routing inteligente** — NotebookLM responde "¿qué prioritario ahora?" antes de planificar.

---

## Arquitectura del Knowledge Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  Knowledge Sources (Feed ──► NotebookLM)                       │
│                                                               │
│  AGENTS.md          ──► notebooklm add_source                 │
│  VISION.md          ──► notebooklm add_source                 │
│  ROADMAP.md         ──► notebooklm add_source                 │
│  docs/adr/*.md      ──► notebooklm add_source                 │
│  system_state.json  ──► notebooklm add_source (markdown)      │
│  orchestrator logs  ──► notebooklm add_source (errors/wins)   │
│  llm-gateway logs   ──► notebooklm add_source (cost/routing)  │
└──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│  NotebookLM (Google)                                          │
│  - Indexación semántica de todo el conocimiento               │
│  - Consultas en lenguaje natural                              │
│  - Cached 5 min por query                                     │
│  - Fallback: contexto local si falla                          │
└──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│  Agentes IA (Consume ◄── NotebookLM answers)                 │
│                                                               │
│  OpenCode      ──► "Estado actual del sprint?" ──► respuesta │
│  Claude        ──► "¿Qué bloqueantes hay?"   ──► respuesta  │
│  Cursor        ──► "¿Qué ADR aplica a X?"    ──► respuesta  │
│  Hermes        ──► "¿Cuánto gastamos hoy?"    ──► respuesta │
│  Nuevo agente  ──► "Dame contexto del proyecto" ──► resumen   │
└──────────────────────────────────────────────────────────────┘
```

---

## Sincronización (Feed)

### Trigger: post-commit hook

```bash
# .githooks/post-commit
if [ -n "$(git diff --name-only HEAD~1)" ]; then
  npm run notebooklm:sync  # docs + ADRs + AGENTS
fi
```

### Script: `npm run notebooklm:sync`

```bash
# Ejecuta en orden:
1. npm run docs:to-notebooklm   # AGENTS.md, VISION.md, ADRs
2. node scripts/state-to-notebooklm.mjs  # system_state.json → markdown
3. node scripts/llm-stats-to-notebooklm.mjs  # últimos 7 días costos/routing
```

### Query startup obligatorio

Cada agente inicia con:

```
"Eres el arquitecto senior de Opsly. Resume en 5 bullets:
1. Qué se decidió hoy
2. Qué está bloqueado
3. Qué es prioritario
4. Qué optimizar
5. Qué NO hacer

Basado en: AGENTS.md, ROADMAP.md, y las últimas decisiones en docs/adr/"
```

---

## Variables requerida

| Variable | Valor |
|----------|-------|
| `NOTEBOOKLM_ENABLED` | `true` |
| `NOTEBOOKLM_NOTEBOOK_ID` | ID del notebook principal |
| `NOTEBOOKLM_DEFAULT_TENANT_SLUG` | `platform` |
| `NOTEBOOKLM_SYNC_ON_COMMIT` | `true` (default) |

---

## Routing bias mejorado con NotebookLM

```typescript
// apps/llm-gateway/src/routing-hints.ts
export function getNotebookLMContext(query: string): string | undefined {
  // Si la query menciona "bloqueante", "prioridad", "decisión"
  // → consultar NotebookLM para contexto
  const keywords = ["bloqueante", "bloqueado", "prioridad", "qué hacer", "state"];
  if (keywords.some(k => query.toLowerCase().includes(k))) {
    return "[Consultar NotebookLM: estado operativo actual]";
  }
}
```

---

## Checklist de implementación

- [x] `NOTEBOOKLM_NOTEBOOK_ID` en Doppler prd
- [x] Hook post-commit actualizado (`notebooklm:sync`)
- [x] `scripts/state-to-notebooklm.mjs` creado
- [x] `scripts/llm-stats-to-notebooklm.mjs` creado
- [x] Skill `opsly-context` actualizado (consulta NotebookLM al inicio)
- [x] `.claude/CLAUDE.md` incluye prompt de startup NotebookLM
- [x] `.cursor/rules/opsly.mdc` incluye checkpoint NotebookLM
- [ ] Tests: `npm run test --workspace=@intcloudsysops/orchestrator`
- [ ] Validación: `npm run type-check`

---

## Consecuencias

**Positivo:**
- Agentes más inteligentes desde el primer segundo
- Contexto compartido sin duplicar estado
- Decisiones propagan automáticamente a todos los agentes
- Reducción de trabajo redundante entre agentes

**Negativo:**
- Dependencia de NotebookLM (API no oficial — fallback a contexto local)
- Latencia adicional al inicio de sesión (~2-5s por consulta)
- Storage de credenciales Google (OAuth o SA)

**Mitigaciones:**
- Feature flag `NOTEBOOKLM_ENABLED`
- Cache 5 min local
- Fallback: leer AGENTS.md directamente si NotebookLM falla

---

## Referencias

- `apps/orchestrator/src/lib/notebooklm-client.ts`
- `scripts/docs-to-notebooklm.mjs`
- `docs/adr/ADR-014-notebooklm-agent.md`
- `docs/adr/ADR-024-ollama-local-worker-primary.md`
- `docs/AGENTS-GLOBAL-CONTEXT.md`

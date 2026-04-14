# ADR-024: Ollama Local como Provider Primary en Worker Remoto

## Estado: PROPUESTO | Fecha: 2026-04-14

## Contexto

- El VPS tiene CPU limitado (load 31.72 reportado); ejecutar Ollama local en el VPS consume recursos.
- Ya existe `OllamaWorker` en `apps/orchestrator/src/workers/OllamaWorker.ts` que llama a `/v1/text` del LLM Gateway.
- El Mac 2011 (`opslyquantum`) tiene más CPU/RAM disponible y puede correr Ollama + orchestrator worker.
- ADR-020 ya soporta separación `control` (VPS) / `worker` (remoto) con `OPSLY_ORCHESTRATOR_MODE=worker-enabled`.
- LLM Gateway ya tiene `llama_local` en `providers.ts` con `OLLAMA_URL` configurable.

## Decisión

1. **Ollama corre en el worker Mac 2011** (`opslyquantum`), accesible por red al LLM Gateway.
2. **VPS = control plane** (`OPSLY_ORCHESTRATOR_MODE=queue-only`): TeamManager + API del orchestrator, sin Ollama ni workers BullMQ.
3. **Worker Mac 2011 = worker plane** (`OPSLY_ORCHESTRATOR_MODE=worker-enabled`): Ollama + BullMQ workers (cursor, n8n, drive, ollama).
4. **LLM Gateway en VPS**: routing centralizado; `OLLAMA_URL` apunta a `http://<ip-worker>:11434`.
5. **Routing bias por defecto**: `cheap` → `llama_local` primary (costo $0), fallback a cloud (haiku → openrouter → gpt4o_mini).
6. **Redis compartido**: mismo `REDIS_URL` (VPS) para BullMQ, cache LLM Gateway y health daemon.

## Topología

```
┌─────────────────────────────────────────────────────────────┐
│  VPS (control plane)                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ API :3000   │  │llm-gateway   │  │orchestrator    │    │
│  │             │  │   :3010      │  │queue-only      │    │
│  └─────────────┘  └──────┬───────┘  └───────┬────────┘    │
│                          │                   │              │
│  ┌───────────────────────┴───────────────────┴──────────┐  │
│  │ Redis (BullMQ + cache + health)                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ OLLAMA_URL                   │ REDIS_URL
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Mac 2011 (worker plane) — opslyquantum                     │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │ Ollama      │  │ orchestrator (worker-enabled)        │  │
│  │ :11434      │  │ BullMQ workers: cursor, n8n, ollama│  │
│  └─────────────┘  └─────────────────────────────────────┘  │
│  Docker compose: ollama, redis (local), postgres            │
└─────────────────────────────────────────────────────────────┘
```

## Variables requeridas

| Variable | Dónde | Valor ejemplo |
|----------|-------|---------------|
| `OLLAMA_URL` | LLM Gateway (VPS) + Doppler prd | `http://100.80.41.29:11434` |
| `OLLAMA_MODEL` | Doppler prd | `llama3.2` o `qwen2.5-coder` |
| `REDIS_URL` | Worker Mac 2011 | `redis://100.120.151.91:6379` |
| `LLM_GATEWAY_URL` | Worker Mac 2011 | `http://100.120.151.91:3010` |
| `OPSLY_ORCHESTRATOR_MODE` | Worker Mac 2011 | `worker-enabled` |

## Routing en LLM Gateway

```typescript
// apps/llm-gateway/src/providers.ts
export function resolveRoutingPreference(explicitModel, complexityLevel): RoutingPreference {
  // Por defecto: cheap = llama_local primary
  if (complexityLevel === 1) return "cheap";
  if (complexityLevel === 3) return "sonnet";
  return "haiku";
}
```

## Consecuencias

**Positivo:**
- Costo $0 en tokens para tareas simples (routing `cheap` → `llama_local`)
- VPS alivia CPU (sin Ollama, sin workers BullMQ)
- Worker Mac 2011 usa hardware ocioso

**Negativo:**
- Latencia Ollama por red si worker y VPS en diferentes geografías
- Worker Mac 2011 depende de energía/conectividad
- Modelo local limitado a lo que corre Ollama (sin function calling advanced)

## Checklist de implementación

- [ ] Variables Ollama en Doppler prd (`OLLAMA_URL`, `OLLAMA_MODEL`)
- [ ] Worker Mac 2011: Ollama corriendo (`docker ps` o `pgrep ollama`)
- [ ] Worker Mac 2011: orchestrator en modo `worker-enabled`
- [ ] VPS LLM Gateway: `OLLAMA_URL` apunta a IP del worker
- [ ] Health daemon: `llama_local` responde OK
- [ ] Test: `POST /api/admin/ollama-demo` → job ollama ejecuta
- [ ] Validación: `npm run type-check` + tests workspace

## Referencias

- `apps/orchestrator/src/orchestrator-role.ts`
- `apps/orchestrator/src/workers/OllamaWorker.ts`
- `apps/llm-gateway/src/providers.ts`
- `apps/llm-gateway/src/health-daemon.ts`
- `docs/WORKER-SETUP-MAC2011.md`
- `docs/adr/ADR-020-orchestrator-worker-separation.md`
- `docs/adr/ADR-010-llm-gateway.md`

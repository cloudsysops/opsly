# ADR-024: Ollama Local como Provider Primary en Worker Remoto

## Estado: ACEPTADO | Fecha: 2026-04-14

## Contexto

- El VPS tiene CPU limitado (load 31.72 reportado); ejecutar Ollama local en el VPS consume recursos.
- Ya existe `OllamaWorker` en `apps/orchestrator/src/workers/OllamaWorker.ts` que llama a `/v1/text` del LLM Gateway.
- El Mac 2011 (`opslyquantum`, peer actual `opsly-mac2011`) tiene más CPU/RAM disponible y puede correr Ollama + orchestrator worker.
- ADR-020 ya soporta separación `control` (VPS) / `worker` (remoto) con `OPSLY_ORCHESTRATOR_MODE=worker-enabled`.
- LLM Gateway ya tiene `llama_local` en `providers.ts` con `OLLAMA_URL` configurable.

## Decisión

1. **Ollama corre en el worker Mac 2011** (`opslyquantum` / `opsly-mac2011`), accesible por red al LLM Gateway.
2. **VPS = control plane** (`OPSLY_ORCHESTRATOR_MODE=queue-only`): TeamManager + API del orchestrator, sin Ollama ni workers BullMQ.
3. **Worker Mac 2011 = worker plane** (`OPSLY_ORCHESTRATOR_MODE=worker-enabled`): Ollama + BullMQ workers (cursor, n8n, drive, ollama).
4. **LLM Gateway en VPS**: routing centralizado; `OLLAMA_URL` apunta a `http://<ip-worker>:11434`.
5. **Routing bias por defecto**: `cheap` → `llama_local` primary (costo $0), fallback a cloud (haiku → openrouter → gpt4o_mini).
6. **Redis compartido**: mismo `REDIS_URL` (VPS) para BullMQ, cache LLM Gateway y health daemon.
7. **Exposición remota solo por Tailscale**: `REDIS_EXPORT_BIND` y `LLM_GATEWAY_EXPORT_BIND` deben apuntar a la IP Tailscale del VPS, nunca a `0.0.0.0`.

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
│  Mac 2011 (worker plane) — opslyquantum / opsly-mac2011    │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │ Ollama      │  │ orchestrator (worker-enabled)        │  │
│  │ :11434      │  │ BullMQ workers: cursor, n8n, ollama│  │
│  └─────────────┘  └─────────────────────────────────────┘  │
│  Docker compose: ollama + worker services; sin Redis local  │
└─────────────────────────────────────────────────────────────┘
```

## Variables requeridas

| Variable | Dónde | Valor ejemplo |
|----------|-------|---------------|
| `OLLAMA_URL` | LLM Gateway (VPS) + Doppler prd | `http://<tailscale-worker-ip>:11434` |
| `OLLAMA_MODEL` | Doppler prd | `nemotron-3-nano:4b` (default código), o `nemotron-3-nano:30b` / `qwen2.5-coder` según RAM |
| `REDIS_EXPORT_BIND` | VPS + Doppler prd | `100.120.151.91` |
| `LLM_GATEWAY_EXPORT_BIND` | VPS + Doppler prd | `100.120.151.91` |
| `REDIS_URL` | Worker Mac 2011 | `redis://:PASSWORD@<tailscale-vps-ip>:6379/0` |
| `LLM_GATEWAY_URL` | Worker Mac 2011 | `http://<tailscale-vps-ip>:3010` |
| `OPSLY_ORCHESTRATOR_MODE` | Worker Mac 2011 | `worker-enabled` |

## Capacidad inicial recomendada

- `ORCHESTRATOR_OLLAMA_CONCURRENCY=1`
- `ORCHESTRATOR_CURSOR_CONCURRENCY=1`
- `ORCHESTRATOR_N8N_CONCURRENCY=1`
- `ORCHESTRATOR_DRIVE_CONCURRENCY=1`
- `ORCHESTRATOR_NOTIFY_CONCURRENCY=2`

Subir concurrencia solo cuando CPU sostenida, cola `waiting` y latencia del gateway indiquen margen real.

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
- Hay dos puntos remotos que deben seguir vivos para el camino local (`REDIS_URL` y `LLM_GATEWAY_URL` sobre Tailscale)

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

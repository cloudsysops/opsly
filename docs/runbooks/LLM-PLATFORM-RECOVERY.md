# Runbook: recuperar capa LLM y nodos (Opsly)

Objetivo: volver a tener **Ollama local** (si aplica), **Redis**, **LLM Gateway** y **Orchestrator** en verde, sin exponer secretos en logs.

## Orden recomendado

1. **Redis (VPS)** — Sin cola sana, el gateway y el orchestrator degradan. Desde el host con acceso al repo: `docker compose` del stack plataforma con `--env-file` correcto; comprobar contenedor `redis` / URL en Doppler `REDIS_URL`.
2. **LLM Gateway** — `GET /health` (o ruta documentada del servicio). Si falla: revisar variables en Doppler (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, opcionales `OPENROUTER_API_KEY`, `DEEPSEEK_*`, `NVIDIA_*`, `OLLAMA_URL`) y recrear el contenedor tras `pull` de imagen.
3. **Ollama en worker** — Tailscale al nodo Mac/worker; `curl -sf http://127.0.0.1:11434/api/tags`. Arranque: `npm run opsly:ensure-ollama -- --ensure` o compose `opslyquantum` según `docs/WORKER-SETUP-MAC2011.md`.
4. **Orchestrator** — Modo `queue-only` en VPS vs `worker-enabled` en worker; misma `REDIS_URL`. Health `/health` con `role`/`mode` esperados (`docs/ARCHITECTURE-DISTRIBUTED.md`, ADR-020).
5. **Traefik / DNS** — Si el gateway responde en LAN pero no en público, revisar routers y certificados (no tocar desde agente sin revisión humana en prod).

## Cadena económica (referencia)

Orden cloud tras local: ver `docs/00-architecture/LLM-GATEWAY.md`. Prioriza **OpenRouter cheap** → **DeepSeek** → **NVIDIA** (si hay claves) → Haiku → GPT-4o mini en `routing_bias=cost`.

## Verificación rápida (sin volcar secretos)

```bash
# Local: tests del gateway
npm run test --workspace=@intcloudsysops/llm-gateway
```

Contra staging: `curl -sfk "https://api.<PLATFORM_DOMAIN>/api/health"` (ajustar dominio desde configuración aprobada).

## SSH

Solo por política del proyecto (p. ej. Tailscale al VPS); no pegar tokens ni API keys en tickets ni chat.

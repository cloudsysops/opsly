---
status: draft
owner: operations
last_review: 2026-05-24
type: infrastructure
tags:
  - opsly/infrastructure
---

# OpenClaw CLI en el VPS — meta-orquestación + tmux

Objetivo: tener en el **VPS** el **cliente OpenClaw** (`openclaw` 2026.x, Node ≥ 22.12) como **capa de orquestación humana/canales** que coordina **otros agentes** (pool HTTP local en Mac, workers, o MCP/Opsly), **sin** sustituir el control plane Docker existente (**MCP 3003 + orchestrator 3011 + LLM gateway 3010**).

## Separación de responsabilidades

| Pieza | Dónde | Rol |
| ----- | ----- | --- |
| **Opsly Docker** (`docker-compose.platform.yml`) | VPS | **Verdad operativa**: colas BullMQ, workers, MCP, API, tenants. |
| **CLI `openclaw gateway`** | VPS (proceso fuera de Compose **o** contenedor dedicado si lo empaquetáis) | **Sesiones WebSocket**, TUI, canales, `openclaw agent` — “operador unificado” que puede llamar a tools/API que a su vez encolan en Opsly. |
| **Agentes CLIs** (Codex, pool `localhost:5001+`) | Mac operador / worker | **Ejecución** pesada; el gateway en VPS les habla por **Tailscale + HTTP** con token, no por shell compartido inseguro. |

No dupliquéis **dos** orquestadores BullMQ compitiendo: el **orchestrator** sigue siendo el que **encola jobs**; el **OpenClaw gateway** es la **UI/capa de conversación** que puede disparar esos jobs vía MCP, API interna o scripts acotados.

## Requisitos en el VPS

1. **Node.js ≥ 22.12** (`nvm`, `brew install node@22`, o imagen CI con Node 22).
2. **CLI instalado** (ejemplo global):
   ```bash
   npm install -g openclaw@latest
   openclaw --version
   ```
3. **Docker Compose v2** ya operativo (MCP/orchestrator).
4. **Red**: el gateway **no** debe publicarse en `0.0.0.0:443` sin auth. Preferir **solo Tailscale** o **127.0.0.1 + SSH tunnel**; ver `docs/03-agents/AGENT-GUARDRAILS.md`.

## Patrón recomendado: tmux “hub”

Una sesión persistente con ventanas claras (operador hace `attach` por SSH solo Tailscale):

| Ventana (nombre) | Comando típico |
| ---------------- | -------------- |
| `gateway` | `openclaw gateway` (o `openclaw --dev gateway` en laboratorio) |
| `health` | `watch -n 30 'curl -sf http://127.0.0.1:3011/health && curl -sf http://127.0.0.1:3003/health'` |
| `logs-orch` | `docker logs -f infra-orchestrator-1` (ajustar nombre real) |
| `agents-mac` | **Opcional**: túnel o documentación para pool HTTP en Mac (`OPSLY_*_AGENT_URL` vía Tailscale). |

Creación idempotente (desde el repo en el VPS):

```bash
./scripts/openclaw-vps-tmux-hub.sh --apply
tmux attach -t openclaw-hub
```

`--dry-run` solo imprime los comandos.

## “Adaptador tmux”

En este documento el adaptador es **convención + script**: tmux ofrece **procesos aislados por ventana** (un agente colgado no tumba el gateway), **reattach** tras SSH cortado y **nombres** (`gateway`, `health`, …). No es un PTY genérico expuesto al portal multi-tenant.

Si más adelante necesitáis **lanzar** sub-agentes por ventana (p. ej. `ssh mac 'npm run opsly:local-codex-service'`):

- Hacedlo solo en **hosts de confianza** y con **token** en `POST /execute`.
- Preferid **systemd** en el Mac/worker para servicios HTTP estables y tmux solo en el VPS para el **hub OpenClaw + supervisión**.

## Variables útiles (orientativas)

Definir en el entorno del usuario que lanza el gateway (Doppler en VPS o `.env` local del operador), según cómo conectéis OpenClaw con Opsly:

- URLs internas Docker: `http://127.0.0.1:3010`, `http://127.0.0.1:3011`, `http://127.0.0.1:3003` (desde el **host** del VPS; dentro de otra red Docker pueden cambiar los hostnames).
- Pool remoto de agentes: `OPSLY_CODEX_AGENT_URL=http://100.x.x.x:5005` (Tailscale del Mac operador), etc.

Los nombres exactos dependen de vuestro `openclaw configure` / `openclaw config`; consultad `openclaw docs` y la guía upstream.

## Checklist de seguridad (mínimo)

- [ ] Gateway **no** expuesto a Internet sin TLS + auth.
- [ ] SSH administrativo solo **Tailscale** (política Opsly).
- [ ] `POST /execute` de agentes HTTP con **Bearer** y allowlist de env (ver `docs/01-development/HEAVY-SERVICES-DECISION.md`).
- [ ] **No** commitear claves; Doppler `prd` / scope acotado en el VPS.

## Referencias

- `docs/01-development/OPENCLAW-TERMINOLOGY.md` — OpenClaw CLI vs Orquestador Opsly.
- `docs/01-development/.openclaw.md` — Node 22 y stack Opsly.
- `docs/00-architecture/OPENCLAW-ARCHITECTURE.md` — flujo MCP → Orquestador Opsly.
- `docs/runbooks/OPSLY-OPENCLAW-STARTUP.md` — arranque y health.
- `scripts/openclaw-vps-tmux-hub.sh` — sesión tmux `openclaw-hub`.

---

## Enlaces relacionados

- [[04-infrastructure/README|04-infrastructure]]
- [[brain/README|Brain Central]]

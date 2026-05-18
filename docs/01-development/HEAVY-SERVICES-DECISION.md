# Decisión: servicios pesados en el VPS (48 GB)

## Contexto

El disco raíz es **48 GB**. Con **Ollama (~9–10 GB imagen)**, **OpenClaw (~4–5 GB)**, varias instancias **n8n/Uptime**, stack **Grafana/Prometheus** y las imágenes **Opsly**, el margen es bajo. Tras un **`docker image prune -a`**, el objetivo operativo es mantener **uso &lt;90 %** y **varios GB libres** para pulls y logs.

## Principio

- **VPS:** control plane, tenants (n8n/uptime), Traefik, Redis, API/orchestrator según despliegue.
- **Modelos LLM locales y cargas experimentales:** preferir **otro nodo** (Mac dedicada, otra VM, proveedor) si el disco o la RAM aprietan.

## Opciones (sin comprometer el producto)

| Opción                        | Descripción                                                                                              | Pros                                     | Contras                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| **A — Desacoplar Ollama**     | Ejecutar Ollama solo donde haga falta inferencia local; no en el mismo disco que producción multi-tenant | Libera la imagen más pesada si no se usa | Hay que apuntar clientes/workers al nuevo host |
| **B — OpenClaw en otro host** | Mover el contenedor OpenClaw a máquina con más espacio (p. ej. Mac 2011 en LAN/Tailscale)                | Reduce GB en VPS                         | Latencia y firewall; un nodo más que vigilar   |
| **C — VM / cloud dedicada**   | Stack “AI/labs” en GCP/AWS/DO separado                                                                   | Aislamiento y escalado                   | Coste y operación                              |
| **D — Ampliar volumen**       | Aumentar disco en DigitalOcean                                                                           | Menos reingeniería                       | Coste mensual                                  |

## Recomendación práctica

1. **Mantener en VPS** lo que el cliente paga (rutas HTTPS, n8n, Uptime, API, Redis, Traefik, imágenes Opsly desplegadas).
2. **No acumular** imágenes duplicadas: una tag **n8n** estable por entorno; `docker image prune -a` periódico (ya automatizado en `scripts/vps-cleanup-robust.sh`).
3. Si **Ollama/OpenClaw** son solo pruebas: **parar stack**, `docker compose down`, luego `docker rmi` de esas imágenes **solo** cuando el negocio confirme que no se usan en ese host.
4. Si el disco vuelve a **&gt;90 %** tras podas: **ampliar volumen** o mover cargas pesadas (tabla arriba).

## Plan de migración (cuando se decida mover un servicio)

1. Ventana de mantenimiento y aviso a stakeholders.
2. Exportar volúmenes/config necesarios (`docker inspect`, backups de volumen).
3. Levantar en el nuevo host con la misma versión de imagen.
4. Validar conectividad (Tailscale, firewall, DNS interno).
5. En el VPS: `docker compose down`, `docker rmi`, comprobar `df` y `docker system df`.

## Agentes locales (CLI) y puente HTTP — no saturar el VPS

Los servicios que exponen **`GET /health`** + **`POST /execute`** para Codex, Claude, Copilot, OpenCode, Cursor, Hermes, bridges OpenAI/Decepticon, **Aider**, **Goose** y **Playwright** viven en **máquina operador** (Mac + Colima para Redis/Ollama de dev) o en **worker** aislado, **no** como contenedores obligatorios en el VPS de 48 GB.

| Rol | Dónde correr | Motivo |
| --- | --- | --- |
| Control plane (Redis BullMQ, orchestrator, API, gateway, MCP, tenants) | **VPS** | Producto y cola canónica |
| Pool de agentes HTTP `localhost:5001–5011` | **Mac operador** / **worker** Tailscale | CPU, tokens, navegadores E2E y revisiones adversariales escalan fuera del disco compartido con n8n |
| **Decepticon**, E2E Playwright pesados, builds largos | **Worker** (`opsly-worker` u homólogo) cuando esté online | Aislamiento y menor riesgo que enrutar `/execute` abierto al VPS |
| **Ollama** modelos grandes | **Mac 2011 / worker** (ADR-024) | Imagen y RAM; el VPS queda `queue-only` salvo excepción documentada |

**Registro de capacidades:** `config/agent-capabilities.json` (roles, riesgo, `write_access`, distribución recomendada). **URLs por defecto:** `config/agent-services.json` / `config/agent-services.yaml` (env `OPSLY_*_AGENT_URL`).

**Operación multi-terminal:** sesión tmux **`opsly-agents`** con ventanas por agente (`cursor` … `decepticon`) + `tmux attach -t <nombre>`; ver `docs/LOCAL-AGENT-EXECUTION.md` y scripts `scripts/cli-agent-service.ts`, `scripts/opsly-agent-cli.ts`.

**Antes de enlazar el orquestador del VPS a agentes remotos por Tailscale:** endurecer `POST /execute` (Bearer token, bind `127.0.0.1` o solo tailnet, allowlist de env, tope de salida, timeout con kill del process group, concurrencia 1, worktrees por agente si aplica). Hasta entonces, jobs locales solo desde host de confianza.

## Referencias

- `docs/ARCHITECTURE-DISTRIBUTED-FINAL.md` — objetivo VPS + worker (Mac 2011)
- `docs/DISTRIBUTED-ARCHITECTURE.md` — operación y checklist
- `docs/DISK-USAGE-REPORT.md`
- `docs/OPS-CLEANUP-PROCEDURES.md`
- `docs/LOCAL-AGENT-EXECUTION.md` — cola `local-agents` y agentes HTTP
- `config/agent-capabilities.json` — routing por rol y riesgo
- `tools/cli/docker_provisioner.py` — heurística `recommend_provision_host` (no provisionar herramientas pesadas en el VPS por defecto)

# Guía de agentes en paralelo — Opsly

> **No es un segundo `AGENTS.md`.** La **fuente de verdad del estado operativo** (bloqueantes, próximo paso, URL raw, Fase 4) está en **`AGENTS.md`** en la raíz del repo — léelo **siempre** al iniciar trabajo. **Este documento** define únicamente **cómo coordinar varios asistentes o procesos** (Cursor, Claude, n8n, orchestrator) sin pisarse ni duplicar contexto.

Convenciones para operar varios asistentes (Cursor, Claude, automatismos) sobre el mismo repo sin divergir del contexto publicado en `AGENTS.md` / `VISION.md`.

**Guardrails legales y operativos (producción, secretos, infra):** lee siempre [`AGENT-GUARDRAILS.md`](AGENT-GUARDRAILS.md) — qué un agente **no** debe modificar sin humano.

### SSH y usuarios remotos

Antes de proponer comandos `ssh`, leer **[`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md)** (`vps-dragon` en el VPS, `opslyquantum` en el worker Ubuntu, `cboteros` solo como ejemplo de usuario en la Mac admin). El humano **no** debe cambiar de usuario local en la Mac para usar Cursor; el agente sí debe usar el usuario **remoto** correcto en cada host.

## Qué es un agente en Opsly

- **Agente humano + herramienta:** persona que sigue `AGENTS.md`, `VISION.md` y ADRs.
- **Agente automatizado:** proceso que lee contexto publicado (URL raw de `AGENTS.md`), ejecuta jobs (`orchestrator`), o reacciona a webhooks (n8n, Discord, `cursor-prompt-monitor`).
- **MCP OpenClaw:** `apps/mcp` expone tools que llaman al API de control y opcionalmente GitHub; sirve como “brazo” uniforme para LLMs.

## Cómo crear un agente nuevo

1. **Documentar** el rol y límites en `AGENTS.md` (sección Completado / Próximo paso) o en un runbook bajo `docs/`.
2. **Autenticación:** tokens solo en Doppler (`ops-intcloudsysops` / `prd`); nunca en git.
3. **Ejecución:** si es batch, preferir cola `openclaw` + worker; si es interactivo, MCP o API con `PLATFORM_ADMIN_TOKEN` según política.
4. **Contexto:** tras cambios de arquitectura, actualizar `VISION.md` o un ADR en `docs/adr/`.

## Límites por plan (startup:2, business:5, enterprise:∞)

Referencia de producto alineada con `VISION.md` y `docs/OPENCLAW-ARCHITECTURE.md`:

| Plan       | Agentes paralelos (orientativo) | Notas                                     |
| ---------- | ------------------------------- | ----------------------------------------- |
| Startup    | 2                               | Colas y workers con menor paralelismo.    |
| Business   | 5                               | Mayor profundidad de cola y concurrencia. |
| Enterprise | Sin tope contractual en código  | Ajustar en política/infra por contrato.   |

La aplicación de estos límites en runtime es responsabilidad del motor de decisiones y de la configuración de BullMQ / rate limits por tenant.

## Ejemplos de agentes

- **Cursor + ACTIVE-PROMPT:** el `CursorWorker` materializa tareas en `docs/ACTIVE-PROMPT.md` en GitHub para que un humano o `cursor-prompt-monitor` ejecute.
- **n8n por tenant:** automatización por cliente; OpenClaw encola remediaciones cuando la plataforma lo requiere.
- **MCP + Claude/otro LLM:** herramientas `get_health`, `onboard_tenant`, etc., sin exponer secretos en el prompt.

Enlaces: `docs/OPENCLAW-ARCHITECTURE.md`, `docs/ORCHESTRATOR.md`, `apps/mcp/README.md` (si existe).

---

## 🔄 Sistema de conocimiento

**LEER PRIMERO para cualquier sesión:**

1. [`docs/KNOWLEDGE-SYSTEM.md`](KNOWLEDGE-SYSTEM.md) — cómo funcionan NotebookLM + Obsidian
2. [`docs/NOTEBOOKLM-SETUP.md`](NOTEBOOKLM-SETUP.md) — configuración paso a paso
3. Query startup obligatorio: `"¿Cuál es el estado actual de Opsly?"`

---

### Estado del sistema (2026-04-14)

| Servicio     | Status | URL/Notas                                  |
| ------------ | ------ | ------------------------------------------ |
| Traefik      | ✅     | Puertos 80/443                             |
| Admin        | ✅     | admin.ops.smiletripcare.com                |
| Portal       | ✅     | portal.ops.smiletripcare.com               |
| MCP          | ✅     | Puerto 3003                                |
| API          | ⚠️     | Error `[id] !== [ref]` — carpeta duplicada |
| Orchestrator | ⏳     | Esperando rebuild CI                       |
| Redis        | ✅     | Sin password                               |

**Fix pendientes:** API `[id] !== [ref]` conflict (eliminar `apps/api/app/api/tenants/[ref]`), orchestrator rebuild con packages/ml.

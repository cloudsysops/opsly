---
status: canonical
owner: founder
last_review: 2026-06-02
type: agent-doc
priority: HIGH
tags:
  - opsly/agents
  - opsly/founder-mode
---

# Guía de agentes en paralelo — Opsly (Founder Mode 2026-06-02+)

> **CRITICAL: Founder Mode Operating Goal takes absolute precedence.**
> 
> Every agent (human, Claude, Cursor, n8n, orchestrator) must align to:  
> **Peskids → Blueprint → Agency Replication**
>
> If an agent's task conflicts with this goal, **escalate to Founder immediately.** Don't work around it.

> **No es un segundo `AGENTS.md`.** La **fuente de verdad del estado operativo** (bloqueantes, próximo paso, URL raw, Peskids go-live) está en **`AGENTS.md`** en la raíz del repo — léelo **siempre** al iniciar trabajo. Luego revisa **`docs/01-development/FOUNDER-MODE-OPERATING-GOAL.md`** para entender si tu tarea está alineada. **Este documento** define únicamente **cómo coordinar varios asistentes o procesos** (Cursor, Claude, n8n, orchestrator) sin pisarse ni duplicar contexto, **siempre dentro de Founder Mode.**

Convenciones para operar varios asistentes (Cursor, Claude, automatismos) sobre el mismo repo sin divergir del contexto publicado en `AGENTS.md` / `VISION.md` / `docs/01-development/FOUNDER-MODE-OPERATING-GOAL.md`.

**Guardrails legales y operativos (producción, secretos, infra):** lee siempre [`AGENT-GUARDRAILS.md`](AGENT-GUARDRAILS.md) — qué un agente **no** debe modificar sin humano.

### SSH y usuarios remotos

Antes de proponer comandos `ssh`, leer **[`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md)** (`vps-dragon` en el VPS, `opslyquantum` en el worker Ubuntu, `cboteros` solo como ejemplo de usuario en la Mac admin). El humano **no** debe cambiar de usuario local en la Mac para usar Cursor; el agente sí debe usar el usuario **remoto** correcto en cada host.

**GitHub Copilot en comentarios de PR:** no puede usar SSH/Tailscale; ver **[`COPILOT-CODING-AGENT.md`](COPILOT-CODING-AGENT.md)**. Cursor local y Actions con secrets sí.

## Qué es un agente en Opsly

- **Agente humano + herramienta:** persona que sigue `AGENTS.md`, `VISION.md` y ADRs.
- **Agente automatizado:** proceso que lee contexto publicado (URL raw de `AGENTS.md`), ejecuta jobs (`orchestrator`), o reacciona a webhooks (n8n, Discord, `cursor-prompt-monitor`).
- **MCP OpenClaw:** `apps/mcp` expone tools que llaman al API de control y opcionalmente GitHub; sirve como “brazo” uniforme para LLMs.

## Founder Mode Agent Rules (2026-06-02+)

### What Agents CAN Do (Aligned to Goal)
- ✅ Peskids go-live work (uptime, revenue, metrics)
- ✅ Blueprint extraction (docs, templates, replication guides)
- ✅ Agency lead capture/conversion (sales funnel, metrics)
- ✅ Measurement/observability that serves one of the three
- ✅ Bug fixes or infra changes that unblock the three goals
- ✅ Documentation that clarifies Founder Mode rules

### What Agents MUST NOT Do (Without Escalation)
- ❌ Create new platform modules
- ❌ Add K8s, Terraform, multi-cloud
- ❌ Build marketplace, autonomous agents, AI memory
- ❌ Refactor unrelated to Founder Mode goals
- ❌ Optimize "nice-to-have" features
- ❌ Propose new product lines

### Decision Gate for Every Agent Task
**Before starting work, every agent (human or automated) must confirm:**
```
Q1: Does this help Peskids go live?     → YES: proceed
                                          NO → Q2
Q2: Does this make Blueprint replicable? → YES: proceed
                                          NO → Q3
Q3: Does this measure lead conversion?   → YES: proceed
                                          NO: ESCALATE (don't execute)
```

If **all three answers are NO**, the task is out of scope. **Escalate to Founder in AGENTS.md bloqueantes section. Do not execute.**

---

## Cómo crear un agente nuevo (Founder Mode)

1. **Documentar el rol** en `AGENTS.md` (sección Completado / Próximo paso) o en un runbook bajo `docs/`, **tagged to Founder Mode goal** (peskids/blueprint/agency).
2. **Decision gate first:** Confirm the agent task passes all three goal questions (above) before granting execution permissions.
3. **Autenticación:** tokens solo en Doppler (`ops-intcloudsysops` / `prd`); nunca en git.
4. **Ejecución:** si es batch, preferir cola `openclaw` + worker; si es interactivo, MCP o API con `PLATFORM_ADMIN_TOKEN` según política.
5. **Contexto:** tras cambios de arquitectura, actualizar `FOUNDER-MODE-OPERATING-GOAL.md` o un ADR en `docs/adr/`, **explaining how it serves Founder Mode goal.**

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
| Admin        | ✅     | admin.op-sly.com                |
| Portal       | ✅     | portal.op-sly.com               |
| MCP          | ✅     | Puerto 3003                                |
| API          | ⚠️     | Error `[id] !== [ref]` — carpeta duplicada |
| Orchestrator | ⏳     | Esperando rebuild CI                       |
| Redis        | ✅     | Sin password                               |

**Fix pendientes:** API `[id] !== [ref]` conflict (eliminar `apps/api/app/api/tenants/[ref]`), orchestrator rebuild con packages/ml.

---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]

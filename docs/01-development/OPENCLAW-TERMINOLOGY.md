---
status: draft
owner: operations
last_review: 2026-09-12
type: guide
tags:
  - opsly/development
---

# Terminología — OpenClaw CLI vs Orquestador Opsly

Evita usar **«OpenClaw»** solo para referirte al servicio Docker de colas: en conversación interna genera colisión con el **CLI** que instalás con npm.

## Nombres canónicos

| Nombre corto | Qué es | Dónde / cómo |
| -------------- | ------ | -------------- |
| **OpenClaw CLI** | Binario **`openclaw`**. Incluye Gateway/TUI y el modo headless `agent exec`. | Runtime externo; Opsly usa `agent exec` para tareas efímeras, no un Gateway persistente como boundary de AgentTask. |
| **Orquestador Opsly** (o **BullMQ Orchestrator**) | Servicio **`apps/orchestrator`**: colas BullMQ, workers, `processIntent`, health típico **3011**. Incluye **módulos TypeScript** bajo `src/openclaw/` (router/control layer) — es código de **rutado Opsly**, no el binario npm. | Docker `opsly_orchestrator` + Redis. |
| **Capa OpenClaw (código)** | Reglas `applyOpenClawControlLayer`, `registry`, `runOpenClawController` dentro del **Orquestador Opsly**. | Repo: `apps/orchestrator/src/openclaw/`. |
| **MCP Opsly** | Servidor de herramientas para agentes externos. | Docker `opsly_mcp`, puerto **3003**. |
| **Cola Redis `openclaw`** | Nombre de **cola BullMQ** (historial); no implica que el CLI esté corriendo. | Redis compartido. |

## Límite de responsabilidades (importante)

**El Orquestador Opsly (`apps/orchestrator`) no administra un pool persistente de procesos OpenClaw.** Para AgentTask, Opsly puede invocar el CLI externo mediante el bridge `local_openclaw` y una sesión efímera que ejecuta `openclaw agent exec`. Gateway/TUI siguen siendo superficies separadas de operador/canales.

- **Varios agentes / varias instancias OpenClaw CLI** (gateway, TUI, varios canales, etc.) → eso lo resolvés con **el propio CLI**, systemd, tmux o el patrón que documentamos para VPS (`docs/04-infrastructure/OPENCLAW-CLI-VPS-META-ORCHESTRATOR.md`). Ahí los binarios ya están en el host; Opsly no sustituye esa capa.
- **Orquestador Opsly** → colas BullMQ, `AgentTaskEnvelopeV1`, workers `local_*`, política y selección de runtime. Puede invocar `local_openclaw` por el bridge canónico cuando esté explícitamente habilitado; no mantiene agentes OpenClaw AI persistentes.

Si alguien dice «orquestador» sin calificar, en Opsly lo por defecto es **Orquestador Opsly (BullMQ)** salvo que el contexto sea explícitamente **CLI / tmux / varios openclaw en el VPS**.


## Runtime canónico OpenClaw en Opsly

```text
AgentTaskEnvelopeV1
→ BullMQ local-agents
→ local_openclaw
→ bridge autenticado :5012
→ Session Manager
→ opsly-task-* temporal
→ openclaw agent exec
→ resultado
→ teardown
```

Estado actual: registrado pero **disabled/held** hasta aceptación física. El Mac no consume `local_openclaw` por defecto.

No confundir este flujo con:

- `openclaw gateway` persistente para canales/UI;
- la cola histórica BullMQ `openclaw`;
- módulos TypeScript `apps/orchestrator/src/openclaw/`.

## Regla de lenguaje

- Decís **«ejecutá OpenClaw como AgentTask»** → `local_openclaw` + `openclaw agent exec` efímero.  
- Decís **«levantá el OpenClaw Gateway»** → superficie persistente del CLI para canales/operación; no es el runtime AgentTask.  
- Decís **«el orquestador no encola»** o **«revisá BullMQ»** → **Orquestador Opsly** (`apps/orchestrator`).  
- Decís **«el router OpenClaw eligió local_claude»** → **capa TS** dentro del orquestador.

## Comandos útiles

```bash
# OpenClaw CLI (wrapper Node 22 del repo si hace falta)
npm run opsly:openclaw-cli -- --version

# Orquestador Opsly (desarrollo local)
npm run dev --workspace=@intcloudsysops/orchestrator
```

## Referencias

- `docs/01-development/AGENT-SERVICE-NAMING.md` — ids Opsly `local_*` vs `external_cli` (binario vendor).  
- `docs/01-development/.openclaw.md` — Node 22 y stack.  
- `docs/00-architecture/OPENCLAW-ARCHITECTURE.md` — arquitectura de colas y decisión.  
- `docs/04-infrastructure/OPENCLAW-CLI-VPS-META-ORCHESTRATOR.md` — CLI en VPS + tmux.  
- `apps/orchestrator/README.md` — rol del paquete **Orquestador Opsly**.

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]

---
status: canon
owner: operations
last_review: 2026-05-03
---

# Agent Brain Contract

Este contrato aplica a todos los agentes que trabajan sobre Opsly: Codex, Claude,
Cursor, Copilot, OpenCode, Hermes, workers locales, agentes externos via MCP y
automatismos del orchestrator.

Tambien aplica a cualquier agente nuevo que llegue en el futuro, aunque todavia
no tenga carpeta propia en el repo. Si el agente puede leer archivos, su primer
archivo operativo despues de `AGENTS.md` debe ser este contrato.

## Objetivo

Mantener un cerebro compartido entre humanos y agentes:

- **GitHub/repo**: fuente de verdad del codigo, workflows, docs y ADRs.
- **Obsidian**: memoria navegable para humanos y agentes, con notas por modulo.
- **Graphyfi**: grafo visual/semantico de modulos, dependencias, endpoints,
  tenants, agentes y workflows.
- **Context Builder/OpenClaw/MCP**: capa de acceso para que los agentes consulten
  el cerebro antes de ejecutar.

## Orden obligatorio de contexto

Antes de modificar codigo, infra, tests, workflows o docs operativas:

1. Leer `AGENTS.md`.
2. Leer `VISION.md` o el stub que apunte a `docs/01-development/VISION.md`.
3. Leer este contrato: `docs/03-agents/AGENT-BRAIN-CONTRACT.md`.
4. Consultar `config/knowledge-index.json` si existe.
5. Consultar `config/github-module-graph.json` si existe.
6. Si la tarea toca un modulo concreto, revisar su nota Obsidian en
   `docs/brain/modules/` cuando exista.
7. Aplicar guardrails: `docs/03-agents/AGENT-GUARDRAILS.md`.
8. Aplicar Git workflow: `docs/01-development/GIT-WORKFLOW.md`.

Si falta `config/github-module-graph.json`, el agente debe operar con el repo
actual y dejar registrado que el grafo de modulos todavia no esta generado.

## Onboarding de agentes nuevos

Todo agente nuevo debe recibir este paquete minimo antes de ejecutar tareas:

1. `AGENTS.md` — estado operativo y reglas de sesion.
2. `VISION.md` — norte de producto.
3. `docs/03-agents/AGENT-BRAIN-CONTRACT.md` — contrato del cerebro compartido.
4. `docs/03-agents/AGENT-GUARDRAILS.md` — limites de seguridad/produccion.
5. `docs/01-development/GIT-WORKFLOW.md` — ramas, PRs y cierre de trabajo.
6. `config/knowledge-index.json` — indice documental si existe.
7. `config/github-module-graph.json` — grafo de modulos si existe.

Prompt minimo recomendado:

```text
Lee AGENTS.md, VISION.md y docs/03-agents/AGENT-BRAIN-CONTRACT.md.
Trabaja como agente Opsly usando OpenClaw, Obsidian Brain y Graphyfi.
No crees memoria paralela. Consulta config/knowledge-index.json y
config/github-module-graph.json cuando existan. Respeta guardrails y Git workflow.
```

Si el agente no puede leer el filesystem, entregarle los contenidos o URLs raw de
esos archivos. Si solo puede recibir un unico archivo, entregarle `AGENTS.md` con
un enlace explicito a este contrato.

## Rutas canonicas

| Capa | Ruta |
| --- | --- |
| Estado operativo | `AGENTS.md` |
| Vision de producto | `VISION.md`, `docs/01-development/VISION.md` |
| Memoria Obsidian | `docs/brain/` |
| Indice documental | `config/knowledge-index.json` |
| Grafo de modulos GitHub | `config/github-module-graph.json` |
| Grafo renderizado | `docs/generated/github-module-graph.md` |
| Tool Graphyfi MCP | `apps/mcp/src/tools/graphyfi.ts` |
| Guardrails | `docs/03-agents/AGENT-GUARDRAILS.md` |
| Workflow Git | `docs/01-development/GIT-WORKFLOW.md` |

## Taxonomia de nodos Graphyfi

El grafo debe usar IDs estables y legibles:

- `app:<name>` para `apps/*`.
- `pkg:<name>` para `packages/*`.
- `svc:<name>` para servicios Docker/Compose.
- `api:<method>:<path>` para endpoints.
- `agent:<name>` para agentes logicos o workers.
- `tenant:<slug>` para nodos tenant cuando el grafo sea por cliente.
- `doc:<slug>` para documentos canonicos.
- `workflow:<name>` para workflows n8n/Hermes/OpenClaw.

## Tipos de edges

- `depends_on`: dependencia tecnica.
- `calls`: llamada HTTP, MCP, BullMQ o SDK.
- `owns`: ownership operativo.
- `documents`: doc que explica modulo/capacidad.
- `deploys`: compose/script que despliega un servicio.
- `observes`: dashboard, healthcheck o metrica que observa un modulo.
- `routes_to`: decision de agente/orquestador.

## Reglas para agentes

- No crear un segundo cerebro en una ruta paralela. Reutilizar `docs/brain/`,
  `config/knowledge-index.json` y `config/github-module-graph.json`.
- No duplicar AGENTS. Cada runtime puede tener su archivo de arranque, pero debe
  apuntar a este contrato.
- Cualquier runtime nuevo debe registrarse en `.agents/README.md` o en
  `docs/03-agents/` antes de recibir tareas recurrentes.
- Los agentes externos no reciben secretos; se les entrega contexto minimo,
  rutas permitidas y job con `tenant_slug` + `request_id`.
- Todo trabajo autonomo debe producir handoff: que cambio, archivos tocados,
  validacion, riesgos y siguiente paso.
- Si un agente detecta deriva entre `.claude`, `.cursor`, `.codex`, `.opencode`
  o Copilot, debe corregir apuntando a este contrato en vez de copiar reglas
  completas en cada archivo.

## Estado actual

- `config/knowledge-index.json` existe y cubre principalmente documentos.
- `apps/mcp/src/tools/graphyfi.ts` existe, pero todavia no consume un grafo real
  de modulos GitHub.
- `docs/brain/` queda reservado como vault Obsidian canonico para notas de
  modulos, arquitectura, tenants, agentes y runbooks.
- El siguiente incremento recomendado es generar `config/github-module-graph.json`
  desde `apps/*`, `packages/*`, Docker Compose, OpenAPI y rutas API.

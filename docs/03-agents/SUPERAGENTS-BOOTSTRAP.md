---
status: draft
owner: operations
last_review: 2026-05-24
type: agent-doc
tags:
  - opsly/agents
---

# Superagentes Opsly — Bootstrap completo

Objetivo: dejar agentes AI con "superpoderes" listos desde cero:

- plugins/extensiones del IDE instaladas
- librerías/workspaces compilados
- conocimiento secuencial indexado
- perfil runtime preconfigurado
- bridges y workers de control disponibles; agentes ejecutados solo por tarea

## 1) Instalación base (idempotente)

```bash
./scripts/install-superagents-stack.sh
```

Opcionales:

```bash
./scripts/install-superagents-stack.sh --with-notebooklm
./scripts/install-superagents-stack.sh --with-ollama-pull
./scripts/install-superagents-stack.sh --dry-run
```

Salida principal:

- `.env.superagents.example` (perfil runtime sugerido)
- `.opsly/superagents/bootstrap-chain.txt` (cadena de skills bootstrap)
- validación de skills + type-check + build de workspaces críticos
- `index-knowledge` para RAG repo-first

## 2) Verificar runtime efímero

```bash
./scripts/superagents-up.sh
./scripts/superagents-doctor.sh
```

`superagents-up.sh` no inicia squads persistentes. Los bridges pueden quedar disponibles, pero cada runtime real se crea mediante una sesión tmux acotada a un AgentTask.

## 3) Diagnóstico rápido

```bash
./scripts/superagents-doctor.sh
```

## 4) MCP para clientes de agentes avanzados

Modo stdio (MCP SDK):

```bash
MCP_TRANSPORT=stdio npm run start --workspace=@intcloudsysops/mcp
```

Herramientas recomendadas ya disponibles:

- tenant ops: `get_tenants`, `onboard_tenant`, `suspend_tenant`, `resume_tenant`
- platform insight: `list_ai_integrations`, `probe_platform_component`, `get_docker_containers`
- conocimiento secuencial: `list_context_resources`, `read_context_resource`, `list_adrs`, `read_adr`
- ejecución dirigida: `execute_prompt`, `notebooklm`

## 5) Criterio "superagente listo"

Checklist:

- `install-superagents-stack.sh` sin errores
- `superagents-doctor.sh` con comandos base en verde
- `status-agents-autopilot.sh` reporta `status=deprecated` y cero procesos legacy
- MCP stdio levanta y lista tools/resources/prompts

---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]

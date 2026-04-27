# Superagentes Opsly — Bootstrap completo

Objetivo: dejar agentes AI con "superpoderes" listos desde cero:

- plugins/extensiones del IDE instaladas
- librerías/workspaces compilados
- conocimiento secuencial indexado
- perfil runtime preconfigurado
- autopilot de agentes encendido

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

## 2) Encender superagentes (autopilot)

```bash
TENANT_SLUG=smiletripcare \
GOAL="Acelerar ejecución multi-agente con costo bajo" \
./scripts/superagents-up.sh
```

Dry-run:

```bash
./scripts/superagents-up.sh --dry-run
```

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
- autopilot en running (`status-agents-autopilot.sh`)
- MCP stdio levanta y lista tools/resources/prompts

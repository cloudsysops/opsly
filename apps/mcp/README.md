# OpenClaw MCP Server

Servidor MCP para exponer herramientas de control sobre Opsly.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start` — modo **HTTP** (default): OAuth + `GET /health` en `PORT` (3003).
- `npm run start:stdio` — protocolo MCP sobre **stdio** (JSON-RPC) para Cursor / Claude Desktop.
- `npm run test`
- `npm run type-check`

## Transporte

| Modo | Cuándo | Comportamiento |
|------|--------|----------------|
| **http** (default) | Docker / VPS | `PORT` (3003): `GET /health`, OAuth (`/.well-known/...`, `/oauth/*`). Una línea JSON de arranque en stdout (no usar como cliente MCP). |
| **stdio** | `MCP_TRANSPORT=stdio` o `node ... --stdio` | `@modelcontextprotocol/sdk`: JSON-RPC por stdin/stdout; tools + resources + prompts. El health HTTP sigue activo para liveness. |

Tras `npm run build`, ejemplo **Cursor** (`.cursor/mcp.json` o ajustes MCP), sustituye la ruta al `dist` de tu clon:

```json
{
  "mcpServers": {
    "opsly-openclaw": {
      "command": "node",
      "args": ["/ruta/al/repo/apps/mcp/dist/src/index.js", "--stdio"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "OPSLY_API_URL": "https://api.tu-dominio.com",
        "PLATFORM_ADMIN_TOKEN": "tu-token-admin"
      }
    }
  }
}
```

En contenedor **no** uses stdio; deja el default HTTP y enruta Traefik al servicio `mcp`.

## Variables de entorno

- `MCP_TRANSPORT` — `stdio` \| vacío/`http` (default HTTP + OAuth).
- `OPSLY_API_URL`
- `PLATFORM_ADMIN_TOKEN`
- `GITHUB_TOKEN` (recomendado) o `GITHUB_TOKEN_N8N` (legado) — ver `docs/GITHUB-TOKEN.md`
- **Integraciones / red Docker (opcional):** `MCP_LLM_GATEWAY_URL`, `MCP_ORCHESTRATOR_URL`, `MCP_CONTEXT_BUILDER_URL` — bases HTTP para `probe_platform_component` y snapshots en `list_ai_integrations` (misma red Compose que en `infra/docker-compose.platform.yml`).
- **Catálogo extra (solo metadatos):** `MCP_EXTRA_INTEGRATIONS_JSON` — JSON `[{ "id", "label", "description", "notes?" }]` para documentar herramientas de IA adicionales sin ejecutar código arbitrario.

## Herramientas nuevas (v1.1)

| Tool | Uso |
|------|-----|
| `list_ai_integrations` | Catálogo: Cursor (GitHub prompt), Docker/API, LLM Gateway, NotebookLM; opcional `include_health_snapshots` |
| `probe_platform_component` | GET `/health` allowlist: `llm_gateway`, `orchestrator`, `context_builder`, `mcp` |
| `get_docker_containers` | `GET /api/admin/docker/containers` (token admin) |
| `list_context_resources` | Lista recursos estáticos de contexto (AGENTS, VISION, system_state, MCP status) |
| `read_context_resource` | Lee texto de un recurso por URI (ej. `opsly://context/agents`) |
| `list_adrs` | Lista ADRs disponibles en `docs/adr` |
| `read_adr` | Lee un ADR por slug/archivo (ej. `ADR-024-ollama-local-worker-primary`) |

La inferencia multi-modelo sigue centralizada en **llm-gateway** (no se exponen API keys de Anthropic/OpenAI/Copilot en MCP).

## Resources y prompts MCP

### Resources

- `opsly://context/agents`
- `opsly://context/vision`
- `opsly://context/system-state`
- `opsly://context/drive-config`
- `opsly://context/mcp-status`
- `opsly://adr/{slug}`

### Prompts

- `opsly_startup`
- `opsly_handoff`

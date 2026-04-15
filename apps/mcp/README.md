# OpenClaw MCP Server

Servidor MCP para exponer herramientas de control sobre Opsly.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run type-check`

## Variables de entorno

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

La inferencia multi-modelo sigue centralizada en **llm-gateway** (no se exponen API keys de Anthropic/OpenAI/Copilot en MCP).

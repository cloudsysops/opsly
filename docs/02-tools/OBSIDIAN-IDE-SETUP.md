---
status: active
owner: operations
last_review: 2026-05-10
---

# Obsidian + IDE Setup

Objetivo: que Codex, Cursor, Claude, OpenCode y nuevos agentes trabajen sobre el mismo cerebro Opsly sin inventar memoria paralela.

## Fuente de verdad

- Vault Obsidian: `docs/`
- Cockpit diario: `docs/brain/dashboard.md`
- Indice de modulos: `docs/brain/modules/README.md`
- Indice RAG repo-first: `config/knowledge-index.json`
- Inventario markdown: `docs/.obsidian/file-index.json`

## Sync rapido

```bash
npm run obsidian:sync
```

Ese comando actualiza el inventario de notas, regenera `config/knowledge-index.json` y valida la estructura de documentacion.

## MCP local para el IDE

Primero compila el servidor MCP:

```bash
npm run build --workspace=@intcloudsysops/mcp
```

Luego configura un server MCP llamado `opsly-openclaw` en el IDE:

```json
{
  "mcpServers": {
    "opsly-openclaw": {
      "command": "node",
      "args": [
        "/Users/dragon/cboteros/proyectos/intcloudsysops/apps/mcp/dist/src/index.js",
        "--stdio"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "WORKSPACE_ROOT": "/Users/dragon/cboteros/proyectos/intcloudsysops",
        "OPSLY_OBSIDIAN_VAULT": "/Users/dragon/cboteros/proyectos/intcloudsysops/docs",
        "OPSLY_API_URL": "https://api.op-sly.com",
        "MCP_LLM_GATEWAY_URL": "http://127.0.0.1:3010",
        "MCP_ORCHESTRATOR_URL": "http://127.0.0.1:3011",
        "MCP_CONTEXT_BUILDER_URL": "http://127.0.0.1:3012",
        "PLATFORM_ADMIN_TOKEN": "${PLATFORM_ADMIN_TOKEN}"
      }
    }
  }
}
```

No guardes el valor real de `PLATFORM_ADMIN_TOKEN` en el repo. Exportalo en tu shell, Doppler o el gestor seguro del IDE.

## Resources MCP clave

- `opsly://context/agents`
- `opsly://context/vision`
- `opsly://context/system-state`
- `opsly://context/brain-dashboard`
- `opsly://context/brain`
- `opsly://context/brain-modules`
- `opsly://context/brain-agents`
- `opsly://context/brain-workflows`
- `opsly://context/brain-architecture`
- `opsly://context/knowledge-index`

## Prompt de arranque

Cuando el IDE soporte prompts MCP, usa `opsly_startup`. Debe leer AGENTS, VISION, system state, dashboard Obsidian, modulos, knowledge index y ADRs relevantes antes de proponer trabajo.

## Flujo de cada agente

1. Leer `AGENTS.md`.
2. Ejecutar o pedir `opsly_startup`.
3. Abrir `docs/brain/dashboard.md`.
4. Ir a la nota de modulo antes de editar codigo.
5. Al cerrar, documentar cambios relevantes y correr `npm run obsidian:sync`.

---

## Enlaces relacionados

- [[02-tools/README|02-tools]]
- [[brain/README|Brain Central]]

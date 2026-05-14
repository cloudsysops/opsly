---
status: active
owner: ai-platform
last_review: 2026-05-10
type: architecture-map
tags:
  - opsly/architecture
  - opsly/knowledge
  - opsly/graphyfi
---

# Knowledge Graph

La triada de conocimiento de Opsly:

```mermaid
flowchart LR
  Docs["docs/ Obsidian vault"] --> FileIndex["docs/.obsidian/file-index.json"]
  Docs --> KnowledgeIndex["config/knowledge-index.json"]
  Repo["apps + packages + infra"] --> ModuleGraph["config/github-module-graph.json"]
  KnowledgeIndex --> ContextBuilder["apps/context-builder"]
  ModuleGraph --> Graphyfi["apps/mcp/src/tools/graphyfi.ts"]
  ContextBuilder --> Agents["Codex / Claude / Cursor / OpenCode"]
  Graphyfi --> Agents
```

## Estado

- Obsidian MOCs: activo.
- `knowledge-index.json`: activo, regenerable.
- `github-module-graph.json`: pendiente de generacion completa.
- Graphyfi MCP: existe como tool, pendiente de consumir grafo real.

## Siguiente incremento

Generar `config/github-module-graph.json` desde:

- `apps/*`
- `packages/*`
- `lib/*`
- `infra/docker-compose*.yml`
- OpenAPI
- notas en [[brain/modules/README|Modules MOC]]


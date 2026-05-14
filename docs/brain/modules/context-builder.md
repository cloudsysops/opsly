---
status: active
owner: ai-platform
last_review: 2026-05-10
type: module
layer: knowledge
repo_path: apps/context-builder
runtime: Node.js service
tags:
  - opsly/module
  - opsly/knowledge
related_docs:
  - docs/02-tools/KNOWLEDGE-SYSTEM.md
  - docs/01-development/KNOWLEDGE-BRAIN-SYSTEM.md
---

# Context Builder

Servicio que arma contexto repo-first desde `config/knowledge-index.json` para
agentes y planning.

## Fuentes

- `docs/**/*.md`
- `config/knowledge-index.json`
- futuro: `config/github-module-graph.json`
- futuro: notas en [[brain/modules/README|Modules MOC]]

## Regla

Tras cambios grandes en docs, correr `npm run index-knowledge` para evitar que
los agentes trabajen con contexto viejo.


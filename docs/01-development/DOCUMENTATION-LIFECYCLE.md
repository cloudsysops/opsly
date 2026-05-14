---
status: canon
owner: architecture
last_review: 2026-05-10
---

# Ciclo de vida documental (wiki Opsly)

Objetivo: que **`docs/`** se comporte como **wiki** consumible en **Obsidian** (grafo local), **NotebookLM** (resúmenes y Q&A sobre fuentes) y **Graphyfi** (nodos `doc:*` y aristas `documents` hacia código), sin dejar **desarrollos a medias**: lo que entra en `main` debe venir con plan razonable, pruebas donde existan, y documentación o punteros explícitos.

## Orden recomendado (agente u humano)

1. **Plan** — Objetivo, alcance, riesgos; enlace a issue/PR o línea en `AGENTS.md` si afecta operación.
2. **Implementar** — Código/infra mínimo coherente con guardrails.
3. **Probar** — `npm run type-check`; tests del workspace tocado; smoke acordado.
4. **Documentar** — Actualizar la **carpeta dueña** (ver [`STRUCTURE-GUARDRAILS.md`](../STRUCTURE-GUARDRAILS.md)): runbook, ADR, `00-architecture/`, `tenants/`, etc.
5. **Índices** — Tras cambios en `.md` bajo `docs/`: `npm run index-knowledge` (NotebookLM / RAG repo-first) y `npm run obsidian:file-index` (vault).
6. **Estado de sesión** — Si la tarea cambia el operativo: secciones 🔄 de [`AGENTS.md`](../../AGENTS.md) (política del repo).
7. **Cierre** — PR mergeado o commit único; sin TODOs críticos sin ticket o nota en `docs/reports/` / `docs/plans/`.

## Definition of Done (documentación)

| Criterio | Cuándo |
| --- | --- |
| Ubicación correcta | Nada de documentos largos sueltos en raíz de `docs/` salvo los tres hubs; stubs en `docs/stubs/`. |
| Sin duplicar estado | Si ya está en `AGENTS.md`, enlazar; no copiar tablas de sesión en diez sitios. |
| Decisión nueva | ADR en `docs/adr/` o ampliación de uno existente. |
| Procedimiento nuevo o cambio operativo | Runbook en `docs/runbooks/` o `docs/tenants/runbooks/` según aplique. |
| Contrato API / portal | OpenAPI si aplica al subset CI; cliente alineado. |
| Grafo | Si el cambio define módulo/servicio nuevo: cuando exista pipeline, reflejar en `config/github-module-graph.json` y/o nota en `docs/brain/modules/`. |
| NotebookLM / búsqueda | `npm run index-knowledge` antes de dar por cerrada una entrega grande de docs. |

## Triada wiki (Obsidian + JSON + Graphyfi)

| Capa | Rol | Comando / ruta |
| --- | --- | --- |
| **Obsidian** | Navegación humana, wikilinks, MOC [`index.md`](../index.md) | `npm run obsidian:file-index` |
| **`knowledge-index.json`** | Lista titulares/keywords para Context Builder y agentes | `npm run index-knowledge` |
| **Graphyfi** | Nodos `doc:<slug>` enlazados a `app:*`, `api:*`, etc. | `apps/mcp/src/tools/graphyfi.ts` |

No crear un cuarto índice paralelo en prompts privados: **una fuente** por tipo.

## Brechas habituales (revisar en grooming)

- **`config/github-module-graph.json`** ausente o desactualizado → el grafo semántico no refleja el monorepo.
- **`docs/brain/modules/`** vacío para apps tocadas a menudo → añadir notas mínimas con `owner`, entrypoints y enlaces ADR.
- **Runbooks** que solo viven en chat → mover a `docs/runbooks/` con stub si hubo ruta vieja.
- **NotebookLM** sin sync tras muchos commits de docs → ejecutar `index-knowledge` en VPS/Mac según [`KNOWLEDGE-SYSTEM.md`](../02-tools/KNOWLEDGE-SYSTEM.md).

## Relacionado

- [`STRUCTURE-GUARDRAILS.md`](../STRUCTURE-GUARDRAILS.md)
- [`03-agents/AGENT-BRAIN-CONTRACT.md`](../03-agents/AGENT-BRAIN-CONTRACT.md)
- [`02-tools/KNOWLEDGE-SYSTEM.md`](../02-tools/KNOWLEDGE-SYSTEM.md)
- [`01-development/GIT-WORKFLOW.md`](GIT-WORKFLOW.md)

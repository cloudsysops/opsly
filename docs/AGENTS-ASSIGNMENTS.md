# Opsly — Agent assignments

> **Generado automáticamente** — fuente: [`docs/implementation/status.yaml`](implementation/status.yaml).
> Generado: 2026-05-03T02:14:18.039Z

Ver responsabilidades y flujos en [`docs/AGENTS-ORCHESTRATION.md`](AGENTS-ORCHESTRATION.md).

## Cursor

- **Rol:** Code generation + execution
- **Capabilities:**
  - Write TypeScript/Python
  - Create migrations
  - Generate workflows
  - Run tests
- **Tasks asignadas:**
  - `approval-gate-worker`
  - `vertex-client`
  - `notion-sync-scripts`
- **Success rate (referencia):** 98%
- **Última tarea:** Vertex AI embeddings integration
- **Próxima tarea:** Learning Agent Phase 2

## Claude

- **Rol:** Architecture + decision making
- **Capabilities:**
  - Design systems
  - Write ADRs
  - Generate prompts for Cursor
  - Code review
- **Tasks asignadas:**
  - `ADR-021: Approval Gate Phase 1`
  - `ADR-022: Notion + GitHub Sync`
  - `Sprint planning + coordination`
- **Success rate (referencia):** 100%
- **Última tarea:** Integration planning
- **Próxima tarea:** Phase 2 architecture

## GitHub Actions

- **Rol:** CI/CD + automation
- **Capabilities:**
  - Build + test
  - Deploy to VPS
  - Sync Notion ↔ GitHub
  - Notify Discord
- **Success rate (referencia):** 95%
- **Workflows (GitHub Actions):**
  - `deploy.yml`
  - `sync-docs.yml`
  - `sync-all.yml`
- **Última acción:** Auto-sync docs
- **Próxima acción:** Sprint burndown tracking

> ℹ️ Sin tareas listadas — revisar Notion / asignación.

---

*No editar a mano — regenerar con `npm run docs:sync`.*

# Codex in Opsly

Codex works as an OpenClaw-aware orchestrator for Opsly.

## Startup Context

1. Read `AGENTS.md`.
2. Read `VISION.md`.
3. Read `docs/03-agents/AGENT-BRAIN-CONTRACT.md`.
4. Prefer repo knowledge in this order:
   - `config/github-module-graph.json`
   - `config/knowledge-index.json`
   - `docs/brain/`
   - code under `apps/*`, `packages/*`, `scripts/*`, `infra/*`
5. Apply `docs/03-agents/AGENT-GUARDRAILS.md`.
6. Apply `docs/01-development/GIT-WORKFLOW.md`.

## Brain Rule

Do not create a separate memory system for Codex. Use the shared Opsly Brain:

- Obsidian vault: `docs/brain/`
- Knowledge index: `config/knowledge-index.json`
- Module graph: `config/github-module-graph.json`
- Graphyfi MCP tool: `apps/mcp/src/tools/graphyfi.ts`

If the module graph is missing, inspect the repo directly and document the gap.

## Execution Rule

Use PR-first workflow for code, infra, tests and API contracts. Direct `main`
pushes are only for explicitly allowed documentation closures.

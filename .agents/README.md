# Opsly Local Agents

This directory is a lightweight registry for local and external agent adapters.
It is not the runtime home for application agents and must not replace
`apps/orchestrator`, `apps/agents`, `tools/agents` or `docs/03-agents`.

## Shared Brain

All local agents must read:

1. `AGENTS.md`
2. `VISION.md`
3. `docs/03-agents/AGENT-BRAIN-CONTRACT.md`

Shared memory lives in:

- `docs/brain/`
- `config/knowledge-index.json`
- `config/github-module-graph.json`

## New Agent Onboarding

Any new agent family must start with the same bootstrap packet:

1. `AGENTS.md`
2. `VISION.md`
3. `docs/03-agents/AGENT-BRAIN-CONTRACT.md`
4. `docs/03-agents/OPSLY-RUNTIME-WORKER-CONTRACT.md` (VPS / tmux / MCP / sandbox workers)
5. `docs/03-agents/AGENT-GUARDRAILS.md`
6. `docs/01-development/GIT-WORKFLOW.md`
7. `config/knowledge-index.json`
8. `config/github-module-graph.json` when present

Minimum prompt:

```text
Read AGENTS.md, VISION.md, docs/03-agents/AGENT-BRAIN-CONTRACT.md and docs/03-agents/OPSLY-RUNTIME-WORKER-CONTRACT.md.
Operate as a controlled Opsly runtime worker (OpenClaw, MCP, orchestrator, LLM Gateway).
Do not create a parallel memory. Respect guardrails and Git workflow.
```

If a new agent becomes recurrent, add it to the list below and document its
entrypoint, permissions and allowed paths.

## Agent Families

- Codex: `.codex/CODEX.md`
- Claude: `.claude/CLAUDE.md`
- Cursor: `.cursor/rules/opsly.mdc`
- Copilot: `.github/copilot-instructions.md`
- OpenCode: `.opencode.json`
- Hermes: `.hermes/HERMES.md`
- Local workers: `apps/orchestrator/src/workers/Local*Worker.ts`

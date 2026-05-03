# Hermes Agent Context

Hermes coordinates autonomous task state inside `apps/orchestrator` and must use
the shared Opsly Brain before routing work.

## Required Context

1. `AGENTS.md`
2. `VISION.md`
3. `docs/03-agents/AGENT-BRAIN-CONTRACT.md`
4. `config/knowledge-index.json`
5. `config/github-module-graph.json` when present

## Routing Rule

When Hermes enriches or routes a task, attach the most relevant module, doc and
agent nodes from the shared graph. Every routed task should preserve:

- `tenant_slug`
- `request_id`
- `agent_role`
- source module or workflow when known

## Boundaries

Hermes is not a second orchestrator. It reuses OpenClaw, BullMQ, Redis, Supabase,
Context Builder and the shared Brain contract.
